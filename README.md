# Vision — Showroom 3D

Ambiente virtual para apresentar produtos em 3D com visão profissional: o cliente escolhe um produto
na coleção, gira a garrafa em 360°, aproxima nos detalhes e consulta composição, história e
harmonização.

Coleção inicial: família **Jack Daniel's** — Tennessee Blackberry (1 L e 700 ml), Old No. 7,
Tennessee Honey, Tennessee Fire e Tennessee Apple.

## Recursos

- **3D em tempo real (Three.js / WebGL 2)** com materiais físicos (PBR):
  - líquido com transmissão, refração (IOR 1,36) e absorção de cor (lei de Beer-Lambert), que
    "acende" quando há luz atrás da garrafa
  - vidro com reflexos de estúdio, nome gravado em relevo no ombro e base maciça refrativa
  - rótulos em alta resolução com dourado/prata metalizado (hot stamping) e relevo
  - tampa serrilhada, sombra suave, cáustica colorida pela bebida e oclusão de contato
- **Estúdio de fotografia virtual**: softboxes em faixa, fundo infinito e três iluminações —
  *Estúdio*, *Contraluz* e *Bar*.
- **360°**: giro automático estilo "turntable", arrastar para girar, pinça/scroll para zoom.
- **Pontos de interesse**: seis marcadores na garrafa (tampa, colarinho, relevo, rótulo, líquido,
  base); ao tocar, a câmera voa até o detalhe e mostra a explicação.
- **Vista explodida**: separa tampa, rótulos, contra-rótulo, vidro e líquido com legendas.
- **Painel de detalhes**: visão geral e ficha técnica, composição (blend, receita de grãos,
  processo do grão à garrafa, teor alcoólico), linha do tempo da história, harmonização (como
  servir, pratos, drinks com receita) e perfil sensorial (radar + notas de degustação).
- Ambientação temática ao redor da garrafa: amoras, carvão de bordo e aduela de carvalho, favo
  de mel, canela e anis-estrelado, maçãs verdes.
- Miniaturas da coleção renderizadas pelo próprio motor 3D.
- Layout para desktop e celular (gaveta inferior no iPhone), confirmação de maioridade e aviso
  "Beba com moderação".
- Link direto para um produto: `/#jd-old-no7`, `/#jd-blackberry`…

## Rodando

```bash
npm install
npm run dev          # http://localhost:5173 (use --host para abrir no celular na mesma rede)
npm run build        # site estático em dist/ (Netlify, Vercel, GitHub Pages, S3…)
npm run build:single # um único arquivo dist-single/index.html, funciona offline
```

### Publicar no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica o site a cada push na `main`.
Ative uma vez em **Settings → Pages → Source: GitHub Actions**; o endereço fica
`https://<usuário>.github.io/<repositório>/`.

### Realidade aumentada (iPhone/iPad)

No Safari do iOS aparece o botão **Ver em AR**: a garrafa é exportada em USDZ no próprio
navegador e aberta no AR Quick Look, em tamanho real, sobre a mesa.

## Adicionando produtos

Edite `src/data/products.js`. Cada produto define:

| Campo | Para quê |
|---|---|
| `design` | cores, textos e ícone do rótulo (pintado proceduralmente em alta resolução) |
| `labelImage` | *(opcional)* arte oficial plana do rótulo, ex.: `labels/blackberry.png` em `public/` |
| `liquid` | cor de absorção e intensidade do líquido |
| `cap` | cor da tampa e do topo (metálico ou não) |
| `sizes` | capacidades; a garrafa é escalada pelo volume |
| `theme` | cores do estúdio (fundo, brilho, piso, destaque, cáustica) |
| `props` | ambientação: `blackberries`, `charcoal`, `honey`, `cinnamon`, `apples` |
| `composition`, `history`, `pairings`, `tasting`, `sensory`, `hotspots` | conteúdo do painel |

Novos formatos de garrafa (redonda, vinho, gin…) são definidos em `SHAPES`
(`src/three/bottle.js`) por um perfil de pontos `[altura, raio, quadratura]` em centímetros:
quadratura 2 = seção redonda, 5–7 = quadrada com cantos arredondados.

### Fidelidade máxima ("gêmeo digital")

Os modelos são reconstruções procedurais com medidas reais aproximadas. Para ficarem idênticos ao
produto físico:

1. **Rótulo oficial** — coloque a arte plana do rótulo (PNG/JPG, ~2000 px de altura) em
   `public/labels/` e informe `labelImage`.
2. **Modelo 3D escaneado** — fotogrametria ou arquivo do fabricante em `.glb` em `public/models/`
   (veja `public/models/README.md`).

## Estrutura

```
src/
  main.js            orquestra carregamento, seleção de produto e controles
  data/products.js   catálogo e conteúdo
  three/stage.js     renderizador, estúdio, câmera, giro, vista explodida, miniaturas
  three/bottle.js    garrafa: vidro, líquido, rótulos, tampa, âncoras dos hotspots
  three/geometry.js  torno de superelipses (geometria procedural)
  three/labels.js    pintura dos rótulos (cor, metalizado e relevo)
  three/props.js     ambientação temática
  ui/                painel, radar sensorial e hotspots
```

## Fontes do conteúdo

- Jack Daniel's Pressroom — lançamento do Tennessee Blackberry (04/08/2025), Tennessee Fire
  (nacional em 03/03/2015) e Tennessee Apple (01/10/2019)
- Propmark / ABC da Comunicação — lançamento do Tennessee Blackberry no Brasil (jul/2026)
- Brown-Forman — relatório anual 2026 (Brasil como 3º mercado da família Jack Daniel's)
- Jack Daniel's — Our History

Notas sensoriais (escala 0–5) e receitas marcadas como "sugestão da casa" são editoriais.
Jack Daniel's e as marcas relacionadas pertencem aos seus respectivos donos; este showroom
apresenta os produtos para fins de venda/informação.

**Beba com moderação. Venda proibida para menores de 18 anos.**
