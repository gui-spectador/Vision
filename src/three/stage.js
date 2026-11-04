import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

/*
 * Estúdio virtual de fotografia de produto:
 *  - ambiente HDR procedural com softboxes em faixa (reflexos longos e limpos no vidro)
 *  - fundo infinito com brilho atrás da garrafa (faz o líquido "acender" por transmissão)
 *  - luz principal com sombra suave, cáustica colorida pelo líquido e oclusão de contato
 *  - partículas em bokeh, controles 360°, vista explodida, foco em pontos de interesse
 */

const ease = {
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outBack: (t) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

export const LIGHTING = {
  studio: { label: 'Estúdio', env: { strip: 6, top: 3.2, rim: 3.5, fill: 0.22, warm: 0 }, key: 55, rect: 5, glow: 1.0, glowSize: 5.5, core: 1.7, exposure: 1.0, caustic: 0.4, bokeh: 0.5, warm: 0 },
  backlight: { label: 'Contraluz', env: { strip: 3.5, top: 1.6, rim: 7, fill: 0.12, warm: 0 }, key: 22, rect: 2.5, glow: 1.6, glowSize: 9, core: 3.4, exposure: 1.0, caustic: 0.75, bokeh: 0.7, warm: 0 },
  bar: { label: 'Bar', env: { strip: 4, top: 1.2, rim: 3, fill: 0.15, warm: 1 }, key: 34, rect: 3.2, glow: 0.85, glowSize: 4, core: 1.9, exposure: 0.95, caustic: 0.55, bokeh: 1.0, warm: 1 },
};

function radialTexture(stops, size = 256, square = 0) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  if (square) {
    ctx.filter = `blur(${size * 0.08}px)`;
    const s = size * square;
    ctx.fillRect((size - s) / 2, (size - s) / 2, s, s);
  } else {
    ctx.fillRect(0, 0, size, size);
  }
  const t = new THREE.CanvasTexture(cv);
  return t;
}

export class Stage {
  constructor(container, { onFrame } = {}) {
    this.container = container;
    this.onFrame = onFrame;
    this.tweens = [];
    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.spin = true;
    this.spinSpeed = 0.32;
    this.exploded = 0;
    this.explodeTarget = 0;
    this.insets = { left: 0, right: 0, bottom: 0, top: 0 };
    this.insetsAnim = { left: 0, right: 0, bottom: 0, top: 0 };
    this.preset = 'studio';
    this.mobile = matchMedia('(max-width: 900px)').matches || navigator.maxTouchPoints > 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.mobile ? 2 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
    renderer.domElement.classList.add('scene-canvas');
    this.renderer = renderer;

    RectAreaLightUniformsLib.init();

    this.scene = new THREE.Scene();
    this.pmrem = new THREE.PMREMGenerator(renderer);

    this.camera = new THREE.PerspectiveCamera(28, 1, 0.05, 200);
    this.camera.position.set(0, 2.5, 7.6);

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    Object.assign(this.controls, {
      enableDamping: true,
      dampingFactor: 0.07,
      enablePan: false,
      minDistance: 2.0,
      maxDistance: 11,
      minPolarAngle: 0.2,
      maxPolarAngle: 1.64,
      rotateSpeed: 0.75,
      zoomSpeed: 0.8,
    });
    this.controls.target.set(0, 1.36, 0);
    this.controls.addEventListener('start', () => {
      this.userActive = true;
      this.cancelFocus();
    });
    this.controls.addEventListener('end', () => {
      this.userActive = false;
      this.lastInteraction = performance.now();
    });

    this.productRoot = new THREE.Group();
    this.scene.add(this.productRoot);

    this.#buildBackdrop();
    this.#buildLights();
    this.#buildBokeh();
    this.setLighting('studio', true);

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();

    this.loop = this.loop.bind(this);
    renderer.setAnimationLoop(this.loop);
  }

  /* ---------------- construção da cena ---------------- */

  #buildBackdrop() {
    this.themeUniforms = {
      uBase: { value: new THREE.Color('#111') },
      uGlow: { value: new THREE.Color('#444') },
      uFloor: { value: new THREE.Color('#111') },
      uGlowDir: { value: new THREE.Vector3(0, 0.1, -1) },
      uGlowStrength: { value: 1 },
      uGlowSize: { value: 5 },
      uTime: { value: 0 },
      uCoreNdc: { value: new THREE.Vector2(0, 0) },
      uCoreHalf: { value: new THREE.Vector2(0.1, 0.3) },
      uNeckNdc: { value: new THREE.Vector2(0, 0) },
      uNeckHalf: { value: new THREE.Vector2(0.0001, 0.0001) },
      uCoreColor: { value: new THREE.Color('#ffe0b5') },
      uCoreStrength: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.themeUniforms,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        varying vec4 vClip;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vClip = gl_Position;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uBase; uniform vec3 uGlow; uniform vec3 uFloor; uniform vec3 uGlowDir;
        uniform float uGlowStrength; uniform float uGlowSize;
        uniform vec2 uCoreNdc; uniform vec2 uCoreHalf; uniform vec3 uCoreColor; uniform float uCoreStrength;
        uniform vec2 uNeckNdc; uniform vec2 uNeckHalf;
        varying vec3 vDir;
        varying vec4 vClip;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec3 d = normalize(vDir);
          float g = pow(max(dot(d, normalize(uGlowDir)), 0.0), uGlowSize);
          float halo = pow(max(dot(d, normalize(uGlowDir)), 0.0), uGlowSize * 0.25) * 0.25;
          vec3 col = uBase + uGlow * (g * uGlowStrength + halo * uGlowStrength);
          float below = smoothstep(0.02, -0.18, d.y);
          col = mix(col, uFloor * (0.8 + 0.6 * g), below);
          col *= 1.0 - 0.45 * smoothstep(0.25, 0.95, d.y);
          // luz de recorte atrás do líquido: é ela que a transmissão "enxerga" através da bebida
          vec2 ndc = vClip.xy / vClip.w;
          vec2 q = abs((ndc - uCoreNdc) / uCoreHalf);
          float r = pow(pow(q.x, 3.0) + pow(q.y, 3.0), 1.0 / 3.0);
          vec2 qn = abs((ndc - uNeckNdc) / uNeckHalf);
          float rn = pow(pow(qn.x, 3.0) + pow(qn.y, 3.0), 1.0 / 3.0);
          float core = max(smoothstep(1.2, 0.25, r), 0.6 * smoothstep(1.15, 0.3, rn));
          col += uCoreColor * uCoreStrength * (core + 0.07 * smoothstep(2.4, 0.6, r));
          col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.backdrop = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 32), mat);
    this.backdrop.renderOrder = -10;
    this.scene.add(this.backdrop);

    // Piso com borda que se dissolve no fundo
    const alpha = radialTexture([[0, '#fff'], [0.55, '#fff'], [1, '#000']], 512);
    this.floorMat = new THREE.MeshPhysicalMaterial({
      color: '#111',
      roughness: 0.85,
      metalness: 0,
      specularIntensity: 0.25,
      envMapIntensity: 0.08,
      alphaMap: alpha,
      transparent: true,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 96), this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.renderOrder = -2;
    this.floor = floor;
    this.scene.add(floor);

    // Oclusão de contato
    this.aoMat = new THREE.MeshBasicMaterial({
      map: radialTexture([[0, 'rgba(0,0,0,0.95)'], [0.6, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']], 256, 0.62),
      transparent: true,
      depthWrite: false,
    });
    this.ao = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.aoMat);
    this.ao.rotation.x = -Math.PI / 2;
    this.ao.position.y = 0.002;
    this.ao.renderOrder = -1;
    this.scene.add(this.ao);

    // Cáustica: luz focalizada pelo líquido, tingida pela cor da bebida
    this.causticMat = new THREE.MeshBasicMaterial({
      map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]),
      color: '#ff8a3a',
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.caustic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.causticMat);
    this.caustic.rotation.x = -Math.PI / 2;
    this.caustic.position.y = 0.003;
    this.caustic.renderOrder = -1;
    this.scene.add(this.caustic);
  }

  #buildLights() {
    const key = new THREE.SpotLight(0xffffff, 50, 0, 0.42, 1, 2);
    key.position.set(-3.2, 6.2, 4.2);
    key.target.position.set(0, 1.0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 6;
    key.shadow.blurSamples = 16;
    key.shadow.intensity = 0.62;
    key.shadow.camera.near = 3;
    key.shadow.camera.far = 16;
    this.scene.add(key, key.target);
    this.key = key;

    const mkRect = (x, z, w, h) => {
      const l = new THREE.RectAreaLight(0xffffff, 5, w, h);
      l.position.set(x, 2.2, z);
      l.lookAt(0, 1.4, 0);
      this.scene.add(l);
      return l;
    };
    this.rects = [mkRect(-3.6, 1.2, 0.5, 4.5), mkRect(3.6, 1.2, 0.5, 4.5), mkRect(0, -4, 3, 0.6)];

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x221a14, 0.25);
    this.scene.add(this.hemi);
  }

  #buildBokeh() {
    const count = 140;
    const pos = new Float32Array(count * 3);
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 6 + 0.2;
      pos[i * 3 + 2] = -2.5 - Math.random() * 10;
      data[i * 3] = 0.4 + Math.random() * 1.6; // tamanho
      data[i * 3 + 1] = Math.random() * Math.PI * 2; // fase
      data[i * 3 + 2] = 0.2 + Math.random() * 0.8; // brilho
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('data', new THREE.BufferAttribute(data, 3));
    this.bokehUniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#ffffff') },
      uOpacity: { value: 0.5 },
      uScale: { value: 300 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.bokehUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 data; uniform float uTime; uniform float uScale;
        varying float vBright;
        void main() {
          vec3 p = position;
          p.y += sin(uTime * 0.25 + data.y) * 0.25;
          p.x += cos(uTime * 0.18 + data.y * 1.7) * 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = data.x * uScale / -mv.z;
          vBright = data.z * (0.6 + 0.4 * sin(uTime * 0.6 + data.y * 3.0));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uOpacity; varying float vBright;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c) * 2.0;
          float disc = smoothstep(1.0, 0.82, d);
          float ring = smoothstep(0.7, 0.95, d) * disc;
          float a = (disc * 0.35 + ring * 0.5) * uOpacity * vBright;
          gl_FragColor = vec4(uColor * a, a);
        }`,
    });
    this.bokeh = new THREE.Points(geo, mat);
    this.bokeh.renderOrder = -5;
    this.scene.add(this.bokeh);
  }

  #studioEnvironment(cfg, accent = '#ffffff') {
    const env = new THREE.Scene();
    const warm = new THREE.Color('#ffb36b');
    const cool = new THREE.Color('#ffffff');
    const tone = cool.clone().lerp(warm, cfg.warm * 0.65);
    env.add(new THREE.Mesh(
      new THREE.SphereGeometry(20, 32, 16),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#0d0c0c'), side: THREE.BackSide }),
    ));
    const panel = (w, h, intensity, color, pos) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(intensity), side: THREE.DoubleSide }),
      );
      m.position.copy(pos);
      m.lookAt(0, 1.4, 0);
      env.add(m);
    };
    panel(0.55, 9, cfg.strip, tone, new THREE.Vector3(-5, 1.6, 2.2));
    panel(0.55, 9, cfg.strip * 0.85, tone, new THREE.Vector3(5, 1.6, 2.2));
    panel(6, 4, cfg.top, tone, new THREE.Vector3(0, 8, 0.5));
    panel(0.7, 8, cfg.rim, new THREE.Color(accent).lerp(tone, 0.5), new THREE.Vector3(-3.5, 1.5, -6));
    panel(0.7, 8, cfg.rim, new THREE.Color(accent).lerp(tone, 0.5), new THREE.Vector3(3.5, 1.5, -6));
    panel(8, 2.2, cfg.fill, tone, new THREE.Vector3(0, 0.6, 8));
    const rt = this.pmrem.fromScene(env, 0.0);
    env.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
    return rt;
  }

  /* ---------------- tema e iluminação ---------------- */

  setTheme(theme, instant = false, skipEnv = false) {
    this.theme = theme;
    const target = this.#themeColors(theme);
    const u = this.themeUniforms;
    const from = {
      base: u.uBase.value.clone(),
      glow: u.uGlow.value.clone(),
      floor: u.uFloor.value.clone(),
      accent: this.bokehUniforms.uColor.value.clone(),
      caustic: this.causticMat.color.clone(),
    };
    const apply = (t) => {
      u.uBase.value.copy(from.base).lerp(target.base, t);
      u.uGlow.value.copy(from.glow).lerp(target.glow, t);
      u.uFloor.value.copy(from.floor).lerp(target.floor, t);
      this.floorMat.color.copy(u.uFloor.value);
      this.bokehUniforms.uColor.value.copy(from.accent).lerp(target.accent, t);
      this.causticMat.color.copy(from.caustic).lerp(target.caustic, t);
    };
    if (instant) apply(1);
    else this.tween(900, apply, ease.inOutCubic, 'theme');
    if (!skipEnv) this.#refreshEnvironment();
  }

  #themeColors(theme) {
    const p = LIGHTING[this.preset];
    const warm = new THREE.Color('#3a2412');
    const c = (hex) => new THREE.Color(hex);
    const base = c(theme.base);
    const glow = c(theme.glow);
    const floor = c(theme.floor);
    if (p.warm) {
      base.lerp(warm, 0.35);
      glow.lerp(c('#a0602a'), 0.4);
      floor.lerp(warm, 0.3);
    }
    if (this.preset === 'backlight') {
      base.multiplyScalar(0.6);
      floor.multiplyScalar(0.7);
    }
    return { base, glow, floor, accent: c(p.warm ? '#ffc98a' : theme.accent), caustic: c(theme.caustic ?? '#ff8a3a') };
  }

  #refreshEnvironment() {
    const p = LIGHTING[this.preset];
    const old = this.envRT;
    this.envRT = this.#studioEnvironment(p.env, this.theme?.accent);
    this.scene.environment = this.envRT.texture;
    if (old) old.dispose();
  }

  setLighting(name, instant = false) {
    this.preset = name;
    const p = LIGHTING[name];
    if (!this.theme) this.#refreshEnvironment();
    const from = {
      key: this.key.intensity,
      rect: this.rects[0].intensity,
      glow: this.themeUniforms.uGlowStrength.value,
      size: this.themeUniforms.uGlowSize.value,
      exp: this.renderer.toneMappingExposure,
      caustic: this.causticMat.opacity,
      bokeh: this.bokehUniforms.uOpacity.value,
      core: this.themeUniforms.uCoreStrength.value,
    };
    const apply = (t) => {
      const l = (a, b) => a + (b - a) * t;
      this.key.intensity = l(from.key, p.key);
      this.key.color.set(p.warm ? '#ffd2a1' : '#ffffff');
      this.rects.forEach((r, i) => { r.intensity = l(from.rect, p.rect * (i === 2 ? 1.6 : 1)); });
      this.themeUniforms.uGlowStrength.value = l(from.glow, p.glow);
      this.themeUniforms.uGlowSize.value = l(from.size, p.glowSize);
      this.renderer.toneMappingExposure = l(from.exp, p.exposure);
      this.causticMat.opacity = l(from.caustic, p.caustic);
      this.bokehUniforms.uOpacity.value = l(from.bokeh, p.bokeh);
      this.themeUniforms.uCoreStrength.value = l(from.core, p.core);
      this.themeUniforms.uCoreColor.value.set(p.warm ? '#ffc98f' : '#ffe6c4');
    };
    if (instant) apply(1);
    else this.tween(700, apply, ease.inOutCubic, 'light');
    if (this.theme) this.setTheme(this.theme, instant);
  }

  /* ---------------- produtos ---------------- */

  /**
   * Exibe uma garrafa. dir: 1 = entra pela direita, -1 = pela esquerda,
   * 0 = troca no lugar (ex.: mudança de capacidade) ou primeira exibição.
   */
  showProduct(bottle, props, dir = 1) {
    const prev = this.current;
    const prevProps = this.currentProps;
    this.current = bottle;
    this.currentProps = props;
    this.setTheme(bottle.product.theme, !prev);
    this.focused = null;

    const root = bottle.root;
    this.productRoot.add(root);
    root.position.set(dir ? dir * 4.5 : 0, 0, 0);
    this.#layoutGround(bottle);

    if (prev && dir === 0) {
      // troca no lugar: preserva a rotação e anima a escala
      bottle.model.rotation.y = prev.model.rotation.y;
      this.productRoot.remove(prev.root);
      this.onRetire?.(prev);
      const k = prev.heightWorld / bottle.heightWorld;
      this.tween(700, (t) => bottle.model.scale.setScalar(k + (1 - k) * t), ease.outBack, 'grow');
    } else if (prev) {
      bottle.model.rotation.y = -dir * 1.4;
      const startX = prev.root.position.x;
      this.tween(650, (t) => { prev.root.position.x = startX - dir * 4.5 * t; }, ease.inOutCubic, null, 0, () => {
        this.productRoot.remove(prev.root);
        this.onRetire?.(prev);
      });
      const rot0 = bottle.model.rotation.y;
      this.tween(1100, (t) => {
        root.position.x = dir * 4.5 * (1 - t);
        bottle.model.rotation.y = rot0 * (1 - t);
      }, ease.outCubic, 'enter', 120);
    } else {
      bottle.model.rotation.y = -0.5;
    }

    if (props && props !== prevProps) {
      this.scene.add(props);
      props.position.y = -0.9;
      this.tween(1100, (t) => { props.position.y = -0.9 + 0.9 * t; }, ease.outCubic, 'propsIn', prev ? 350 : 200);
    }
    if (prevProps && prevProps !== props) {
      const y0 = prevProps.position.y;
      this.tween(500, (t) => { prevProps.position.y = y0 - (0.9 + y0) * t; }, ease.inOutCubic, null, 0, () => {
        this.scene.remove(prevProps);
        this.onRetireProps?.(prevProps);
      });
    }

    this.explodeTarget = 0;
    this.exploded = 0;
    this.spinBeforeExplode = undefined;
    this.#applyExplode(0);
    this.frame(!!prev);
  }

  #layoutGround(bottle) {
    const w = bottle.widthWorld;
    this.ao.scale.set(w * 1.65, w * 1.65, 1);
    this.caustic.scale.set(w * 1.2, w * 2.6, 1);
    // sombra projetada a partir da luz principal
    const dir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), this.key.position).setY(0).normalize();
    this.caustic.position.set(dir.x * w * 1.25, 0.003, dir.z * w * 1.25);
    this.caustic.rotation.z = Math.atan2(dir.x, dir.z);
  }

  /* ---------------- câmera ---------------- */

  /** Distância de câmera para caber needH x needW (mundo) na área livre entre os painéis. */
  fitDistance(needH, needW) {
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const { left, right, top, bottom } = this.insets;
    const fy = Math.max(0.25, (this.height - top - bottom) / this.height);
    const fx = Math.max(0.25, (this.width - left - right) / this.width);
    const t = 2 * Math.tan(fov / 2);
    return Math.max(needH / (t * fy), needW / (t * this.camera.aspect * fx));
  }

  frame(animated = false) {
    const b = this.current;
    if (!b) return;
    const h = b.heightWorld;
    const cy = h * 0.47;
    const dist = this.fitDistance(h * (this.mobile ? 1.42 : 1.4), Math.max(b.widthWorld * 3.0, h * 0.62));
    const elev = 0.17;
    const target = new THREE.Vector3(0, cy, 0);
    const pos = new THREE.Vector3(0, cy + Math.sin(elev) * dist, Math.cos(elev) * dist);
    this.home = { target, pos };
    this.controls.maxDistance = Math.max(11, dist * 1.8);
    this.controls.minDistance = Math.min(2, dist * 0.3);
    if (animated) this.flyTo(pos, target, 900);
    else {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
    }
  }

  viewAspect() {
    const w = this.width - this.insets.right - this.insets.left;
    const h = this.height - this.insets.bottom - this.insets.top;
    return Math.max(0.3, w / Math.max(1, h));
  }

  flyTo(pos, target, ms = 900, onDone) {
    const p0 = this.camera.position.clone();
    const t0 = this.controls.target.clone();
    this.controls.enabled = false;
    this.flying = true;
    this.tween(ms, (t) => {
      this.camera.position.lerpVectors(p0, pos, t);
      this.controls.target.lerpVectors(t0, target, t);
      this.camera.lookAt(this.controls.target);
    }, ease.inOutCubic, 'camera', 0, () => {
      this.controls.enabled = true;
      this.flying = false;
      this.controls.update();
      onDone?.();
    });
  }

  resetView() {
    this.focused = null;
    this.setExplode(false);
    this.frame(true);
    this.spin = this.spinBeforeFocus ?? this.spin;
    this.spinBeforeFocus = undefined;
  }

  /** Aproxima a câmera de um ponto de interesse (âncora do produto). */
  focusAnchor(key) {
    const b = this.current;
    if (!b) return;
    const a = b.anchors[key];
    if (!a) return;
    if (this.exploded > 0.01) this.setExplode(false);
    this.spinBeforeFocus = this.spinBeforeFocus ?? this.spin;
    this.spin = false;
    this.focused = key;
    // gira a garrafa para a frente pelo menor caminho
    const r0 = b.model.rotation.y;
    const r1 = Math.round(r0 / (Math.PI * 2)) * Math.PI * 2;
    this.tween(800, (t) => { b.model.rotation.y = r0 + (r1 - r0) * t; }, ease.inOutCubic, 'spinTo');
    const m = new THREE.Matrix4().compose(b.root.position, new THREE.Quaternion(), b.root.scale);
    const world = a.position.clone().applyMatrix4(m);
    const n = a.normal.clone().normalize();
    const dist = (key === 'cap' || key === 'neck' ? 3.1 : key === 'base' ? 3.6 : 4.3) * (this.mobile ? 1.35 : 1);
    const pos = world.clone().add(n.multiplyScalar(dist)).add(new THREE.Vector3(0, 0.35, 0));
    this.flyTo(pos, world, 1000);
  }

  cancelFocus() {
    this.tweens = this.tweens.filter((tw) => tw.tag !== 'camera' && tw.tag !== 'spinTo');
    this.controls.enabled = true;
    this.flying = false;
  }

  /* ---------------- vista explodida ---------------- */

  setExplode(on) {
    this.explodeTarget = on ? 1 : 0;
    const b = this.current;
    if (!b) return;
    if (on) {
      this.spinBeforeExplode = this.spin;
      this.spin = false;
      const r0 = b.model.rotation.y;
      const r1 = Math.round(r0 / (Math.PI * 2)) * Math.PI * 2 - 0.28;
      this.tween(900, (t) => { b.model.rotation.y = r0 + (r1 - r0) * t; }, ease.inOutCubic, 'spinTo');
      const h = b.heightWorld;
      const target = new THREE.Vector3(0, h * 0.56, 0);
      const dist = this.fitDistance(h * 1.6, b.widthWorld * 4.2);
      this.controls.maxDistance = Math.max(this.controls.maxDistance, dist * 1.5);
      this.flyTo(new THREE.Vector3(dist * 0.1, h * 0.56 + dist * 0.12, dist), target, 1000);
    } else if (this.spinBeforeExplode !== undefined) {
      this.spin = this.spinBeforeExplode;
      this.spinBeforeExplode = undefined;
      this.frame(true);
    }
    if (this.currentProps) {
      const p = this.currentProps;
      const y0 = p.position.y;
      const y1 = on ? -0.9 : 0;
      this.tween(600, (t) => { p.position.y = y0 + (y1 - y0) * t; }, ease.inOutCubic, 'props');
    }
  }

  #applyExplode(e) {
    const b = this.current;
    if (!b) return;
    for (const [k, part] of Object.entries(b.parts)) {
      const off = b.explodeOffsets[k];
      if (off) part.position.copy(off).multiplyScalar(e);
    }
  }

  /* ---------------- miniaturas ---------------- */

  /** Renderiza uma garrafa isolada e devolve uma imagem (dataURL) para o carrossel. */
  snapshot(bottle, { width = 300, height = 400 } = {}) {
    const prevVisible = this.productRoot.visible;
    this.productRoot.visible = false;
    const props = this.currentProps;
    if (props) props.visible = false;
    const savedTheme = this.theme;
    this.setTheme(bottle.product.theme, true, true);
    this.scene.add(bottle.root);
    bottle.root.position.set(0, 0, 0);
    bottle.model.rotation.y = -0.38;
    this.#layoutGround(bottle);

    const cw = this.renderer.domElement.width;
    const ch = this.renderer.domElement.height;
    const want = width / height;
    let cropW = ch * want;
    let cropH = ch;
    if (cropW > cw) {
      cropW = cw;
      cropH = cw / want;
    }
    const cam = new THREE.PerspectiveCamera(22, cw / ch, 0.05, 200);
    const h = bottle.heightWorld;
    const f = cropH / ch;
    const d = (h * 1.22) / (2 * Math.tan(THREE.MathUtils.degToRad(11)) * f);
    const cy = h * 0.5;
    cam.position.set(0, cy + d * 0.12, d);
    cam.lookAt(0, cy, 0);
    this.themeUniforms.uGlowDir.value.set(0, cy, 0).sub(cam.position).normalize();
    bottle.root.updateMatrixWorld(true);
    this.#updateCore(cam, bottle);
    this.renderer.render(this.scene, cam);

    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    out.getContext('2d').drawImage(this.renderer.domElement, (cw - cropW) / 2, (ch - cropH) / 2, cropW, cropH, 0, 0, width, height);
    const url = out.toDataURL('image/jpeg', 0.86);

    this.scene.remove(bottle.root);
    this.productRoot.visible = prevVisible;
    if (props) props.visible = true;
    if (savedTheme) this.setTheme(savedTheme, true, true);
    if (this.current) this.#layoutGround(this.current);
    return url;
  }

  /** Posiciona a luz de recorte atrás do líquido (corpo e gargalo), em coordenadas de tela normalizadas. */
  #updateCore(camera, bottle = this.current) {
    const u = this.themeUniforms;
    if (!bottle?.core) {
      u.uCoreHalf.value.set(0.0001, 0.0001);
      u.uNeckHalf.value.set(0.0001, 0.0001);
      return;
    }
    const part = bottle.parts.liquid ?? bottle.model;
    camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const place = ({ y0, y1, halfW }, ndcOut, halfOut) => {
      const c = part.localToWorld(new THREE.Vector3(0, (y0 + y1) / 2, 0));
      const top = part.localToWorld(new THREE.Vector3(0, y1, 0));
      const side = part.localToWorld(new THREE.Vector3(halfW, (y0 + y1) / 2, 0));
      const sideP = c.clone().addScaledVector(right, side.distanceTo(c));
      const nc = c.clone().project(camera);
      const nt = top.project(camera);
      const ns = sideP.project(camera);
      ndcOut.set(nc.x, nc.y);
      halfOut.set(Math.max(0.002, Math.abs(ns.x - nc.x)), Math.max(0.002, Math.abs(nt.y - nc.y)));
    };
    place(bottle.core, u.uCoreNdc.value, u.uCoreHalf.value);
    if (bottle.coreNeck) place(bottle.coreNeck, u.uNeckNdc.value, u.uNeckHalf.value);
    else u.uNeckHalf.value.set(0.0001, 0.0001);
  }

  /** Renderiza um quadro imediatamente (usado para gerar vídeos/imagens). */
  renderOnce() {
    this.controls.update();
    this.themeUniforms.uGlowDir.value.copy(this.controls.target).sub(this.camera.position).normalize();
    this.#updateCore(this.camera);
    this.renderer.render(this.scene, this.camera);
  }

  /* ---------------- utilidades ---------------- */

  tween(ms, update, easing = ease.inOutCubic, tag = null, delay = 0, done = null) {
    if (tag) this.tweens = this.tweens.filter((t) => t.tag !== tag);
    this.tweens.push({ ms, t: -delay, update, easing, tag, done });
  }

  setInsets(insets) {
    Object.assign(this.insets, insets);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${w}px`;
    this.renderer.domElement.style.height = `${h}px`;
    this.camera.aspect = w / h;
    this.#applyViewOffset();
    this.bokehUniforms.uScale.value = h * 0.45;
  }

  #applyViewOffset() {
    const { left, right, bottom, top } = this.insetsAnim;
    const w = this.width;
    const h = this.height;
    this.camera.setViewOffset(w, h, (right - left) / 2, (bottom - top) / 2, w, h);
    this.camera.updateProjectionMatrix();
  }

  /** Posições de tela das âncoras (hotspots) e das partes (vista explodida). */
  projectAnchors() {
    const b = this.current;
    if (!b) return null;
    const out = { anchors: {}, parts: {} };
    const camPos = this.camera.position;
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const toScreen = (p) => {
      v.copy(p).project(this.camera);
      return { x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height, z: v.z };
    };
    for (const [key, a] of Object.entries(b.anchors)) {
      const part = b.parts[a.part] ?? b.model;
      const world = part.localToWorld(a.position.clone());
      part.getWorldQuaternion(q);
      n.copy(a.normal).applyQuaternion(q);
      const facing = n.dot(v.copy(camPos).sub(world).normalize());
      const s = toScreen(world);
      out.anchors[key] = { ...s, facing };
    }
    const partCenters = {
      cap: new THREE.Vector3(1.6, 25.6, 0),
      labels: new THREE.Vector3(0, 3.3, 4.35),
      glass: new THREE.Vector3(0, 0.3, 4.35),
      liquid: new THREE.Vector3(0, 1.7, 3.95),
    };
    for (const [key, c] of Object.entries(partCenters)) {
      const part = b.parts[key];
      if (!part) continue;
      out.parts[key] = toScreen(part.localToWorld(c.clone()));
    }
    out.exploded = this.exploded;
    return out;
  }

  loop(timestamp) {
    this.timer.update(timestamp);
    const dt = Math.min(this.maxDt ?? 0.05, this.timer.getDelta());
    const now = performance.now();

    // tweens
    if (this.tweens.length) {
      const finished = [];
      for (const tw of [...this.tweens]) {
        if (!this.tweens.includes(tw)) continue;
        tw.t += dt * 1000;
        if (tw.t < 0) continue;
        const k = Math.min(1, tw.t / tw.ms);
        tw.update(tw.easing(k));
        if (k >= 1) finished.push(tw);
      }
      if (finished.length) {
        this.tweens = this.tweens.filter((tw) => !finished.includes(tw));
        finished.forEach((tw) => tw.done?.());
      }
    }

    // insets suaves (painel lateral / gaveta inferior)
    let insetChanged = false;
    for (const k of ['left', 'right', 'bottom', 'top']) {
      const d = this.insets[k] - this.insetsAnim[k];
      if (Math.abs(d) > 0.5) {
        this.insetsAnim[k] += d * Math.min(1, dt * 8);
        insetChanged = true;
      } else if (d !== 0) {
        this.insetsAnim[k] = this.insets[k];
        insetChanged = true;
      }
    }
    if (insetChanged) this.#applyViewOffset();

    // vista explodida
    const de = this.explodeTarget - this.exploded;
    if (Math.abs(de) > 0.0005) {
      this.exploded += de * Math.min(1, dt * 4.2);
      this.#applyExplode(ease.inOutCubic(Math.min(1, Math.max(0, this.exploded))));
    }

    // turntable
    const b = this.current;
    const idle = !this.userActive && (!this.lastInteraction || now - this.lastInteraction > 1800);
    if (b && this.spin && idle && !this.flying && this.explodeTarget === 0) {
      b.model.rotation.y += dt * this.spinSpeed;
    }

    if (!this.flying) this.controls.update();
    this.themeUniforms.uGlowDir.value.copy(this.controls.target).sub(this.camera.position).normalize();
    this.bokehUniforms.uTime.value += dt;
    this.#updateCore(this.camera);

    this.renderer.render(this.scene, this.camera);
    this.onFrame?.(this);
  }
}
