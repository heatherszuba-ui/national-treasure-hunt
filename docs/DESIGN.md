# National Treasure [Hunt] — Design Doc

A birthday gift for James (10/01). Quick-and-dirty scope: ship a playable, polished-enough
game in days, not weeks. This doc is the single source of truth for what we are building.

## 1. Goals and non-goals

**Goals**
- A 10–15 minute top-down 16-bit adventure in the style of *A Link to the Past*.
- Plays on James's iPhone in Safari, full screen, with on-screen D-pad + A/B buttons.
- Six rooms: five *National Treasure* movie locations plus Mr. Miyagi's garden. Every path wins.
- Clues are personal riddles about James; the hero shouts "IT'S A CLUE!" every time.
- Ends by revealing the treasure: Disneyland, Jan 6–11 2027, Grand Californian.
- Heavy on Nic Cage / Riley quotes.

**Non-goals**
- App Store submission, accounts, saving progress, analytics, sound design beyond beeps.
- Native Swift. (Can be added later as a WKWebView wrapper if wanted.)

## 2. Platform and tech

| Concern | Decision |
|---|---|
| Runtime | Single-page web app: `index.html` + `game.js` + `style.css`. No build step. |
| Rendering | HTML5 `<canvas>` at an internal 256×240 resolution (NES/SNES-like), upscaled with `image-rendering: pixelated`. |
| Art | Hand-authored pixel sprites defined as text grids in `game.js`. Tiles drawn procedurally. |
| Font | "Press Start 2P" bundled locally in `fonts/` (SIL OFL) so the game works offline; monospace fallback. |
| Audio | Web Audio API synthesized beeps (punch, hit, bell, clue jingle, fanfare). Unlocked on first tap. |
| Input | Keyboard (arrows / WASD, Z or Space = A, X or Shift = B) and touch overlay buttons. |
| Hosting | GitHub Pages from this repo. Add to Home Screen gives an icon + full-screen play (`manifest.json`, apple meta tags). |
| Testing | Playwright (Chromium) script drives the game with keyboard input and screenshots each room. |

## 3. Controls

- **D-pad**: move Left / Right / Up / Down.
- **A**: punch. If facing an object or person, talk / interact instead. Advances dialog. Confirms a choice.
- **B**: sprint. Sprinting too long triggers a Heather "EASY DAY, JAMES!" pop-up. (Cosmetic joke.)
- Tapping the canvas also advances dialog and selects a choice.

## 4. Game loop and states

```
TITLE → INTRO dialog → ROOM 1 (Archives)
  → clue → CHOICE → next room ... (rooms 2–5 in the order the player chooses)
  → after all 4 middle clues → FINAL ROOM (boss + chest) → TREASURE reveal → END
```

- **Combat room**: goons chase the hero; punch each 3 times. When all are down the clue object unlocks.
- **Puzzle room**: interact with objects in the room to satisfy a hint. Solving unlocks the clue.
- **Clue found**: screen shake, big "IT'S A CLUE!" banner + jingle, then the clue text, then 2–3 choices.
- **Choices**: real options go to remaining rooms; a "joke" option (wings, guitar, running too hard) gives a gag response and then goes to the first remaining room. Every option advances the game.
- **Hero HP**: 3 hearts. At 0 the hero quips "I'm not gonna lose," the room resets, and play continues. There is no losing.

## 5. Storyboard (room by room)

### Room 1 — National Archives Rotunda (combat)
- Two of Ian's goons guard the Declaration of Independence display.
- Beat both → "Lemon juice... heat..." → the clue is on the back of the Declaration.
- **Clue 1** hints at how James and Heather met (he was hired as her running coach).

### Room 2 — Independence Hall, Bell Tower (puzzle)
- Hint on entry: "Ring the bell once for every event a decathlete must conquer."
- Ring the Liberty Bell 10 times → the clue slides out.
- **Clue 2** covers the decathlon, Rent (Roger and Mark, 525,600 minutes), and the wing-eating title.

### Room 3 — The Charlotte, ship's hold in the Arctic (puzzle)
- Hint on entry: "Find the two rations that would make James Gates weep with joy."
- Five barrels. Open them: haggis and lasagna are correct; the others are gags. Find both → the meerschaum pipe holds the clue.
- The gunpowder keg is a trap: look once and Riley warns you; press A on it again and it explodes, all hearts are lost, and the room restarts from scratch.
- **Clue 3** covers Heather flying James to Ireland on a whim, Little Irish the guitar, open mics, and the singing selfies.

### Room 4 — Trinity Church crypt entrance (combat)
- Shaw and two goons guard the stairs down.
- Beat them → the tombstone inscription is the clue.
- **Clue 4** covers Flagstaff, 7,000 ft, sub-2:30 delusions, World Championships and Paris 2024.

### Room 5 — Okinawa, Miyagi-Do garden (combat + mini-puzzle)
- Chozen and two thugs guard Mr. Miyagi's garden (pond in the middle, trees in the corners).
- Beat them (James honks Chozen's nose) → trim the bonsai with six presses of A, alternating WAX ON / WAX OFF.
- **Clue 5** covers bonsai, the Miyagi/Pat Morita relics, Karate Kid II on in the background, The Goonies, and Willow.
- Joke choice: "Watch Karate Kid II first" (he's at the drum part).

Rooms 2–5 can be played in any order. The choice text after each clue lists the remaining locations.

### Room 6 — Templar treasure chamber beneath Trinity (final)
- Ian Howe (boss, 8 HP, faster than goons) guards the chest.
- Beat him → Nub Nub and Dumbledore appear beside the chest → open it.
- **Treasure reveal**: fireworks, castle, and the Disneyland announcement with dates and hotel.

## 6. Requirements checklist

- [x] Title screen, intro, 6 rooms, ending.
- [x] Move in 4 directions with collision against walls and objects.
- [x] Punch combat with knockback, invulnerability frames, enemy defeat.
- [x] Two distinct puzzles (bell count, barrel search).
- [x] Clue banner + text + 2–3 choices after every clue.
- [x] Every choice leads forward. No fail state.
- [x] Touch controls that work with two thumbs at once.
- [x] Full-screen on iPhone via Add to Home Screen.
- [x] Sound effects.
- [x] Dialog auto-paginates; the test audits every line so nothing overflows the box.
- [ ] Optional: background music loop, more enemy types, animations for objects.

## 7. Test plan

1. `node test/playthrough.mjs` runs the game headlessly, plays through every room with keyboard input, and writes a screenshot per stage to `test/shots/`. It fails if any JS error is thrown.
2. Manual: open the GitHub Pages URL on an iPhone, Add to Home Screen, play through once. Check that both thumbs can press D-pad and A together, that text is readable, and the ending renders.

## 8. Ship checklist

1. Merge this branch into `main` (or point Pages at this branch).
2. Repo Settings → Pages → Deploy from a branch → `main` / root. The repo must be public on a free GitHub plan.
3. Open the URL in Safari on James's phone → Share → Add to Home Screen.
4. Give him the phone on 10/01.
