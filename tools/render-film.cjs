/*
 * Renderiza as imagens de divulgação e os quadros do comercial a partir de film.html.
 *
 * Uso:
 *   npm run build && npx vite preview --port 4173      (ou npm run dev)
 *   node tools/render-film.cjs http://localhost:4173/film.html saida/
 *   ffmpeg -framerate 24 -i saida/frames/f%04d.jpg -c:v libx264 -crf 19 -pix_fmt yuv420p -movflags +faststart comercial.mp4
 *
 * Requer Playwright (npm i -D playwright && npx playwright install chromium).
 * Opções por variável de ambiente: FPS (24), ONLY=stills|video.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const url = process.argv[2] || 'http://localhost:5173/film.html';
const out = path.resolve(process.argv[3] || 'film-out');
const frames = path.join(out, 'frames');
fs.mkdirSync(frames, { recursive: true });
const FPS = Number(process.env.FPS || 24);
const ONLY = process.env.ONLY || '';

(async () => {
  const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1920 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.film, null, { timeout: 600000 });
  const save = (file, dataUrl) => fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  if (ONLY !== 'video') {
    for (const s of await page.evaluate(() => window.film.stills)) {
      save(path.join(out, `${s}.jpg`), await page.evaluate((n) => window.film.still(n), s));
      console.log('imagem', s);
    }
  }
  if (ONLY !== 'stills') {
    await page.evaluate(() => window.film.setSize(720, 1280));
    const total = Math.round((await page.evaluate(() => window.film.DURATION)) * FPS);
    for (let i = 0; i < total; i++) {
      const file = path.join(frames, `f${String(i).padStart(4, '0')}.jpg`);
      if (fs.existsSync(file)) continue; // permite retomar
      save(file, await page.evaluate((t) => window.film.frame(t), i / FPS));
      if (i % FPS === 0) console.log(`quadro ${i}/${total}`);
    }
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
