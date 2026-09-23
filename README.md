# Kyra Reborn

A notebook-doodle platformer for kids aged 8–10. Kyra the chicken («кура») walks, jumps, collects red crystals, stomps carrots and zombies, and reaches the big green crystal at the end of each level. The game design and the characters come from a young designer's voice note and notebook drawing.

## Play

```sh
npm run dev
```

Open <http://localhost:8123> in Chrome. ES modules need a local server, so opening `index.html` directly from disk will not work.

| Key | Action |
|---|---|
| ← → or A D | walk |
| Space, ↑ or W | jump (hold for a higher jump) |
| Esc or P | pause |
| M | sound on/off |
| L | Українська / English |
| Enter | confirm / next |

## Rules

- Each red crystal is 1 point; every 5 points give an extra life.
- Jump on a carrot to remove it. A big zombie shrinks and speeds up on the first jump and disappears on the second.
- Touching an enemy any other way costs a life and restarts the level. Crystals you already collected stay collected.
- With no lives left the game starts again from level 1.

## Develop

```sh
npm test
```

Runs the unit tests for the game logic (`src/core`, `src/levels`) with Node's built-in test runner — no dependencies. Add `#debug` to the URL to see hitboxes and FPS and to get `window.kyra` in the console (`kyra.teleport(col)` jumps the chicken to a level column).

Levels are ASCII maps in `src/levels/`. The map characters are defined in `src/core/level.js`, and the geometry rules are enforced by `tests/levels.test.js`.
