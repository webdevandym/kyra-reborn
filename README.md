# Kyra Reborn

A notebook-doodle platformer for kids aged 8–10. Kyra the chicken («кура») walks, jumps, collects red crystals, stomps carrots, zombies, propeller carrots and bees, and reaches the big green crystal at the end of each of the five levels. The game design and the characters come from a young designer's voice note and notebook drawing.

## Play

```sh
npm run dev
```

Open <http://localhost:8123> in Chrome. ES modules need a local server, so opening `index.html` directly from disk will not work.

| Key | Action |
|---|---|
| ← → | choose a level (main screen) |
| ← → or A D | walk |
| Space, ↑ or W | jump (hold for a higher jump) |
| Esc or P | pause |
| M | sound on/off |
| L | Українська / English |
| Enter | confirm / next |

## Rules

- Each red crystal is 1 point; every 5 points give an extra life.
- Jump on a carrot to remove it. A big zombie shrinks and speeds up on the first jump and disappears on the second.
- Propeller carrots and bees fly back and forth; one jump from above removes them. You can run under a bee when it is at the top of its wave.
- Touching an enemy any other way costs a life and restarts the level. Crystals you already collected stay collected.
- Any level can be picked on the main screen. With no lives left, "Try again" restarts the level you picked, and "Main menu" goes back to the level picker.

## Develop

```sh
npm test
```

Runs the unit tests for the game logic (`src/core`, `src/levels`) with Node's built-in test runner — no dependencies. Add `#debug` to the URL to see hitboxes and FPS and to get `window.kyra` in the console (`kyra.teleport(col)` jumps the chicken to a level column).

Levels are ASCII maps in `src/levels/`. The map characters are defined in `src/core/level.js`, and the geometry rules are enforced by `tests/levels.test.js`.
