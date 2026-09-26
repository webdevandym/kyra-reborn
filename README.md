# Kyra Reborn

A notebook-doodle platformer for kids aged 8–10. Kyra the chicken («кура») walks, jumps, collects red crystals and stomps carrots, zombies, propeller carrots and bees across five meadow levels, then crosses a cloud track in the evening sky, past two-life stars, bats and rain clouds, to the sleeping Moon. There are eight levels. The game design and the characters come from a young designer's voice note and notebook drawing.

## Play

Play in the browser at <https://webdevandym.github.io/kyra-reborn/> (a keyboard is needed).

To run it locally:

```sh
npm run dev
```

Open <http://localhost:8123> in Chrome. ES modules need a local server, so opening `index.html` directly from disk will not work.

| Key | Action |
|---|---|
| ← → | choose a level in the carousel (main screen) |
| ← → or A D | walk |
| Space, ↑ or W | jump (hold for a higher jump) |
| Esc or P | pause |
| M | sound on/off |
| L | Polski / Українська / English |
| Enter | confirm / next |

## Rules

- Each red crystal is 1 point; every 5 points give an extra life.
- Jump on a carrot to remove it. A big zombie shrinks and speeds up on the first jump and disappears on the second.
- Propeller carrots and bees fly back and forth; one jump from above removes them. You can run under a bee when it is at the top of its wave.
- Touching an enemy any other way costs a life and restarts the level. Crystals you already collected stay collected.
- Any level can be picked on the main screen. With no lives left, "Try again" restarts the level you picked, and "Main menu" goes back to the level picker.
- On the sky levels the track has gaps: jump across, or fall and lose a life. Some clouds drift left and right; stand on one to ride it.
- A star has two lives: jump on it twice. Bats fly like bees.
- Rain clouds rain on and off. Run under one while it is dry: a single drop costs a life.
- Touch the sleeping Moon to finish a sky level.
- The level-complete and victory cards show how long the level took (only time spent playing counts).

## Develop

```sh
npm test
```

Runs the unit tests for the game logic, rendering and translations (`src/core`, `src/levels`, `src/render`, `src/i18n`) with Node's built-in test runner — no dependencies. Add `#debug` to the URL to see hitboxes and FPS and to get `window.kyra` in the console (`kyra.teleport(col)` jumps the chicken to a level column).

Levels are ASCII maps in `src/levels/`. The map characters are defined in `src/core/level.js`, and the geometry rules are enforced by `tests/levels.test.js`. All text, including level names and signs, lives in `src/i18n/pl.json`, `uk.json` and `en.json`. Each language is fetched only when it is first shown.
