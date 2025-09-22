# Pattern Press

Node/Express tooling for segmenting CraftTweaker logs and presenting recipes in the browser.

## Directory Structure

- `src/` – server and parsing pipeline code (`server.js`, segmenter, dispatcher, handlers)
- `public/` – static front-end assets served by Express
- `data/` – generated artifacts (segment exports in `data/segments/`, parsed summaries)
- `node_modules/`, `package*.json` – dependencies and npm metadata

## Common Tasks

- Run the web app: `npm start`
- Segment a CraftTweaker log: `node src/log-segmenter.js <path-to-log> --out-dir data/segments --prefix <label>`
- Process a saved segment run: `node src/parse-segments.js data/segments/<file>.json --out data/parsed-results.json`

Segment files are timestamped; move or archive older runs inside `data/segments/` as needed.

