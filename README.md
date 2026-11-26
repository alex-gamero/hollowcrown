# Hollowcrown

A dark pixel-art roguelite for the browser. You are a princess made of light, lost in a castle that forgot the sun. Every door opens onto a freshly generated room, so no two runs are the same. Each wing has its own monsters and ends with a boss.

## Play

Open `index.html` in any modern browser. There's no build step and nothing to install.

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move | WASD / Arrow keys | Left stick / D-pad |
| Slash | J or Z | X / Square |
| Dash | K, X, Space or Shift | A / Cross, RB |
| Use / pray / take blessing | E | Y / Triangle |
| Pause | Esc or P | Start |

## How it plays

- **You are the light.** Your glow is the only thing holding the dark back, and it slowly fades. Light motes dropped by monsters, and the shrines, restore it.
- **Rooms, not levels.** Walk through the north door to go deeper. When a room has two doors, the one under a red eye is riskier but pays more.
- **Room types:** combat, ambush (most torches are out), rune puzzles, blessing altars, shrines, and a boss every 10 rooms.
- **Monsters:**
  - **The Hollow** freezes while your light is on it and rushes you in the dark.
  - **The Skitter** waits, then lunges.
  - **The Lament** floats at a distance and weeps orbs of darkness.
  - **The Hollow King** rules the first wing.
- **Wings:** The Gilded Halls (rooms 1–10), The Drowned Library (11–20), The Bone Garden (21+).
- **Progression:** shards you gather are kept when you die. Spend them at the **Altar of Dawn** on permanent upgrades. Blessings only last for the current run.

## Development

- Plain JavaScript and Canvas 2D. Every sprite is a text pixel map in `src/art/`, and all sound is synthesized with WebAudio.
- The internal resolution is 480×270, scaled with nearest-neighbor. Lighting is a per-pixel, ordered-dither pass (`src/engine/light.js`).
- `index.html?seed=123&room=10` starts a run from a given seed and room. Add `&debug` to show FPS.
- `tools/sheet.html` renders every character sprite for quick art review.

```
src/
  engine/   core helpers, input, font, audio, lighting, sprite compiler
  art/      character pixel art, procedural room painter
  game/     player, enemies, room generation, run logic, menus
  main.js   boot + fixed-step loop
```
