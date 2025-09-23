# Pattern Press - Agent Context

## Project Overview

**Pattern Press** is a Node.js/Express application for importing and browsing KubeJS recipe exports. The system imports JSON recipe files exported by KubeJS and provides a web interface for exploration and filtering.

## Architecture

### Core Components

- **Express Server** (`src/server.js`) - Main web server providing REST API and static file serving
- **Import System** (`src/import-recipes.js`) - Imports KubeJS JSON recipe exports
- **Data Storage** (`data/recipes/`) - JSON files organized by mod (minecraft.json, mekanism.json, etc.)
- **Web Frontend** (`public/`) - HTML/CSS/JS interface for recipe browsing

### Data Flow

1. **Import** → CLI tool imports KubeJS exported JSON files
2. **Organization** → Recipes are grouped by mod and stored as JSON files
3. **Loading** → Server loads recipe data from JSON files on demand
4. **Serving** → Recipes are served via REST endpoints with filtering/pagination

## Key Files & Modules

### Server Layer (`src/server.js`)
- **Port**: 3000
- **Routes**:
  - `GET /` - Serves main HTML page
  - `GET /recipes` - Returns filtered/paginated recipe data
  - `GET /stats` - Provides aggregate statistics
- **Dependencies**: express, cors

### Import System (`src/import-recipes.js`)
- **Purpose**: Imports KubeJS JSON recipe exports and organizes by mod
- **Functions**:
  - `findRecipeFiles()` - Recursively finds JSON files in directory
  - `groupRecipesByMod()` - Groups imported recipes by mod namespace
  - `saveRecipesByMod()` - Saves organized recipes to JSON files

### Data Storage (`data/recipes/`)
- **Structure**: One JSON file per mod containing recipe arrays
- **Examples**: `minecraft.json`, `mekanism.json`, `ars_nouveau.json`
- **Format**: Array of recipe objects with consistent structure

### Frontend (`public/`)
- **HTML** (`index.html`) - Single page application shell
- **CSS** (`assets/css/style.css`) - Styling and layout
- **JavaScript** (`assets/js/app.js`) - Client-side interaction logic

### Testing (`test/`)
- **Framework**: Jest testing framework
- **Command**: `npm test`

### CLI Tools
- **Import Recipes**: `node src/import-recipes.js <kubejs-export-path>`

## Data Structures

### Recipe Object
```javascript
{
  id: string,                  // Unique identifier (filename or generated)
  mod: string,                 // Source mod namespace (minecraft, mekanism, etc.)
  type: string,                // Recipe type from JSON (minecraft:crafting_shaped, etc.)
  name: string,                // Recipe name/identifier
  data: Object,                // Raw KubeJS recipe JSON
  imported_at: Date            // Import timestamp
}
```

## Technical Details

### JSON File Organization
- Recipes grouped by mod namespace into separate JSON files
- File naming: `data/recipes/{mod}.json` (e.g., `minecraft.json`)
- Each file contains array of recipe objects
- Enables selective loading and better git diffs

### Import Process
- Recursively scans KubeJS export directory for `.json` files
- Extracts mod namespace from file path or recipe content
- Groups recipes by mod and saves to organized JSON files
- Preserves original recipe structure in `data` field

### Memory Management
- Server loads JSON files on demand rather than all at startup
- Recipes cached in memory after first load per mod
- No persistent database - JSON files are the source of truth

## API Endpoints

- `GET /recipes?type=&mod=&search=&page=1&limit=20` - Filtered recipe listing
- `GET /stats` - Recipe statistics by type/mod

## Development Notes

- Focus on simplicity over enterprise features
- JSON storage prioritized for visibility and ease of use
- No complex validation - "import everything, see what happens" approach
- Designed for personal hobby use with ~7,000 recipe scale