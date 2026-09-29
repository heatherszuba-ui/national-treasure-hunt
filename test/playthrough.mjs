// Headless playthrough: drives the game with keyboard input through every room and
// writes a screenshot per stage to test/shots/. Exits non-zero on any page error.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { serve } from './serve.mjs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');

const SHOTS = new URL('./shots/', import.meta.url);
fs.mkdirSync(SHOTS, { recursive: true });
const { srv, url } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => window.__NT);
await page.evaluate(() => document.fonts.ready);

const NT = () => page.evaluate(() => ({ state: window.__NT.state, room: window.__NT.room, clues: window.__NT.clues,
  player: window.__NT.player && { x: window.__NT.player.x, y: window.__NT.player.y, hp: window.__NT.player.hp, dir: window.__NT.player.dir },
  enemies: (window.__NT.enemies || []).map(e => ({ x: e.x, y: e.y, hp: e.hp, dead: e.dead })),
  dlgLine: window.__NT.dlg ? window.__NT.dlg.lines[window.__NT.dlg.i] : null,
  choice: window.__NT.choice ? window.__NT.choice.opts.map(o => o.label) : null }));
const frames = n => page.waitForTimeout(Math.ceil(n * 1000 / 60) + 5);
const press = async k => { await page.keyboard.down(k); await frames(2); await page.keyboard.up(k); await frames(2); };
let shotN = 0;
const shot = async name => { await page.screenshot({ path: new URL(`${String(++shotN).padStart(2, '0')}-${name}.png`, SHOTS).pathname }); };
const log = (...a) => console.log('[play]', ...a);

async function waitState(s, ms = 8000) { await page.waitForFunction(st => window.__NT.state === st, s, { timeout: ms }); }
async function skipDialog(shotName) {
  let guard = 0; let first = true;
  while ((await NT()).state === 'dialog' && guard++ < 60) {
    if (first && shotName) { await frames(40); await shot(shotName); first = false; }
    await press('z'); await frames(3);
  }
}
async function pickChoice(idx, shotName) {
  await waitState('choice');
  const st = await NT(); log('choices:', st.choice);
  if (shotName) await shot(shotName);
  for (let i = 0; i < idx; i++) await press('ArrowDown');
  await press('z');
}
async function walkTo(tx, ty) { // tile coords, axis by axis
  const target = { x: tx * 16, y: ty * 16 };
  for (const axis of ['x', 'y']) {
    let guard = 0;
    while (guard++ < 600) {
      const p = (await NT()).player; const d = target[axis] - p[axis];
      if (Math.abs(d) <= 1) break;
      const key = axis === 'x' ? (d < 0 ? 'ArrowLeft' : 'ArrowRight') : (d < 0 ? 'ArrowUp' : 'ArrowDown');
      await page.keyboard.down(key); await frames(Math.min(8, Math.abs(d))); await page.keyboard.up(key); await frames(1);
    }
  }
}
async function face(dir) { const k = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[dir]; await page.keyboard.down(k); await frames(1); await page.keyboard.up(k); await frames(1); }
async function fight(shotName) {
  let guard = 0; let shotDone = false;
  while (guard++ < 1500) {
    const st = await NT();
    if (st.state === 'dialog') { await skipDialog(); continue; }
    if (st.state !== 'play') { await frames(5); continue; }
    const alive = st.enemies.filter(e => !e.dead);
    if (!alive.length) break;
    const p = st.player;
    const e = alive.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    const dx = e.x - p.x, dy = e.y - p.y;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) { await face(dir); await press('z'); if (!shotDone && shotName) { await shot(shotName); shotDone = true; } await frames(10); }
    else { const k = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[dir]; await page.keyboard.down(k); await frames(6); await page.keyboard.up(k); }
  }
  log('fight done, hp', (await NT()).player.hp);
}
async function interact(dir) { await face(dir); await press('z'); await frames(3); }
async function clueSequence(choiceIdx, tag) {
  await waitState('banner'); await frames(30); await shot(`${tag}-clue-banner`);
  await waitState('dialog'); await skipDialog(`${tag}-clue-text`);
  await pickChoice(choiceIdx, `${tag}-choice`);
  await waitState('dialog', 4000); await skipDialog();
  await page.waitForFunction(() => window.__NT.state === 'dialog' && window.__NT.dlg, null, { timeout: 8000 }); // next room intro
}

process.on('unhandledRejection', async e => { console.error('FAIL:', e.message); try { console.error('STATE:', JSON.stringify(await NT())); await shot('FAILURE'); } catch (_) {} process.exit(1); });

// ---- Title + intro
await frames(10); await shot('title');
await press('z'); await waitState('dialog'); await skipDialog('intro');
await waitState('dialog'); await skipDialog('archives-intro');
log('room', (await NT()).room);

// ---- Archives: fight, then case
await fight('archives-fight');
await skipDialog();
await walkTo(7, 2); await interact('up');
await clueSequence(0, 'archives');
let st = await NT(); log('now in', st.room, 'clues', st.clues);
await skipDialog(`${st.room}-intro`);

// Rooms 2-4 in whatever order the choice produced (first option each time, joke option once)
for (let i = 0; i < 3; i++) {
  st = await NT();
  if (st.room === 'hall') {
    await walkTo(7, 3);
    for (let n = 0; n < 10; n++) { await interact('up'); await frames(12); if (n === 4) await shot('hall-bell'); }
    await page.waitForFunction(() => window.__NT.state === 'dialog', null, { timeout: 5000 }); await skipDialog('hall-solved');
  } else if (st.room === 'charlotte') {
    await walkTo(3, 4); await interact('up'); await skipDialog('charlotte-wrong-barrel');
    await walkTo(7, 3); await interact('up'); await skipDialog('charlotte-haggis');
    await walkTo(7, 8); await walkTo(4, 8); await interact('up'); await skipDialog();
    await skipDialog('charlotte-solved');
  } else if (st.room === 'trinity') {
    await fight('trinity-fight'); await skipDialog();
    await walkTo(7, 2); await interact('up');
  }
  await clueSequence(i === 1 ? 2 : 0, st.room); // 2nd time pick the joke option
  st = await NT(); log('now in', st.room, 'clues', st.clues);
  await skipDialog(`${st.room}-intro`);
}

// ---- Final room
st = await NT(); if (st.room !== 'treasure') throw new Error('expected treasure room, got ' + st.room);
await fight('treasure-boss'); await skipDialog('treasure-dogs');
await frames(20); await shot('treasure-chest');
await walkTo(7, 2); await interact('up');
await waitState('treasure', 6000); await frames(60); await shot('treasure-card1');
for (let c = 1; c < 8; c++) { await press('z'); await frames(50); await shot(`treasure-card${c + 1}`); }
await press('z'); await waitState('title');
log('back at title. clues =', (await NT()).clues);

await browser.close(); srv.close();
if (errors.length) { console.error('PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('PLAYTHROUGH OK, screenshots in test/shots/');
