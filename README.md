# Dungeon Run

A playable, turn-based dungeon strategy RPG. Explore nine tactical grid floors, collect equipment, learn skills from bosses, and build a hero through three talent trees.

**[Private playable version](https://dungeon-run-joaodperes.joaodperes.chatgpt.site)**

GitHub Pages is prepared for <https://joaodperes.github.io/Dungeon-Run/>. The repository owner must enable GitHub Actions as the Pages source; the connected integration lacks permission to change this setting.

## Play

Choose **Shaman** (staff + Lightning Bolt), **Hunter** (bow + Steady Shot), or **Knight** (sword + Cleave) in Settings. The game opens with a Shaman ready to play.

Each turn gives you **2 action points** and a separate, class-specific **movement allowance**. Movement does not cost AP; attacks and skills do. Spells also spend mana, which regenerates each turn. Range uses Manhattan distance (orthogonal grid steps), and walls block movement and line of sight. The action-point model makes positioning and resource decisions predictable; a random card hand is deliberately left for a possible later game mode.

- Click a highlighted tile to move. Select an ability, then a highlighted enemy to attack.
- Enemies move and attack when you end your turn. Check their movement, range, and damage in the encounter panel.
- Defeated enemies award gold and XP, with occasional rare equipment. Every third floor has a boss, a guaranteed epic item, and a choice of one new skill from its pool.
- Each level grants a talent point. Choose from 27 multi-rank talents across Damage, Defense, and Versatility, with level gates and prerequisite talents.
- Return to Emberfall town to heal, trade, and equip gear. Retreating during combat costs 10% gold; rescue after defeat costs 30%. Gear, skills, and experience persist. Re-entering the dungeon resets the current floor’s enemies.
- Mystery merchants appear on cleared floors 4 and 7 with rare and epic stock.
- Changing equipment in combat costs 1 AP; outside combat it is free. Health and mana potions each cost 1 AP to drink.

### Controls

| Key | Action |
| --- | --- |
| M | Movement mode |
| 1–9 | Select learned abilities |
| Space / E | End turn |
| Escape | Close panel / movement mode |

## Saves

Progress autosaves in your browser’s local storage after each successful action. In **Settings**, export a JSON backup or import one on another device. Imports validate class, resources, equipment, talent prerequisites, unit positions, and save version before replacing progress. Export a backup before clearing browser storage or changing devices. Saves belong to the browser and website origin; use export/import to move between hosts.

## Run locally

Requires Node.js 22+ to build or run tests; the game itself has no runtime dependencies or backend.

```sh
git clone https://github.com/joaodperes/Dungeon-Run.git
cd Dungeon-Run
npm test
npm run build
python3 -m http.server 5173 --directory dist
```

Open <http://localhost:5173>. To edit without rebuilding, run `npm run dev` and open the same URL.

## Hosting

The GitHub Actions workflow in `.github/workflows/pages.yml` tests, builds, and deploys `dist/` on pushes to `main`. Set **Settings → Pages → Source → GitHub Actions** if configuring a fork. Relative asset paths support project sites like `/Dungeon-Run/`. `dist/` is generated and ignored by Git.

This repository also contains a private Sites hosting manifest. Neither host needs a server or database. Google Fonts are optional; the interface uses system fallbacks if unavailable. All pixel-art SVG assets are original and included locally.

## Project structure

- `src/data.js` — class, ability, talent, item, and monster definitions.
- `src/engine.js` — serializable rules engine, deterministic RNG, combat, progression, shops, and save validation.
- `src/app.js` — interface, input handling, autosaves, JSON files, and sound toggle.
- `src/panels.js` — inventory, talents, journal, town, spellbook, settings, and field guide.
- `assets/` — original pixel-art SVG sprites and scenery.
- `src/*.test.js` — rule, complete campaign, and UI-event integration tests.

## Scope

This is a first playable prototype: nine authored encounters using a shared chamber layout, five enemy types, fourteen learnable weapon/spell abilities, three equipment slots, and three hero presets. Difficulty favors experimentation. Future work could add procedural room layouts, more distinct boss mechanics, skill loadouts, sound assets, and broader balance tuning. The UI-event tests run without a graphical browser; visual browser verification remains a separate check.

## License

[MIT](LICENSE) © 2026 João Diogo Peres.
