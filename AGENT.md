# Pattern Press - Agent Context

## Project Overview

**Pattern Press** is a Node.js/Express application that parses CraftTweaker logs and presents Minecraft modded recipes in a web interface. The system processes log files to extract recipe information and provides a browser-based UI for exploration and filtering.

## Architecture

### Core Components

- **Express Server** (`src/server.js`) - Main web server providing REST API and static file serving
- **Log Segmenter** (`src/log-segmenter.js`) - Parses CraftTweaker logs into discrete recipe segments
- **Parser System** (`src/parsers/`) - Modular parsing pipeline with handlers for different recipe types
- **Web Frontend** (`public/`) - HTML/CSS/JS single-page application for recipe browsing

### Data Flow

1. **Log Upload** → User uploads `crafttweaker.log` via web interface
2. **Segmentation** → Log content is split into individual recipe segments using regex patterns
3. **Parsing** → Each segment is processed by appropriate handlers (JSON, shaped, shapeless crafting)
4. **Normalization** → Raw handler results are converted to standardized recipe objects
5. **Serving** → Normalized recipes are cached in memory and served via REST endpoints

## Key Files & Modules

### Server Layer (`src/server.js`)
- **Port**: 3000
- **Routes**:
  - `GET /` - Serves main HTML page
  - `POST /upload` - Processes uploaded log files
  - `GET /recipes` - Returns filtered/paginated recipe data
  - `GET /stats` - Provides aggregate statistics
- **Dependencies**: express, multer, cors
- **Key Functions**:
  - `parseRecipeLog()` - Main parsing pipeline orchestrator
  - `normalizeDispatchedRecipe()` - Converts handler results to UI format
  - `getRecipeStats()` - Generates filter statistics

### Log Processing (`src/log-segmenter.js`)
- **Purpose**: Breaks CraftTweaker logs into recipe segments based on patterns
- **Key Classes**: `RecipeSegment`
- **Functions**:
  - `segmentLogFile()` - Processes log files from disk
  - `segmentLogContent()` - Processes in-memory log strings
  - `persistSegments()` - Saves segments to JSON files
- **Patterns**: Detects recipe starts via regex (recipetype, craftingTable, mod methods)

### Parser Framework (`src/parsers/`)

#### Dispatcher (`src/parsers/dispatcher.js`)
- **Class**: `RecipeDispatcher` - Coordinates handler selection and execution
- **Methods**:
  - `registerHandler()` - Adds new recipe format handlers
  - `dispatch()` - Finds appropriate handler and processes segment
- **Functions**: `processSegments()`, `loadSegments()`

#### Handlers (`src/parsers/handlers/`)
**Core Recipe Types:**
- **JSON Handler** (`jsonCraftingHandler.js`) - Processes `.addJsonRecipe()` calls
- **Shaped Handler** (`shapedCraftingHandler.js`) - Handles shaped crafting recipes
- **Shapeless Handler** (`shapelessCraftingHandler.js`) - Handles shapeless crafting recipes

**Machine Recipe Types:**
- **Blast Furnace Handler** (`blastFurnaceHandler.js`) - Processes blast furnace recipes
- **Campfire Handler** (`campfireHandler.js`) - Handles campfire cooking recipes
- **Smelting Handler** (`smeltingHandler.js`) - Processes furnace smelting recipes
- **Smoking Handler** (`smokingHandler.js`) - Handles smoker recipes
- **Smithing Handler** (`smithingHandler.js`) - Processes smithing table recipes

**Modded Machine Types:**
- **Cutting Handler** (`cuttingHandler.js`) - Handles Farmer's Delight cutting board recipes
- **Cooking Handler** (`cookingHandler.js`) - Processes Farmer's Delight cooking pot recipes
- **Chemical Conversion Handler** (`chemicalConversionHandler.js`) - Mekanism item-to-chemical conversion
- **Centrifuging Handler** (`centrifugingHandler.js`) - Mekanism isotopic centrifuge separation
- **Activating Handler** (`activatingHandler.js`) - Mekanism solar neutron activator transformation

**Current Status: 13 handlers providing 100% parsing coverage (772/772 recipes)**

### Frontend (`public/`)
- **HTML** (`index.html`) - Single page application shell
- **CSS** (`assets/css/style.css`) - Styling and layout
- **JavaScript** (`assets/js/app.js`) - Client-side interaction logic

### Testing (`test/`)
- **Framework**: Jest testing framework
- **Coverage**: All handlers, server routes, parsing utilities, segmentation logic
- **Command**: `npm test`
- **Handler Tests**: Comprehensive test suites for all 13 recipe format handlers
- **Test Structure**: Unit tests with real-world recipe examples and edge case coverage

### CLI Tools
- **Log Segmenter**: `node src/log-segmenter.js <log-path> --out-dir data/segments --prefix <label>`
- **Segment Parser**: `node src/parse-segments.js data/segments/<file>.json --out data/parsed-results.json`

## Data Structures

### RecipeSegment
```javascript
{
  recipeType: string|null,     // e.g. "<recipetype:minecraft:crafting>"
  startLine: number,           // 1-based line number
  endLine: number,             // 1-based line number
  rawText: string              // Original log content
}
```

### NormalizedRecipe
```javascript
{
  type: string,                // e.g. "minecraft:crafting"
  name: string,                // Recipe identifier
  mod: string,                 // Source mod namespace
  machineType: string,         // Simplified machine category
  format: string,              // Handler type (addJsonRecipe, addShaped, etc.)
  data: Object,                // Raw handler payload
  inputs: RecipeIO,            // Structured inputs
  outputs: RecipeIO            // Structured outputs
}
```

### RecipeIO
```javascript
{
  items: RecipeItem[],         // Item stacks
  fluids: RecipeFluid[]        // Fluid amounts
}
```

## Configuration & Dependencies

### Package.json
- **Name**: pattern-press
- **Scripts**:
  - `npm start` - Runs web server
  - `npm test` - Executes Jest tests
- **Dependencies**: express, cors, multer
- **DevDependencies**: jest, supertest

### File Structure
```
├── src/
│   ├── server.js              # Main Express server
│   ├── log-segmenter.js       # Log parsing utilities
│   ├── parse-segments.js      # CLI segment processor
│   ├── recipe-database.js     # Persistent recipe storage
│   ├── utils/                 # Shared utility modules
│   │   ├── recipe-utils.js    # Recipe processing functions
│   │   ├── file-utils.js      # File system operations
│   │   ├── cli-utils.js       # CLI argument parsing
│   │   └── recipe-filter-utils.js # Recipe filtering/search
│   └── parsers/
│       ├── index.js           # Parser module exports
│       ├── dispatcher.js      # Handler coordination
│       └── handlers/          # Recipe format handlers
├── public/                    # Frontend assets
├── data/                      # Generated artifacts
├── test/                      # Test suites
└── node_modules/             # Dependencies
```

## Development Patterns

### Handler Implementation
Handlers must implement:
- `canParse(segment, context)` - Returns numeric score (0 = can't parse)
- `parse(segment, context)` - Returns structured recipe data
- `name` property for identification

### Error Handling
- Parsing errors are caught and logged with segment line numbers
- Failed segments are marked with `status: 'error'`
- Unmatched segments receive `status: 'unhandled'`

### Memory Management
- Parsed recipes are cached in server memory (`parsedRecipes` array)
- Optional persistent storage via `RecipeDatabase` class using recipe IDs as keys
- File uploads limited to 50MB

### Utility Modules
#### recipe-utils.js
- Recipe processing functions (normalization, extraction, statistics)
- Handles recipe type normalization, mod extraction, I/O parsing
- Functions previously in server.js, now reusable across modules

#### file-utils.js
- File system operations with consistent patterns
- Timestamp generation, directory creation, JSON file handling
- Safe file operations with backup functionality

#### cli-utils.js
- Command line argument parsing with validation
- Supports options with values, flags, positional arguments
- Consistent CLI patterns across log-segmenter.js and parse-segments.js

#### recipe-filter-utils.js
- Recipe filtering, searching, and pagination utilities
- Advanced search with relevance scoring
- Used by server endpoints for recipe queries

## Common Operations

### Adding New Recipe Handler
1. Create handler in `src/parsers/handlers/`
2. Implement `canParse()` and `parse()` methods
3. Register in `src/parsers/index.js` via `createDefaultDispatcher()`
4. Add normalization logic in `server.js` `normalizeDispatchedRecipe()`

### Testing Recipe Parsing
1. Segment test log: `node src/log-segmenter.js test.log --out-dir data/segments`
2. Process segments: `node src/parse-segments.js data/segments/<file>.json`
3. Persist to database: `node src/parse-segments.js data/segments/<file>.json --db data/recipe-database.json`
4. Run web server: `npm start`
5. Upload via web interface or use existing JSON data

### Debugging Parser Issues
- Check segment extraction patterns in `log-segmenter.js`
- Verify handler canParse() scoring logic
- Inspect raw segment data in generated JSON files
- Use server console logs for dispatch failures

## API Endpoints

- `POST /upload` - Accepts multipart form with 'logFile'
- `GET /recipes?type=&mod=&search=&page=1&limit=20` - Filtered recipe listing
- `GET /stats` - Recipe statistics by type/mod/format

## Security Considerations

- File upload size limited to 50MB
- CORS enabled for cross-origin requests
- No authentication/authorization implemented
- JSON parsing uses custom sanitization for CraftTweaker format