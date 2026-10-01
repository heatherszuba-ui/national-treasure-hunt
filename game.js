/* National Treasure [Hunt] — a birthday game for James. 16-bit top-down adventure. */
'use strict';
(function () {
const W = 256, H = 240, T = 16, MW = 16, MH = 14, HUD = 16;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------------------------------------------------------------- INPUT
const keys = { up: 0, down: 0, left: 0, right: 0, a: 0, b: 0 };
let jp = {};
let tap = null;
function setKey(k, v) { if (v && !keys[k]) jp[k] = true; keys[k] = v ? 1 : 0; }
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', z: 'a', ' ': 'a', Enter: 'a', x: 'b', Shift: 'b' };
window.addEventListener('keydown', e => { const k = KEYMAP[e.key]; if (k) { audioInit(); setKey(k, 1); e.preventDefault(); } });
window.addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) { setKey(k, 0); e.preventDefault(); } });
document.querySelectorAll('.btn').forEach(b => {
  const k = b.dataset.k;
  const down = e => { e.preventDefault(); audioInit(); b.classList.add('down'); setKey(k, 1); };
  const up = e => { e.preventDefault(); b.classList.remove('down'); setKey(k, 0); };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); audioInit();
  const r = cv.getBoundingClientRect();
  tap = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
});

// ---------------------------------------------------------------- AUDIO
let AC = null;
function audioInit() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume();
}
function tone(f, dur, type, vol, when, slide) {
  if (!AC) return;
  type = type || 'square'; vol = vol || 0.08; when = when || 0;
  const o = AC.createOscillator(), g = AC.createGain();
  const t = AC.currentTime + when;
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
}
const SFX = {
  punch() { tone(180, 0.08, 'square', 0.1, 0, -120); },
  hit() { tone(90, 0.15, 'sawtooth', 0.12, 0, -60); },
  hurt() { tone(200, 0.25, 'square', 0.1, 0, -150); },
  die() { tone(300, 0.12, 'square', 0.08, 0, -200); tone(150, 0.3, 'square', 0.08, 0.12, -100); },
  blip() { tone(880, 0.05, 'square', 0.05); },
  select() { tone(660, 0.06, 'square', 0.06); tone(990, 0.08, 'square', 0.06, 0.06); },
  bell() { tone(520, 0.9, 'sine', 0.15, 0, -40); tone(1040, 0.5, 'sine', 0.05, 0, -80); },
  clue() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, 'square', 0.08, i * 0.09)); },
  fanfare() { [392, 392, 392, 523, 659, 523, 659, 784, 1047].forEach((f, i) => tone(f, i == 8 ? 0.8 : 0.16, 'square', 0.09, i * 0.15)); },
  open() { tone(300, 0.1, 'square', 0.06, 0, 200); tone(600, 0.2, 'square', 0.06, 0.1, 300); },
  nope() { tone(200, 0.15, 'square', 0.06, 0, -80); },
  boom() { tone(60, 0.4, 'sawtooth', 0.1, 0, -40); },
};

// ---------------------------------------------------------------- SPRITES
function spr(rows, pal) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error('bad sprite row ' + y + ': ' + rows[y]);
    for (let x = 0; x < w; x++) { const col = pal[rows[y][x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
  }
  return c;
}
function flip(c) { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; const g = n.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return n; }
function whiten(c) { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; const g = n.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); return n; }

// Humanoid frames. h=hair s=skin j=jacket p=pants k=shoes/outline e=eye w=shirt r=tie g=glasses
const HUM = {
  d0: [
    '................', '.....hhhhhh.....', '....hhhhhhhh....', '....hhssssss....', '....hsseesse....',
    '....hsssssss....', '.....ssssss.....', '......ssss......', '....jjjwwjjj....', '...jjjjwwjjjj...',
    '...sjjjjwjjjs...', '...sjjjjjjjjs...', '....pppppppp....', '....ppp..ppp....', '....ppp..ppp....', '....kkk..kkk....'],
  d1: [
    '................', '.....hhhhhh.....', '....hhhhhhhh....', '....hhssssss....', '....hsseesse....',
    '....hsssssss....', '.....ssssss.....', '......ssss......', '....jjjwwjjj....', '...jjjjwwjjjj...',
    '...sjjjjwjjjs...', '...sjjjjjjjjs...', '....pppppppp....', '....ppp..ppp....', '....kkk..ppp....', '.........kkk....'],
  u0: [
    '................', '.....hhhhhh.....', '....hhhhhhhh....', '....hhhhhhhh....', '....hhhhhhhh....',
    '....hhhhhhhh....', '.....hhhhhh.....', '......ssss......', '....jjjjjjjj....', '...jjjjjjjjjj...',
    '...sjjjjjjjjs...', '...sjjjjjjjjs...', '....pppppppp....', '....ppp..ppp....', '....ppp..ppp....', '....kkk..kkk....'],
  u1: [
    '................', '.....hhhhhh.....', '....hhhhhhhh....', '....hhhhhhhh....', '....hhhhhhhh....',
    '....hhhhhhhh....', '.....hhhhhh.....', '......ssss......', '....jjjjjjjj....', '...jjjjjjjjjj...',
    '...sjjjjjjjjs...', '...sjjjjjjjjs...', '....pppppppp....', '....ppp..ppp....', '....kkk..ppp....', '.........kkk....'],
  s0: [
    '................', '......hhhhh.....', '.....hhhhhhh....', '.....hhhsss.....', '.....hhsses.....',
    '.....hhssss.....', '......ssss......', '.......ss.......', '......jjjjj.....', '.....jjjjjjj....',
    '.....jjjjjjjs...', '.....jjjjjj.....', '......ppppp.....', '......pp.pp.....', '......pp.pp.....', '......kk.kk.....'],
  s1: [
    '................', '......hhhhh.....', '.....hhhhhhh....', '.....hhhsss.....', '.....hhsses.....',
    '.....hhssss.....', '......ssss......', '.......ss.......', '......jjjjj.....', '.....jjjjjjj....',
    '.....jjjjjjjs...', '.....jjjjjj.....', '......ppppp.....', '.....pp...pp....', '....kk.....kk...', '................'],
};
function humanoid(pal) {
  const d0 = spr(HUM.d0, pal), d1 = spr(HUM.d1, pal), u0 = spr(HUM.u0, pal), u1 = spr(HUM.u1, pal), s0 = spr(HUM.s0, pal), s1 = spr(HUM.s1, pal);
  return { down: [d0, d1, d0, flip(d1)], up: [u0, u1, u0, flip(u1)], right: [s0, s1], left: [flip(s0), flip(s1)] };
}
const PAL_HERO = { h: '#4a2c17', s: '#f1c27d', e: '#1a1a1a', j: '#23305e', w: '#e8e8e8', p: '#8a7a5a', k: '#1a1a1a' };
const PAL_GOON = { h: '#101010', s: '#e0b48a', e: '#101010', j: '#151520', w: '#ffffff', p: '#151520', k: '#000000' };
const PAL_SHAW = { h: '#d9c27a', s: '#e0b48a', e: '#101010', j: '#4a4a4a', w: '#222222', p: '#333333', k: '#000000' };
const PAL_IAN = { h: '#8a5a2b', s: '#e8c39e', e: '#101010', j: '#5c3a1e', w: '#d8c8a0', p: '#2a2a2a', k: '#000000' };
const SPR = {};
SPR.hero = humanoid(PAL_HERO);
SPR.goon = humanoid(PAL_GOON);
SPR.shaw = humanoid(PAL_SHAW);
SPR.ian = humanoid(PAL_IAN);
const PAL_CHOZEN = { h: '#101010', s: '#e0b48a', e: '#101010', j: '#1c1c2c', w: '#1c1c2c', p: '#1c1c2c', k: '#000000' };
const PAL_THUG = { h: '#1a1a1a', s: '#d9a877', e: '#101010', j: '#7a6a3a', w: '#e8d8a0', p: '#4a3a2a', k: '#000000' };
SPR.chozen = humanoid(PAL_CHOZEN);
SPR.thug = humanoid(PAL_THUG);
// white versions for hit flash
for (const k of ['goon', 'shaw', 'ian', 'chozen', 'thug', 'hero']) { const s = SPR[k]; s.white = {}; for (const d of ['down', 'up', 'right', 'left']) s.white[d] = s[d].map(whiten); }
// sunglasses for goons: overlay 
const GLASSES = spr(['gg.gg', 'gg.gg'], { g: '#000' });
const HEADBAND = spr(['rrrrrrrr', 'rrrrrrrr'], { r: '#c8201a' });

// Nub Nub: vizsla (rust red, sleek, floppy ear). Dumbledore: tricolor Australian shepherd.
SPR.nubnub = spr([
  '................', '..rrrr..........', '.rkrrrE.........', '.rrrrrE......r..', 'krrrrrErrrrrrr..',
  '.rrrrrrrrrrrrr..', '..rrrrrrrrrrrr..', '...rrrrrrrrrr...', '...rr......rr...', '...rr......rr...',
  '...rr......rr...', '...kk......kk...'], { r: '#b8652c', E: '#8f4a1c', k: '#2a1a10' });
SPR.dumbledore = spr([
  '................', '..bcbb..........', '.bcwcbbb........', '.wwwcbbbb.......', 'kwwcbbbbbbbbbbb.',
  '.wwbbbbbbbbbbbbb', '..wwbbbbbbbbbbb.', '...bbbbbbbbbbb..', '...cc......cc...', '...ww......ww...',
  '...ww......ww...', '...kk......kk...'], { b: '#1c1c1c', w: '#f2f2f2', c: '#b5773a', k: '#000000' });
SPR.dumbledoreR = flip(SPR.dumbledore);
SPR.heart = spr(['.kk.kk.', 'krrkrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'], { k: '#5a0a0a', r: '#e33' });
SPR.heartOff = spr(['.kk.kk.', 'kddkddk', 'kdddddk', '.kdddk.', '..kdk..', '...k...'], { k: '#333', d: '#111' });
SPR.castle = spr([
  '...........g............',
  '...........f............',
  '...........W............',
  '.....g....WWW....g......',
  '.....f....WWW....f......',
  '.....W...WWWWW...W......',
  '....WWW..WWWWW..WWW.....',
  '....WWW..WbWbW..WWW.....',
  '....WWW..WWWWW..WWW.....',
  '..WWWWWWWWWWWWWWWWWWW...',
  '..WWbWWbWWWWWWWbWWbWW...',
  '..WWWWWWWWWWWWWWWWWWW...',
  '..WWWWWWWWWddWWWWWWWW...',
  '..WWWWWWWWdddWWWWWWWW...',
  '..WWWWWWWWdddWWWWWWWW...',
], { g: '#ffd700', f: '#e33', W: '#e9d8ff', b: '#6b4ba0', d: '#3b2a5e' });

// ---------------------------------------------------------------- TEXT
function font(size) { ctx.font = size + 'px "Press Start 2P", monospace'; ctx.textBaseline = 'top'; }
function text(s, x, y, col, size, align) { font(size || 8); ctx.textAlign = align || 'left'; ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); }
function textO(s, x, y, col, size, align) {
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) text(s, x + dx, y + dy, '#000', size, align);
  text(s, x, y, col, size, align);
}
function wrap(s, n) {
  const words = s.split(' '), out = []; let line = '';
  for (const w of words) { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; }
  if (line) out.push(line);
  return out;
}

// ---------------------------------------------------------------- STORY DATA
const THEMES = {
  marble: { floor: '#d8d2c0', floor2: '#cfc8b4', wall: '#7a6f5a', wallDark: '#5a5040', carpet: '#7a1e2e', deco: '#b8b0a0' },
  hall: { floor: '#a97a45', floor2: '#9d6f3e', wall: '#6b3f1f', wallDark: '#4a2a12', carpet: '#8b1e1e', deco: '#c9a25f' },
  ship: { floor: '#6b4a2a', floor2: '#5e4025', wall: '#3e2a16', wallDark: '#2a1c0e', carpet: '#8b1e1e', deco: '#a07a4a', water: '#bfe3f2', water2: '#9fd0e8' },
  garden: { floor: '#5c9a3c', floor2: '#549036', wall: '#6b4a2a', wallDark: '#4a3018', carpet: '#8b1e1e', deco: '#2e6b1e', water: '#4a8fd8', water2: '#6aa8e8' },
  crypt: { floor: '#585c60', floor2: '#4f5357', wall: '#2e3236', wallDark: '#1e2226', carpet: '#3a2a5e', deco: '#8a8e92' },
  vault: { floor: '#3a3020', floor2: '#332a1c', wall: '#1f1a10', wallDark: '#100c06', carpet: '#7a1e2e', deco: '#f2c14e' },
};
const JOKES = [
  { label: "RUN A 5:30 'EASY' MILE", response: ["James runs an 'easy' mile at 5:30 pace to think it over.", "HEATHER (by text): JAMES. EASY. DAY.", "JAMES: ...I felt great, though.", "RILEY: Onward, I guess."] },
  { label: 'EAT 40 CHICKEN WINGS', response: ['James eats 40 chicken wings in four minutes. A new record.', "RILEY: I'm disgusted. And impressed. Mostly disgusted.", 'JAMES: Champions eat. Let\'s go.'] },
  { label: 'WATCH KARATE KID II FIRST', response: ["James puts on Karate Kid II 'for inspiration' and writes a workout.", "RILEY: You've seen this. You've seen this a hundred times.", 'JAMES: Shh. This is the drum part.', 'Two hours later. Onward.'] },
  { label: 'PLAY LITTLE IRISH FIRST', response: ["James plays 'One Song Glory' on Little Irish. Full voice. Open mic rules.", 'The goons weep. Riley weeps. A single tear rolls down the Declaration.', 'RILEY: Please tell me you did not just film a singing selfie.', 'JAMES: Posted. Okay. NOW we go.'] },
];
const MIDDLE = ['hall', 'charlotte', 'trinity', 'okinawa'];
const ROOMS = {
  archives: {
    name: 'NATIONAL ARCHIVES', theme: 'marble', type: 'combat',
    map: [
      '################', '#..............#', '#..P........P..#', '#..............#', '#..............#',
      '#..P........P..#', '#..............#', '#..............#', '#..P........P..#', '#..............#',
      '#..............#', '#..P........P..#', '#..............#', '################'],
    start: { x: 7, y: 11 },
    enemies: [{ x: 4, y: 5, kind: 'goon' }, { x: 11, y: 5, kind: 'goon' }],
    objects: [{ kind: 'case', x: 7, y: 1, w: 2, h: 1 }],
    intro: ['JAMES: The National Archives. The Declaration is right there.', "RILEY: And so are Ian's goons. Someone's gotta go to prison, Ben.", "JAMES: Nobody's gotta go to prison. I'm gonna punch them."],
    cleared: ['JAMES: Lemon juice... heat... hair dryer... THERE\'S WRITING ON THE BACK!', 'RILEY: You handled the Declaration of Independence with a HAIR DRYER?', 'JAMES: Go look at the case.'],
    locked: 'JAMES: Not yet. Goons first.',
    clue: ['THE LEGEND WRIT, THE STAIN AFFECTED, THE KEY IN SILENCE UNDETECTED...', "'SHE HIRED A COACH TO MAKE HER FASTER. HE MADE HER HIS WIFE INSTEAD.'", "'THE HUNT BEGAN AT AN EASY PACE. IT DID NOT STAY EASY.'", "RILEY: Why can't they just say 'go to this place, here's the treasure, spend it wisely'?", "JAMES: Because it's a riddle, Riley. And I know exactly where it points."],
  },
  hall: {
    name: 'INDEPENDENCE HALL', theme: 'hall', type: 'puzzle', label: 'INDEPENDENCE HALL',
    pick: ['JAMES: Franklin. Silence Dogood. The bell.', "RILEY: Philadelphia. Fine. I'll drive."],
    map: [
      '################', '#..............#', '#..............#', '#....~~~~~~....#', '#....~~~~~~....#',
      '#..............#', '#.X..........X.#', '#..............#', '#..............#', '#.X..........X.#',
      '#..............#', '#..............#', '#..............#', '################'],
    start: { x: 7, y: 11 },
    enemies: [],
    objects: [{ kind: 'bell', x: 7, y: 1, w: 2, h: 2 }],
    intro: ["JAMES: Independence Hall. Franklin's bell tower.", "RILEY: There's an inscription: 'RING THE BELL ONCE FOR EVERY EVENT A DECATHLETE MUST CONQUER.'", 'RILEY: How many is that? Like, five?', 'JAMES: Riley. Please.'],
    solved: ['The bell shudders. A scrap of paper falls from the clapper.', 'JAMES: Ten events. 100 meters, long jump, shot put, high jump, 400...', 'RILEY: Nobody asked, Ben.'],
    clue: ["'HE THREW. HE VAULTED. HE RAN. TEN EVENTS, ONE MAN. NOW HE RUNS TOO HARD ON TUESDAYS.'", "'HE WAS ROGER. HE WAS MARK. 525,600 MINUTES. HOW DO YOU MEASURE A YEAR? IN CHICKEN WINGS.'", 'RILEY: He won a WING EATING competition?', "JAMES: Of course he did. Let's move."],
  },
  charlotte: {
    name: 'THE CHARLOTTE', theme: 'ship', type: 'puzzle', label: 'THE CHARLOTTE',
    pick: ['JAMES: The secret lies with Charlotte.', "RILEY: Charlotte's a SHIP? In the ARCTIC?", 'JAMES: Pack a coat.'],
    map: [
      'WWWWWWWWWWWWWWWW', 'W##############W', 'W#............#W', 'W#............#W', 'W#............#W',
      'W#............#W', 'W#............#W', 'W#............#W', 'W#............#W', 'W#............#W',
      'W#............#W', 'W#............#W', 'W##############W', 'WWWWWWWWWWWWWWWW'],
    start: { x: 7, y: 10 },
    enemies: [],
    objects: [
      { kind: 'barrel', x: 3, y: 3, w: 1, h: 1, item: 'rice', lines: ['RILEY: Gluten-free rice cakes.', 'JAMES: Nobody ever wept for rice cakes.'] },
      { kind: 'barrel', x: 7, y: 2, w: 1, h: 1, item: 'haggis', lines: ["JAMES: HAGGIS. Sheep's heart, liver and lungs, boiled in a stomach. PERFECT.", "RILEY: I'm gonna be sick."] },
      { kind: 'barrel', x: 12, y: 3, w: 1, h: 1, item: 'gunpowder', lines: ['RILEY: Gunpowder. A whole keg of it. With a fuse.', "JAMES: Don't punch that one.", 'RILEY: Why would you even SAY that? Now I want you to.'] },
      { kind: 'barrel', x: 4, y: 7, w: 1, h: 1, item: 'lasagna', lines: ['JAMES: LASAGNA. Frozen solid since 1812. Still the best thing on this ship.', 'RILEY: Are you crying?', 'JAMES: No.'] },
      { kind: 'barrel', x: 11, y: 7, w: 1, h: 1, item: 'pipe', lines: ['RILEY: A meerschaum pipe! Ooh, fancy.', "JAMES: That's for later. Keep looking."] },
    ],
    intro: ['JAMES: The Charlotte. Lost in the Arctic for two hundred years.', "RILEY: The hold is full of barrels. And a note...", "'FIND THE TWO RATIONS THAT WOULD MAKE JAMES GATES WEEP WITH JOY.'", 'JAMES: Only two? Cruel.'],
    solved: ['JAMES: Haggis AND lasagna. The Charlotte provides.', 'RILEY: Look, the pipe! There\'s something carved on the stem.'],
    clue: ["'ONE MONTH IN, SHE FLEW HIM TO IRELAND ON A WHIM. HE CAME HOME WITH THE GIRL AND A GUITAR.'", "'LITTLE IRISH STILL SINGS. SO DOES HE. OPEN MICS. STAGES. THE CAR. ESPECIALLY THE CAR.'", 'RILEY: He filmed himself singing in the car? For INSTAGRAM?', 'JAMES: Singing selfies, Riley. They were a hit.', 'RILEY: How many guitars does one man need?', 'JAMES: One more. Always one more.'],
  },
  trinity: {
    name: 'TRINITY CHURCH', theme: 'crypt', type: 'combat', label: 'TRINITY CHURCH',
    pick: ['JAMES: Trinity Church. Parkington Lane.', 'RILEY: Who wants to go down the creepy tunnel inside the tomb first?'],
    map: [
      '################', '#S............S#', '#..............#', '#..............#', '#..............#',
      '#.S..........S.#', '#..............#', '#..............#', '#.S..........S.#', '#..............#',
      '#..............#', '#.S..........S.#', '#..............#', '################'],
    start: { x: 7, y: 11 },
    enemies: [{ x: 7, y: 4, kind: 'shaw' }, { x: 3, y: 6, kind: 'goon' }, { x: 12, y: 6, kind: 'goon' }],
    objects: [{ kind: 'tomb', x: 7, y: 1, w: 2, h: 1 }],
    intro: ['JAMES: Trinity Church. The crypt is right below us.', 'RILEY: Shaw. And friends. Ian sends his regards.', "SHAW: You're not gonna get past us, Gates.", "JAMES: I'm gonna get past you."],
    cleared: ['JAMES: The inscription on the tomb. Read it, Riley.', "RILEY: YOU read it. You're the one who likes this stuff."],
    locked: 'SHAW: Not so fast.',
    clue: ["'FROM FLAGSTAFF'S THIN AIR HE SENT RUNNERS TO THE WORLD CHAMPIONSHIPS AND THE PARIS OLYMPICS.'", "'HE STILL BELIEVES SUB-2:30 IS EASIER AT 7,000 FEET. IT IS NOT. IT IS NOT, JAMES.'", 'RILEY: Is it easier?', "JAMES: It's 7,000 feet of pure oxygen debt, Riley. It's a DREAM."],
  },
  okinawa: {
    name: 'OKINAWA', theme: 'garden', type: 'combat', label: 'OKINAWA, MIYAGI-DO',
    pick: ['JAMES: Okinawa. Miyagi-Do.', "RILEY: That's not in National Treasure, Ben.", 'JAMES: It is in MY National Treasure.'],
    map: [
      '################', '#..T........T..#', '#..............#', '#.....WWWW.....#', '#.....WWWW.....#',
      '#..............#', '#.T..........T.#', '#..............#', '#..............#', '#.T..........T.#',
      '#..............#', '#..............#', '#..............#', '################'],
    start: { x: 7, y: 11 },
    enemies: [{ x: 7, y: 6, kind: 'chozen' }, { x: 3, y: 4, kind: 'thug' }, { x: 12, y: 4, kind: 'thug' }],
    objects: [{ kind: 'bonsai', x: 7, y: 1, w: 2, h: 1 }],
    intro: ["JAMES: Mr. Miyagi's garden. Okinawa. I've seen this place a thousand times.", 'RILEY: A thousand? You watch Karate Kid II while you WORK?', 'JAMES: For inspiration, Riley.', 'CHOZEN: Now you cross me, Gates. Live or die, man?', 'JAMES: ...Punch.'],
    cleared: ['JAMES: (honk)', 'RILEY: Did you just honk his nose?', 'JAMES: Miyagi-Do. Now, the bonsai. It needs trimming. Wax on. Wax off.'],
    locked: 'CHOZEN: You think you walk past me? HA!',
    solved: ['The bonsai is perfect. Something glints in the pot.', "JAMES: 'First learn stand, then learn fly. Nature rule, not mine.'", 'RILEY: Is that from a movie?', "JAMES: It's from ALL the movies, Riley."],
    clue: ["'HE GROWS BONSAI. HE HOARDS RARE MIYAGI RELICS. HE QUOTES KARATE KID II IN HIS SLEEP.'", "'HEY YOU GUYS! HE LOVES THE GOONIES, WILLOW, AND EVERY DORKY 80s MOVIE EVER MADE.'", 'RILEY: Willow? The one with the baby?', 'JAMES: Elora Danan, Riley. Show some respect.', 'RILEY: Goonies never say die.', 'JAMES: Now THAT is a clue.'],
  },
  treasure: {
    name: 'TEMPLAR TREASURE', theme: 'vault', type: 'final', label: 'DESCEND BENEATH TRINITY',
    pick: ['JAMES: Five clues. One left. The treasure is below.', 'RILEY: Hold on, let me take in this moment. This is cool. Is this how you feel all the time?', 'JAMES: Every day, Riley.'],
    map: [
      '################', '#GG..........GG#', '#G............G#', '#..............#', '#..............#',
      '#..............#', '#..............#', '#..............#', '#..............#', '#..............#',
      '#G............G#', '#GG..........GG#', '#..............#', '################'],
    start: { x: 7, y: 11 },
    enemies: [{ x: 7, y: 5, kind: 'ian' }],
    objects: [{ kind: 'chest', x: 7, y: 1, w: 2, h: 1 }],
    intro: ["JAMES: The Templar treasure. It's real. It's all real.", 'IAN: Hello, Ben. Or should I say... James? I\'ll take it from here.', "JAMES: You're gonna lose, Ian.", 'IAN: I never lose.'],
    cleared: ['IAN: ...okay. You win. Enjoy your treasure. Someone\'s gotta go to prison.', 'RILEY: Ben! Two dogs just came out of the tunnel!', 'JAMES: Nub Nub? Dumbledore? How did you... never mind. Open the chest.'],
    locked: "IAN: Touch that chest and I'll... okay, I'm mostly bluffing.",
  },
};
const INTRO = [
  'FLAGSTAFF, ARIZONA. 7,000 FEET. OCTOBER 1ST.',
  'JAMES GATES: RUNNING COACH. DECATHLETE. PROTECTOR OF HISTORY.',
  '...AND A MAN WHO CANNOT, FOR THE LIFE OF HIM, RUN AN EASY DAY EASY.',
  'TONIGHT A NOTE ARRIVED, TUCKED INSIDE A SWEATY SINGLET:',
  "'THE TREASURE IS REAL. FIND THE SIX CLUES. NOBODY'S GOTTA GO TO PRISON.'",
  'JAMES: I know what I have to do.',
  "JAMES: I'm gonna steal the Declaration of Independence.",
  "RILEY: ...Sure. Great. Let's do that.",
  "D-PAD: move. A: punch / talk. B: run. (It's an easy day. Don't.)",
];
const TREASURE_CARDS = [
  ["IT'S NOT A CLUE.", '', "IT'S THE TREASURE."],
  ['HAPPY 45TH BIRTHDAY,', '', 'JAMES!'],
  ['YOU AND HEATHER', 'ARE GOING TO', '', 'DISNEYLAND'],
  ['JANUARY 6 - 11, 2027', '', 'GRAND CALIFORNIAN', 'HOTEL'],
  ['EVERY RIDE.', 'ALL DAY.', 'AS MANY TIMES AS', 'WE POSSIBLY CAN.'],
  ['NUB NUB AND', 'DUMBLEDORE HAVE', 'APPROVED THIS TRIP.'],
  ['WITH ALL MY LOVE,', '', 'HEATHER'],
  ['THE END', '', 'PRESS A TO', 'PLAY AGAIN'],
];

// ---------------------------------------------------------------- STATE
let state = 'title';
let frame = 0;
let roomId = null, room = null, roomCanvas = null;
let player = null, enemies = [], objects = [], particles = [], dogs = [];
let visited = new Set(), clues = 0, jokeIdx = 0;
let dlg = null, choice = null, banner = 0, shake = 0, popup = null, sprintT = 0, deadT = 0, deadReason = 'fight', flashT = 0;
let fadeT = 0, fadeDir = 0, fadeCb = null;
let treasure = null;

function paginate(lines) {
  const out = [];
  for (const line of lines) { const rows = wrap(line, 28); for (let i = 0; i < rows.length; i += 4) out.push(rows.slice(i, i + 4).join(' ')); }
  return out;
}
function say(lines, cb) { dlg = { lines: paginate(lines), i: 0, ch: 0, cb }; state = 'dialog'; }
function choose(opts, cb) { choice = { opts, sel: 0, cb }; state = 'choice'; }
function startFade(cb) { fadeDir = 1; fadeT = 0; fadeCb = cb; state = 'fade'; }

function loadRoom(id) {
  roomId = id; room = ROOMS[id];
  player = { x: room.start.x * T, y: room.start.y * T, dir: 'up', anim: 0, hp: 3, inv: 0, punch: 0, kb: null };
  enemies = room.enemies.map(e => ({ x: e.x * T, y: e.y * T, kind: e.kind, hp: e.kind === 'ian' ? 8 : e.kind === 'chozen' ? 5 : 3, maxhp: e.kind === 'ian' ? 8 : e.kind === 'chozen' ? 5 : 3, dir: 'down', anim: 0, flash: 0, kb: null, dead: false, speed: e.kind === 'ian' ? 0.8 : e.kind === 'chozen' ? 0.7 : 0.6, wiggle: 0, stun: 0, sx: e.x * T, sy: e.y * T }));
  objects = room.objects.map(o => Object.assign({}, o, { rx: o.x * T, ry: o.y * T, rw: o.w * T, rh: o.h * T, state: 0 }));
  particles = []; dogs = [];
  room.solvedFlag = false; room.clearedFlag = enemies.length === 0; room.bellCount = 0; room.found = new Set();
  sprintT = 0; popup = null;
  renderRoom();
}
function renderRoom() {
  const th = THEMES[room.theme];
  roomCanvas = document.createElement('canvas'); roomCanvas.width = W; roomCanvas.height = MH * T;
  const g = roomCanvas.getContext('2d');
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const ch = room.map[ty][tx], x = tx * T, y = ty * T;
    // floor base
    g.fillStyle = ((tx + ty) & 1) ? th.floor : th.floor2; g.fillRect(x, y, T, T);
    g.fillStyle = th.floor2; g.fillRect(x + 3, y + 3, 1, 1); g.fillRect(x + 11, y + 12, 1, 1);
    if (ch === '#') {
      g.fillStyle = th.wall; g.fillRect(x, y, T, T);
      g.fillStyle = th.wallDark;
      g.fillRect(x, y + 7, T, 1); g.fillRect(x, y + 15, T, 1);
      g.fillRect(x + ((ty & 1) ? 4 : 11), y, 1, 7); g.fillRect(x + ((ty & 1) ? 11 : 4), y + 8, 1, 7);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x, y, T, 1);
    } else if (ch === '~') {
      g.fillStyle = th.carpet; g.fillRect(x, y, T, T);
      g.fillStyle = 'rgba(255,220,120,0.35)'; g.fillRect(x + 2, y + 2, 12, 1); g.fillRect(x + 2, y + 13, 12, 1);
    } else if (ch === 'W') {
      g.fillStyle = th.water || '#8cf'; g.fillRect(x, y, T, T);
      g.fillStyle = th.water2 || '#6ae'; g.fillRect(x + ((tx & 1) ? 2 : 8), y + 5, 5, 1); g.fillRect(x + ((tx & 1) ? 9 : 3), y + 12, 4, 1);
    } else if (ch === 'P') {
      g.fillStyle = th.deco; g.fillRect(x + 4, y, 8, T);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 10, y, 2, T);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 5, y, 1, T);
      g.fillStyle = th.deco; g.fillRect(x + 2, y, 12, 2); g.fillRect(x + 2, y + 14, 12, 2);
    } else if (ch === 'S') {
      g.fillStyle = '#8f9498'; g.fillRect(x + 3, y + 3, 10, 12);
      g.fillStyle = '#b8bcc0'; g.fillRect(x + 4, y + 1, 8, 3); g.fillRect(x + 4, y + 4, 1, 10);
      g.fillStyle = '#4a4e52'; g.fillRect(x + 6, y + 6, 4, 1); g.fillRect(x + 7, y + 5, 2, 4);
    } else if (ch === 'G') {
      g.fillStyle = '#f2c14e'; g.fillRect(x + 2, y + 8, 12, 7); g.fillRect(x + 5, y + 4, 6, 4);
      g.fillStyle = '#fff3b0'; g.fillRect(x + 6, y + 5, 2, 1); g.fillRect(x + 3, y + 9, 2, 1); g.fillRect(x + 10, y + 11, 2, 1);
      g.fillStyle = '#a8801e'; g.fillRect(x + 2, y + 14, 12, 1);
    } else if (ch === 'T') {
      g.fillStyle = '#5a3a1a'; g.fillRect(x + 6, y + 9, 4, 7);
      g.fillStyle = '#2e6b1e'; g.fillRect(x + 2, y + 3, 12, 8); g.fillRect(x + 4, y + 1, 8, 2);
      g.fillStyle = '#3f8a2a'; g.fillRect(x + 4, y + 3, 5, 3); g.fillRect(x + 3, y + 7, 3, 2);
    } else if (ch === 'X') {
      g.fillStyle = '#7a5230'; g.fillRect(x + 1, y + 2, 14, 13);
      g.fillStyle = '#5a3a1e'; g.fillRect(x + 1, y + 2, 14, 1); g.fillRect(x + 1, y + 8, 14, 1); g.fillRect(x + 1, y + 14, 14, 1); g.fillRect(x + 1, y + 2, 1, 13); g.fillRect(x + 14, y + 2, 1, 13);
    }
  }
}
function tileSolid(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
  return '#PSWGXT'.indexOf(room.map[ty][tx]) >= 0;
}
function rectHit(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
function collides(e) {
  const bx = e.x + 3, by = e.y + 8, bw = 10, bh = 8;
  for (const [px, py] of [[bx, by], [bx + bw - 1, by], [bx, by + bh - 1], [bx + bw - 1, by + bh - 1]]) if (tileSolid(Math.floor(px / T), Math.floor(py / T))) return true;
  for (const o of objects) if (rectHit(bx, by, bw, bh, o.rx, o.ry, o.rw, o.rh)) return true;
  return false;
}
function tryMove(e, dx, dy) {
  let moved = false;
  if (dx) { e.x += dx; if (collides(e)) e.x -= dx; else moved = true; }
  if (dy) { e.y += dy; if (collides(e)) e.y -= dy; else moved = true; }
  return moved;
}
function facingObject() {
  const d = DIRS[player.dir];
  const px = player.x + 8 + d.x * 14, py = player.y + 8 + d.y * 14;
  return objects.find(o => px >= o.rx - 4 && px < o.rx + o.rw + 4 && py >= o.ry - 4 && py < o.ry + o.rh + 4) || null;
}
const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

function spawnPoof(x, y, col) { for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 1.5; particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 20 + Math.random() * 15, col: col || '#ccc', size: 2 + Math.random() * 2 }); } }
function spawnText(x, y, s, col) { particles.push({ x, y, vx: 0, vy: -0.5, life: 30, text: s, col: col || '#ff0' }); }

// ---------------------------------------------------------------- GAME FLOW
function startGame() {
  visited = new Set(); clues = 0; jokeIdx = 0; treasure = null;
  loadRoom('archives');
  say(INTRO, () => say(room.intro));
}
function makeChoices() {
  const remaining = MIDDLE.filter(id => !visited.has(id));
  const opts = remaining.map(id => ({ label: ROOMS[id].label, next: id, response: ROOMS[id].pick }));
  if (!opts.length) opts.push({ label: ROOMS.treasure.label, next: 'treasure', response: ROOMS.treasure.pick });
  if (opts.length < 3) { const j = JOKES[jokeIdx++ % JOKES.length]; opts.push({ label: j.label, next: opts[0].next, response: j.response }); }
  return opts;
}
function findClue() {
  visited.add(roomId); clues++;
  SFX.clue(); banner = 110; shake = 24; state = 'banner';
}
function afterBanner() {
  say(['JAMES: IT\'S A CLUE!'].concat(room.clue), () => {
    choose(makeChoices(), o => { say(o.response, () => goRoom(o.next)); });
  });
}
function goRoom(id) {
  startFade(() => { loadRoom(id); fadeDir = -1; fadeT = 30; say(room.intro); });
}
function interact(o) {
  if (o.kind === 'case' || o.kind === 'tomb') {
    if (!room.clearedFlag) { SFX.nope(); say([room.locked]); return; }
    SFX.open(); o.state = 1; findClue();
  } else if (o.kind === 'chest') {
    if (!room.clearedFlag) { SFX.nope(); say([room.locked]); return; }
    SFX.open(); o.state = 1; clues++;
    setTimeout(() => SFX.fanfare(), 200);
    startFade(() => { treasure = { card: 0, t: 0, fw: [] }; state = 'treasure'; fadeDir = -1; fadeT = 30; });
  } else if (o.kind === 'bonsai') {
    if (!room.clearedFlag) { SFX.nope(); say([room.locked]); return; }
    if (room.solvedFlag) { say(['RILEY: Ben. The tree is DONE.']); return; }
    room.bellCount++; SFX.blip(); o.state = 8; o.trim = room.bellCount;
    spawnText(o.rx + 16, o.ry - 6, room.bellCount % 2 ? 'WAX ON' : 'WAX OFF', '#bfffb0');
    if (room.bellCount >= 6) { room.solvedFlag = true; say(room.solved, findClue); }
  } else if (o.kind === 'bell') {
    if (room.solvedFlag) { say(['RILEY: Ben, that\'s enough bell.']); return; }
    room.bellCount++; SFX.bell(); o.state = 8; shake = 4;
    spawnText(o.rx + 8, o.ry - 6, 'DONG! ' + room.bellCount + '/10', '#ffd700');
    if (room.bellCount >= 10) { room.solvedFlag = true; setTimeout(() => { say(room.solved, findClue); }, 500); state = 'wait'; }
  } else if (o.kind === 'barrel') {
    if (o.state && o.item === 'gunpowder') { explode(o); return; }
    if (o.state) { say(['JAMES: Already checked that one.']); return; }
    o.state = 1; SFX.open();
    const good = o.item === 'haggis' || o.item === 'lasagna';
    if (good) room.found.add(o.item);
    const lines = o.lines.slice();
    say(lines, () => {
      if (good) spawnText(o.rx + 8, o.ry - 4, 'YUM!', '#8f8');
      if (room.found.size === 2 && !room.solvedFlag) { room.solvedFlag = true; say(room.solved, findClue); }
    });
  }
}
function onRoomCleared() {
  room.clearedFlag = true;
  if (room.cleared) say(room.cleared, () => { if (roomId === 'treasure') spawnDogs(); });
}
function spawnDogs() {
  dogs = [{ spr: SPR.nubnub, x: 4 * T, y: 2 * T, t: 0 }, { spr: SPR.dumbledore, x: 10 * T, y: 2 * T, t: 30 }];
  spawnPoof(4 * T + 8, 2 * T + 8, '#fff'); spawnPoof(10 * T + 8, 2 * T + 8, '#fff');
}
function respawn() { // hero comes back at full health; enemies keep the damage they took
  player.x = room.start.x * T; player.y = room.start.y * T; player.hp = 3; player.inv = 90; player.kb = null; player.punch = 0;
  for (const e of enemies) { if (!e.dead) { e.x = e.sx; e.y = e.sy; e.kb = null; e.flash = 0; e.stun = 0; } }
}
function playerDied() {
  SFX.die(); state = 'dead'; deadT = 70; deadReason = 'fight'; player.hp = 0;
}
const EXPLODE_LINES = ['RILEY: You punched the gunpowder.', 'JAMES: I punched the gunpowder.', "RILEY: Someone's gotta go to the hospital, Ben.", 'JAMES: ...Okay. From the top.'];
function explode(o) {
  SFX.boom(); tone(50, 0.9, 'sawtooth', 0.2, 0, -30); tone(900, 0.4, 'square', 0.1, 0.05, -800);
  shake = 40; flashT = 14; player.hp = 0; state = 'dead'; deadT = 100; deadReason = 'explode';
  const cx = o.rx + 8, cy = o.ry + 8;
  for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3; particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 30 + Math.random() * 30, col: ['#ff3', '#f80', '#f33', '#444', '#fff'][i % 5], size: 2 + Math.random() * 4 }); }
  spawnText(cx, cy - 12, 'KABOOM!', '#f80');
  o.boom = true; player.gone = true;
}

// ---------------------------------------------------------------- UPDATE
function update() {
  frame++;
  if (shake > 0) shake--;
  if (flashT > 0) flashT--;
  if (popup && --popup.t <= 0) popup = null;
  for (const o of objects) if (o.state > 1) o.state--;
  // fade
  if (fadeDir === 1) { fadeT += 2; if (fadeT >= 30) { fadeT = 30; fadeDir = 0; const cb = fadeCb; fadeCb = null; if (cb) cb(); } }
  else if (fadeDir === -1) { fadeT -= 2; if (fadeT <= 0) { fadeT = 0; fadeDir = 0; } }
  // particles
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.life--; if (!p.text) p.vy += 0.03; else if (p.y < 2) p.y = 2; }
  particles = particles.filter(p => p.life > 0);
  for (const d of dogs) { d.t++; }

  const aPress = jp.a || (tap && state !== 'play' && state !== 'choice');
  switch (state) {
    case 'title':
      if (aPress) { SFX.select(); startGame(); }
      break;
    case 'dialog': {
      const line = dlg.lines[dlg.i];
      if (dlg.ch < line.length) { dlg.ch += 2; if (frame % 3 === 0) SFX.blip(); }
      if (aPress) {
        if (dlg.ch < line.length) dlg.ch = line.length;
        else { dlg.i++; dlg.ch = 0; if (dlg.i >= dlg.lines.length) { const cb = dlg.cb; dlg = null; state = 'play'; if (cb) cb(); } }
      }
      break;
    }
    case 'choice':
      if (jp.up) { choice.sel = (choice.sel + choice.opts.length - 1) % choice.opts.length; SFX.blip(); }
      if (jp.down) { choice.sel = (choice.sel + 1) % choice.opts.length; SFX.blip(); }
      if (tap) { const box = choiceBox(); const idx = Math.floor((tap.y - box.y - 18) / 12); if (idx >= 0 && idx < choice.opts.length) { choice.sel = idx; jp.a = true; } }
      if (jp.a) { SFX.select(); const c = choice; choice = null; state = 'play'; c.cb(c.opts[c.sel]); }
      break;
    case 'banner':
      if (--banner <= 0) afterBanner();
      break;
    case 'dead':
      if (--deadT <= 0) { if (deadReason === 'explode') say(EXPLODE_LINES, () => loadRoom(roomId)); else say(["JAMES: ...You're gonna lose.", "JAMES: No. I'm NOT gonna lose."], respawn); }
      break;
    case 'treasure':
      updateTreasure(aPress);
      break;
    case 'play':
      updatePlay();
      break;
  }
  jp = {}; tap = null;
}
function updatePlay() {
  const p = player;
  if (p.inv > 0) p.inv--;
  if (p.punch > 0) p.punch--;
  // knockback
  if (p.kb) { tryMove(p, p.kb.x, p.kb.y); if (--p.kb.t <= 0) p.kb = null; }
  else {
    let dx = 0, dy = 0;
    if (keys.left) dx = -1; else if (keys.right) dx = 1;
    if (keys.up) dy = -1; else if (keys.down) dy = 1;
    if (dx && dy) { dx *= 0.75; dy *= 0.75; }
    const sprint = keys.b ? 1.8 : 1;
    if (dx || dy) {
      if (Math.abs(dx) >= Math.abs(dy)) p.dir = dx < 0 ? 'left' : 'right'; else p.dir = dy < 0 ? 'up' : 'down';
      if (p.punch <= 0) { tryMove(p, dx * sprint, dy * sprint); p.anim++; }
      if (keys.b) { sprintT++; if (sprintT > 70) { popup = { t: 150, big: 'EASY DAY, JAMES!!', small: '- HEATHER' }; SFX.nope(); sprintT = -240; } }
    }
    if (jp.a) {
      const o = facingObject();
      if (o) interact(o);
      else if (p.punch <= 0) {
        p.punch = 12; SFX.punch();
        const d = DIRS[p.dir];
        const hx = p.x + d.x * 13, hy = p.y + d.y * 13;
        for (const e of enemies) if (!e.dead && rectHit(hx, hy, 16, 16, e.x + 2, e.y + 2, 12, 12)) {
          e.hp--; e.flash = 8; e.kb = { x: d.x * 3, y: d.y * 3, t: 8 }; SFX.hit();
          spawnText(e.x + 8, e.y - 4, ['POW!', 'BAM!', 'WHAM!'][Math.floor(Math.random() * 3)]);
          if (e.hp <= 0) { e.dead = true; SFX.die(); spawnPoof(e.x + 8, e.y + 8, e.kind === 'ian' ? '#f2c14e' : '#bbb'); }
        }
        if (enemies.length && enemies.every(e => e.dead) && !room.clearedFlag) onRoomCleared();
      }
    }
  }
  // enemies
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash--;
    if (e.kb) { tryMove(e, e.kb.x, e.kb.y); if (--e.kb.t <= 0) e.kb = null; continue; }
    if (e.stun > 0) { e.stun--; continue; }
    const ddx = p.x - e.x, ddy = p.y - e.y, dist = Math.hypot(ddx, ddy) || 1;
    if (dist < 150) {
      let mx = ddx / dist * e.speed, my = ddy / dist * e.speed;
      if (e.wiggle > 0) { e.wiggle--; const t = mx; mx = -my * e.wdir; my = t * e.wdir; }
      const moved = tryMove(e, mx, my);
      if (!moved && e.wiggle <= 0) { e.wiggle = 20; e.wdir = Math.random() < 0.5 ? 1 : -1; }
      e.anim++;
      if (Math.abs(ddx) > Math.abs(ddy)) e.dir = ddx < 0 ? 'left' : 'right'; else e.dir = ddy < 0 ? 'up' : 'down';
    }
    if (p.inv <= 0 && rectHit(p.x + 3, p.y + 4, 10, 12, e.x + 3, e.y + 4, 10, 12)) {
      p.hp--; p.inv = 90; SFX.hurt(); shake = 6;
      const kx = Math.sign(p.x - e.x) || 1, ky = Math.sign(p.y - e.y);
      p.kb = { x: kx * 3, y: ky * 3, t: 8 };
      e.kb = { x: -kx * 2, y: -ky * 2, t: 8 }; e.stun = 26;
      if (p.hp <= 0) { playerDied(); return; }
    }
  }
}
function updateTreasure(aPress) {
  const t = treasure; t.t++;
  if (t.t % 35 === 0 || t.fw.length === 0) { t.fw.push({ x: 20 + Math.random() * (W - 40), y: H - 40, vy: -3 - Math.random() * 1.5, life: 30 + Math.random() * 20, col: ['#ff5', '#f5f', '#5ff', '#f88', '#8f8'][Math.floor(Math.random() * 5)], burst: false }); }
  for (const f of t.fw) {
    if (!f.burst) { f.y += f.vy; f.life--; if (f.life <= 0) { f.burst = true; f.parts = []; for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, s = 1 + Math.random(); f.parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 40 + Math.random() * 20 }); } if (AC && frame % 2 === 0) SFX.boom(); } }
    else { for (const p of f.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life--; } f.parts = f.parts.filter(p => p.life > 0); }
  }
  t.fw = t.fw.filter(f => !f.burst || f.parts.length);
  if (t.card < TREASURE_CARDS.length - 1) {
    if (aPress || t.t > 260) { t.card++; t.t = 0; SFX.select(); }
  } else if (aPress) { state = 'title'; }
}

// ---------------------------------------------------------------- DRAW
function draw() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (state === 'title') { drawTitle(); return; }
  if (state === 'treasure') { drawTreasure(); drawFade(); return; }
  const sx = shake ? Math.round((Math.random() - 0.5) * 4) : 0, sy = shake ? Math.round((Math.random() - 0.5) * 4) : 0;
  ctx.save(); ctx.translate(sx, HUD + sy);
  ctx.drawImage(roomCanvas, 0, 0);
  for (const o of objects) drawObject(o);
  const ents = [];
  for (const e of enemies) if (!e.dead) ents.push({ y: e.y, f: () => drawEnemy(e) });
  for (const d of dogs) ents.push({ y: d.y, f: () => drawDog(d) });
  if (!player.gone && (state !== 'dead' || deadT % 8 < 4)) ents.push({ y: player.y, f: drawPlayer });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.f());
  for (const p of particles) {
    if (p.text) { textO(p.text, Math.round(p.x), Math.round(p.y), p.col, 8, 'center'); }
    else { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); }
  }
  ctx.restore();
  drawHUD();
  if (popup) drawPopup();
  if (state === 'dialog') drawDialog();
  if (state === 'choice') drawChoice();
  if (state === 'banner') drawBanner();
  drawFade();
}
function drawFade() {
  if (flashT > 0) { ctx.fillStyle = 'rgba(255,240,200,' + (flashT / 14) + ')'; ctx.fillRect(0, 0, W, H); }
  if (fadeT > 0) { ctx.fillStyle = 'rgba(0,0,0,' + (fadeT / 30) + ')'; ctx.fillRect(0, 0, W, H); }
}
function drawPlayer() {
  const p = player;
  if (p.inv > 0 && (p.inv % 6) < 3) return;
  const set = SPR.hero[p.dir];
  const fr = set[Math.floor(p.anim / 8) % set.length];
  ctx.drawImage(fr, Math.round(p.x), Math.round(p.y));
  if (p.punch > 0) {
    const fp = { down: [6, 15], up: [6, -3], right: [14, 8], left: [-2, 8] }[p.dir];
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(Math.round(p.x) + fp[0] - 1, Math.round(p.y) + fp[1] - 1, 6, 6);
    ctx.fillStyle = '#f1c27d'; ctx.fillRect(Math.round(p.x) + fp[0], Math.round(p.y) + fp[1], 4, 4);
  }
}
function drawEnemy(e) {
  const S = SPR[e.kind];
  const set = e.flash > 0 && e.flash % 2 ? S.white[e.dir] : S[e.dir];
  const fr = set[Math.floor(e.anim / 8) % set.length];
  const x = Math.round(e.x), y = Math.round(e.y);
  ctx.drawImage(fr, x, y);
  if (e.kind === 'goon' && e.dir === 'down' && !(e.flash > 0 && e.flash % 2)) ctx.drawImage(GLASSES, x + 5, y + 4);
  if (e.kind === 'chozen' && !(e.flash > 0 && e.flash % 2)) ctx.drawImage(HEADBAND, x + 4, y + 2);
  if (e.kind === 'ian') { // boss health bar
    ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 5, 20, 4);
    ctx.fillStyle = '#e33'; ctx.fillRect(x - 1, y - 4, Math.round(18 * e.hp / e.maxhp), 2);
  }
}
function drawDog(d) { const bob = Math.floor(d.t / 12) % 2; ctx.drawImage(d.spr, Math.round(d.x), Math.round(d.y) + bob); }
function drawObject(o) {
  const x = o.rx, y = o.ry;
  if (o.kind === 'case') {
    ctx.fillStyle = '#5a5040'; ctx.fillRect(x, y + 12, 32, 4);
    ctx.fillStyle = '#8fd3ff'; ctx.fillRect(x + 1, y - 2, 30, 14);
    ctx.fillStyle = '#e8dcb0'; ctx.fillRect(x + 4, y, 24, 10);
    ctx.fillStyle = '#7a6a40'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 6, y + 2 + i * 2, 20 - (i == 3 ? 8 : 0), 1);
    if (o.state) { ctx.fillStyle = '#ffd700'; ctx.fillRect(x + 12, y + 3, 8, 4); }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 2, y - 1, 1, 12); ctx.fillRect(x + 2, y - 1, 28, 1);
  } else if (o.kind === 'bell') {
    const sw = o.state > 1 ? Math.round(Math.sin(o.state) * 2) : 0;
    ctx.fillStyle = '#4a2a12'; ctx.fillRect(x + 2, y, 28, 3); ctx.fillRect(x + 2, y, 3, 32); ctx.fillRect(x + 27, y, 3, 32);
    ctx.fillStyle = '#c9a25f'; ctx.fillRect(x + 11 + sw, y + 4, 10, 6); ctx.fillRect(x + 8 + sw, y + 10, 16, 12);
    ctx.fillStyle = '#e8c878'; ctx.fillRect(x + 13 + sw, y + 5, 2, 15);
    ctx.fillStyle = '#7a5a2a'; ctx.fillRect(x + 8 + sw, y + 22, 16, 3); ctx.fillRect(x + 12 + sw, y + 15, 1, 6);
    ctx.fillStyle = '#3a2a12'; ctx.fillRect(x + 14 + sw, y + 25, 4, 3);
  } else if (o.kind === 'barrel' && o.item === 'gunpowder') {
    if (o.boom) { ctx.fillStyle = '#1a1208'; ctx.fillRect(x + 1, y + 3, 14, 11); ctx.fillStyle = '#3a2a10'; ctx.fillRect(x + 4, y + 6, 8, 5); return; }
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x + 2, y + 3, 12, 12);
    ctx.fillStyle = '#111'; ctx.fillRect(x + 2, y + 5, 12, 1); ctx.fillRect(x + 2, y + 12, 12, 1);
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(x + 6, y + 8, 4, 1); ctx.fillRect(x + 7, y + 7, 2, 3);
    ctx.fillStyle = '#c9a25f'; ctx.fillRect(x + 8, y, 1, 3); ctx.fillRect(x + 9, y - 1, 2, 1);
    if (frame % 20 < 10) { ctx.fillStyle = '#ff5'; ctx.fillRect(x + 10, y - 2, 2, 2); }
  } else if (o.kind === 'barrel') {
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x + 2, y + 1, 12, 14);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 2, y + 4, 12, 1); ctx.fillRect(x + 2, y + 11, 12, 1);
    ctx.fillStyle = '#a87a4a'; ctx.fillRect(x + 4, y + 1, 1, 14);
    if (o.state) { ctx.fillStyle = '#2a1a0a'; ctx.fillRect(x + 4, y + 2, 8, 2); if (o.item === 'haggis' || o.item === 'lasagna') { ctx.fillStyle = '#8f8'; ctx.fillRect(x + 6, y + 6, 4, 4); } }
  } else if (o.kind === 'bonsai') {
    const trim = o.trim || 0, wob = o.state > 1 ? (o.state % 2) : 0;
    ctx.fillStyle = '#7a5230'; ctx.fillRect(x + 2, y + 12, 28, 4);
    ctx.fillStyle = '#8a3a2a'; ctx.fillRect(x + 10, y + 6, 12, 6); ctx.fillStyle = '#a84a3a'; ctx.fillRect(x + 9, y + 5, 14, 2);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 15 + wob, y - 2, 2, 8); ctx.fillRect(x + 12 + wob, y - 4, 4, 2); ctx.fillRect(x + 17 + wob, y - 7, 3, 2);
    ctx.fillStyle = trim >= 6 ? '#3fa82a' : '#2e6b1e';
    ctx.fillRect(x + 8 + wob, y - 7, 8, 4); ctx.fillRect(x + 16 + wob, y - 10, 9, 4); ctx.fillRect(x + 11 + wob, y - 1, 6, 2);
    if (trim < 6) { ctx.fillStyle = '#6a8a3a'; ctx.fillRect(x + 4 + wob, y - 9, 3, 3); ctx.fillRect(x + 25 + wob, y - 4, 4, 3); ctx.fillRect(x + 19 + wob, y - 13, 3, 3); }
    if (trim >= 6) { ctx.fillStyle = '#ffd700'; ctx.fillRect(x + 14, y + 8, 4, 3); }
  } else if (o.kind === 'tomb') {
    ctx.fillStyle = '#6a6e72'; ctx.fillRect(x, y + 2, 32, 14);
    ctx.fillStyle = '#9a9ea2'; ctx.fillRect(x + 2, y - 2, 28, 5);
    ctx.fillStyle = '#3a3e42'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 5, y + 5 + i * 3, 22, 1);
    if (o.state) { ctx.fillStyle = '#ffd700'; ctx.fillRect(x + 12, y + 6, 8, 5); }
  } else if (o.kind === 'chest') {
    ctx.fillStyle = '#7a4a1e'; ctx.fillRect(x + 2, y + 4, 28, 12);
    ctx.fillStyle = o.state ? '#3a2a12' : '#9a6a2e'; ctx.fillRect(x + 2, y, 28, 6);
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(x + 2, y + 6, 28, 2); ctx.fillRect(x + 14, y + 5, 4, 5);
    if (o.state) { ctx.fillStyle = '#fff3b0'; ctx.fillRect(x + 6, y + 1, 20, 4); }
    else if (room.clearedFlag && frame % 30 < 15) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 8, y + 2, 2, 2); ctx.fillRect(x + 22, y + 3, 2, 2); }
  }
}
function drawHUD() {
  ctx.fillStyle = '#101018'; ctx.fillRect(0, 0, W, HUD);
  ctx.fillStyle = '#333'; ctx.fillRect(0, HUD - 1, W, 1);
  for (let i = 0; i < 3; i++) ctx.drawImage(i < player.hp ? SPR.heart : SPR.heartOff, 4 + i * 9, 5);
  text(room.name, W / 2, 4, '#ffd700', 8, 'center');
  text(clues + '/6', W - 4, 4, '#fff', 8, 'right');
}
function drawPopup() {
  const y = 24;
  ctx.fillStyle = '#e94b8a'; ctx.fillRect(28, y, 200, 30);
  ctx.fillStyle = '#fff'; ctx.fillRect(30, y + 2, 196, 26);
  text(popup.big, W / 2, y + 6, '#c2185b', 8, 'center');
  text(popup.small, W / 2, y + 17, '#333', 8, 'center');
}
function drawBox(x, y, w, h) {
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#000'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = '#4a6fd8'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = '#0a0a2a'; ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
}
function drawDialog() {
  const line = dlg.lines[dlg.i];
  const shown = line.slice(0, dlg.ch);
  const boxH = 64; const y = H - boxH - 2;
  drawBox(4, y, W - 8, boxH);
  const lines = wrap(shown, 28);
  let speaker = null; const m = line.match(/^([A-Z][A-Z .()]{1,16}):\s/); if (m) speaker = m[1] + ':';
  lines.forEach((l, i) => text(l, 12, y + 9 + i * 12, '#fff'));
  if (speaker && lines[0]) text(lines[0].slice(0, Math.min(speaker.length, lines[0].length)), 12, y + 9, '#ffd700');
  if (dlg.ch >= line.length && frame % 30 < 15) text('▼', W - 18, y + boxH - 14, '#ffd700');
}
function choiceBox() { const n = choice.opts.length; const h = 24 + n * 12; return { x: 4, y: H - h - 2, w: W - 8, h }; }
function drawChoice() {
  const b = choiceBox();
  drawBox(b.x, b.y, b.w, b.h);
  text('WHERE DOES THE CLUE POINT?', 12, b.y + 8, '#ffd700');
  choice.opts.forEach((o, i) => { const sel = i === choice.sel; text((sel ? '> ' : '  ') + o.label, 12, b.y + 20 + i * 12, sel ? '#fff' : '#9ab'); });
}
function drawBanner() {
  const t = 110 - banner;
  const scale = t < 10 ? 1 + (10 - t) * 0.3 : 1;
  const y = 90 + Math.round(Math.sin(t / 5) * 3);
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(scale, scale);
  textO("IT'S A CLUE!", 0, 0, '#ffd700', 16, 'center');
  ctx.restore();
  if (t > 30) text('- JAMES GATES, obviously', W / 2, y + 26, '#fff', 8, 'center');
}
function drawTitle() {
  ctx.fillStyle = '#0a1030'; ctx.fillRect(0, 0, W, H);
  // stars
  for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = (i * 53) % 120; ctx.fillStyle = (i + Math.floor(frame / 20)) % 5 ? '#fff' : '#0a1030'; ctx.fillRect(x, y, 1, 1); }
  ctx.fillStyle = '#7a1e2e'; ctx.fillRect(0, 150, W, 90);
  ctx.fillStyle = '#5a1420'; for (let i = 0; i < 16; i++) ctx.fillRect(i * 16, 150 + (i & 1) * 8, 16, 8);
  textO('NATIONAL', W / 2, 30, '#ffd700', 16, 'center');
  textO('TREASURE', W / 2, 52, '#ffd700', 16, 'center');
  textO('[ HUNT ]', W / 2, 78, '#fff', 12, 'center');
  ctx.save(); ctx.translate(W / 2 - 24, 96); ctx.scale(3, 3); ctx.drawImage(SPR.hero.down[Math.floor(frame / 30) % 2 ? 1 : 0], 0, 0); ctx.restore();
  if (frame % 40 < 25) textO('PRESS A TO START', W / 2, 168, '#fff', 8, 'center');
  text('A BIRTHDAY ADVENTURE FOR JAMES', W / 2, 200, '#ffd0a0', 8, 'center');
  text('(C) 1981 GATES ENTERTAINMENT', W / 2, 220, '#c9a', 8, 'center');
}
function drawTreasure() {
  const t = treasure;
  ctx.fillStyle = '#0a0a2a'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 50; i++) { const x = (i * 89) % W, y = (i * 47) % H; ctx.fillStyle = (i + Math.floor(frame / 15)) % 4 ? '#889' : '#0a0a2a'; ctx.fillRect(x, y, 1, 1); }
  for (const f of t.fw) {
    if (!f.burst) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 3); }
    else for (const p of f.parts) { ctx.fillStyle = f.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
  }
  ctx.fillStyle = '#1a1a4a'; ctx.fillRect(0, 200, W, 40);
  ctx.save(); ctx.translate(W / 2 - 48, 140); ctx.scale(4, 4); ctx.drawImage(SPR.castle, 0, 0); ctx.restore();
  const card = TREASURE_CARDS[t.card];
  const big = t.card === 1 || t.card === 2 || t.card === 6;
  card.forEach((l, i) => {
    const isBig = big && i === card.length - 1;
    textO(l, W / 2, 28 + i * 16, isBig ? '#ffd700' : '#fff', isBig ? 12 : 8, 'center');
  });
  if (t.card < TREASURE_CARDS.length - 1 && frame % 30 < 15) text('▼', W - 14, 120, '#ffd700');
  // dogs at the bottom
  ctx.save(); ctx.translate(24, 212 - (Math.floor(frame / 12) % 2)); ctx.scale(2, 2); ctx.drawImage(SPR.nubnub, 0, 0); ctx.restore();
  ctx.save(); ctx.translate(200, 212 - ((Math.floor(frame / 12) + 1) % 2)); ctx.scale(2, 2); ctx.drawImage(SPR.dumbledoreR, 0, 0); ctx.restore();
}

// ---------------------------------------------------------------- LOOP
let last = 0, acc = 0;
function loop(ts) {
  if (!last) last = ts;
  acc += Math.min(100, ts - last); last = ts;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(loop);
}
if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').catch(() => {});
requestAnimationFrame(loop);
window.__NT = { SPR, wrap, INTRO, JOKES, TREASURE_CARDS, jump(id) { visited = new Set(); clues = 0; loadRoom(id); state = 'play'; }, get state() { return state; }, get room() { return roomId; }, get player() { return player; }, get enemies() { return enemies; }, get objects() { return objects.map(o => ({ kind: o.kind, item: o.item, state: o.state })); }, get hp() { return player && player.hp; }, get clues() { return clues; }, get dlg() { return dlg; }, get choice() { return choice; }, setKey, say, ROOMS };
})();
