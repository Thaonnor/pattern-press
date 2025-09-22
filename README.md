# Pattern Press

Node/Express tooling for segmenting CraftTweaker logs and presenting recipes in the browser.

Pattern Press features comprehensive recipe parsing support for vanilla Minecraft recipes and modded content including Mekanism chemical processing, Farmer's Delight cooking systems, and advanced machine operations.

## Directory Structure

- `src/` – server and parsing pipeline code (`server.js`, segmenter, dispatcher, handlers)
- `public/` – static front-end assets served by Express
- `data/` – generated artifacts (segment exports in `data/segments/`, parsed summaries)
- `node_modules/`, `package*.json` – dependencies and npm metadata

## Common Tasks

- Run the web app: `npm start`
- Segment a CraftTweaker log: `node src/log-segmenter.js <path-to-log> --out-dir data/segments --prefix <label>`
- Process a saved segment run: `node src/parse-segments.js data/segments/<file>.json --out data/parsed-results.json`
- Persist recipes to database: `node src/parse-segments.js data/segments/<file>.json --db data/recipe-database.json`
- Run the Jest unit tests: `npm test`

Segment files are timestamped; move or archive older runs inside `data/segments/` as needed.

## Supported Recipe Types

Pattern Press includes parsers for the following recipe formats:

**Core Minecraft:**
- JSON crafting recipes (`addJsonRecipe`)
- Shaped crafting table recipes (`addShaped`)
- Shapeless crafting table recipes (`addShapeless`)

**Vanilla Machines:**
- Blast furnace recipes (`blastFurnace.addRecipe`)
- Campfire cooking recipes (`campfire.addRecipe`)
- Furnace smelting recipes (`furnace.addRecipe`)
- Smoker recipes (`smoker.addRecipe`)
- Smithing table recipes (`smithing.addTransformRecipe`, `smithing.addTrimRecipe`)

**Modded Systems:**
- Farmer's Delight cutting board (`cutting.addRecipe`)
- Farmer's Delight cooking pot (`cooking.addRecipe`)
- Mekanism chemical conversion (`<recipetype:mekanism:chemical_conversion>`)
- Mekanism isotopic centrifuging (`<recipetype:mekanism:centrifuging>`)
- Mekanism solar neutron activation (`<recipetype:mekanism:activating>`)

The parsing system is designed to be extensible, allowing new recipe format handlers to be easily added as more modded content is encountered.
