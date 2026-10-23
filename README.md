# Kyra Reborn

A notebook-doodle platformer for kids aged 8–10. Kyra the chicken («кура») walks, jumps, collects red crystals and stomps carrots, zombies, propeller carrots and bees across five meadow levels, crosses a cloud track in the evening sky, past two-life stars, bats and rain clouds, to the sleeping Moon, and then walks through four rooms of each castle level — halls, kitchens, libraries, dungeons and a throne room — past rats, bone-throwing skeletons, shy ghosts and a fire-spitting spider, to the princess, and finally dives into three underwater levels full of dolphins, fish, bubbles and sharks. There are fourteen levels. The game design and the characters come from a young designer's voice note and notebook drawing.

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
- Touching an enemy any other way costs a life and restarts the level (in the castle, from the checkpoint once you have reached it). Crystals you already collected stay collected.
- Any level can be picked on the main screen. With no lives left, "Try again" restarts the level you picked, and "Main menu" goes back to the level picker.
- On the sky levels the track has gaps: jump across, or fall and lose a life. Some clouds drift left and right; stand on one to ride it.
- A star has two lives: jump on it twice. A bat swoops like a swing: high at both ends, where you can run under it, and low in the middle, where you jump over it or on it.
- Rain clouds rain on and off. Run under one while it is dry: a single drop costs a life.
- Touch the sleeping Moon to finish a sky level.
- In the castle, a rat has one life and a skeleton has two. Skeletons throw bones in an arc: step aside. Only the rats in red helmets, near the spider, give you a shield: a blue bubble that stops one fireball, but not a bone.
- A ghost creeps closer while you look away and freezes when you face it. It floats through walls but never leaves its room.
- Each castle level has one spider with three lives. It spits volleys of one, two or three fireballs, low and high in turn: jump over a low volley, and stay on the ground under a high one. Each time you jump on it, it gets dizzy and throws you back.
- Defeat the spider to open a portal. Going through it is a checkpoint: losing a life after that restarts from there. The other rooms are joined by doors: walk into one to go to the next room.
- Touch the princess to finish a castle level.
- Underwater, dolphins (two lives) and fast fish (one life) walk the sea floor or swim over the pits, and none of them throw anything. Jump on them from above.
- Some sand sticks slide left and right and some go up and down; hop from one to the next across a pit.
- A bubble drifts through the water and carries off any crystal it passes. Touch it to get the crystal back and a bubble of your own: fall slowly, like on a parachute, until you land.
- The turquoise crystal near the start of each sea level is a shield: it takes one touch from a dolphin, fish or shell.
- A shark waits at the end of every sea level. It has three lives and fires fast volleys of two, three and four shells, low and high in turn, and straight up when you are above it. The finish crystal stays in its bubble until every shark is beaten.
- The last sea level has two sharks and a pearl: touch it and a crab comes out and pinches the nearest shark twice.
- The level-complete and victory cards show how long the level took (only time spent playing counts).

## Develop

```sh
npm test
```

Runs the unit tests for the game logic, rendering and translations (`src/core`, `src/levels`, `src/render`, `src/i18n`) with Node's built-in test runner — no dependencies. Add `#debug` to the URL to see hitboxes and FPS and to get `window.kyra` in the console (`kyra.teleport(col)` jumps the chicken to a level column).

Levels are ASCII maps in `src/levels/`. The map characters are defined in `src/core/level.js`, and the geometry rules are enforced by `tests/levels.test.js`. All text, including level names and signs, lives in `src/i18n/pl.json`, `uk.json` and `en.json`. Each language is fetched only when it is first shown.
