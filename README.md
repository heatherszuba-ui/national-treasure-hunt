# National Treasure [Hunt]

A 16-bit top-down birthday adventure for James. Play it in Safari on an iPhone.

- `index.html`, `game.js`, `style.css` — the whole game. No build step.
- `docs/DESIGN.md` — design doc, storyboard, clue script, ship checklist.
- `test/playthrough.mjs` — headless Playwright playthrough that screenshots every stage into `test/shots/`.
- `test/icon.mjs` — regenerates `icon.png` from the in-game hero sprite.

## Run locally

```
node -e "import('./test/serve.mjs').then(m => m.serve(8080).then(s => console.log(s.url)))"
```

Then open the printed URL. Keyboard: arrows / WASD move, Z or Space = A (punch / talk), X or Shift = B (run).

## Test

```
node test/playthrough.mjs
```
