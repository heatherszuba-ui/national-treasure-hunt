// Renders icon.png (180x180 home-screen icon) from the in-game hero sprite.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { serve } from './serve.mjs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const { srv, url } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url);
await page.waitForFunction(() => window.__NT && window.__NT.SPR);
const dataUrl = await page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 180; c.height = 180;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#0a1030'; g.fillRect(0, 0, 180, 180);
  g.fillStyle = '#ffd700'; g.fillRect(0, 0, 180, 10); g.fillRect(0, 170, 180, 10); g.fillRect(0, 0, 10, 180); g.fillRect(170, 0, 10, 180);
  g.fillStyle = '#7a1e2e'; g.fillRect(10, 130, 160, 40);
  g.drawImage(window.__NT.SPR.hero.down[0], 26, 12, 128, 128);
  g.fillStyle = '#ffd700'; g.font = '14px "Press Start 2P", monospace'; g.textAlign = 'center'; g.fillText('TREASURE', 90, 158);
  return c.toDataURL('image/png');
});
fs.writeFileSync(new URL('../icon.png', import.meta.url), Buffer.from(dataUrl.split(',')[1], 'base64'));
await browser.close(); srv.close();
console.log('icon.png written');
