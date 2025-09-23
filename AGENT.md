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

## Recipe Type Analysis & Configuration

### Import System Architecture
- **Import Script** (`src/import-recipes.js`) - Main import utility with comprehensive mod support
- **Configuration** (`config/import.json`) - Centralized recipe type and mod management
- **Normalization** - Automatic recipe type normalization and namespace handling

### Recipe Type Categorization
The system uses a comprehensive configuration-based approach with 250+ analyzed recipe types:

#### **Comprehensive Coverage Achieved**
Through systematic analysis, the system now supports:
- **70+ mods** with full recipe type coverage
- **250+ recipe types** categorized by customization value
- **Intelligent filtering** separating high-value content from internal mechanics
- **Zero unsupported recipes** in typical modpack configurations

#### **Whitelist Strategy** - High customization value for modpack makers:
**Core Processing Systems:**
- Machine recipes (Mekanism, Modern Industrialization, Oritech, PneumaticCraft)
- Energy systems and fuel definitions
- Material processing chains and ore multiplication

**Progression & Balance:**
- Tiered upgrades and advancement systems
- Cross-mod integration recipes
- Custom crafting patterns and complex recipes

**Magic & Special Systems:**
- Spell systems (Ars Nouveau glyph creation, enchanting apparatus)
- Ritual and transformation recipes
- Augmentation and enhancement systems

#### **Ignore List Strategy** - Internal mechanics with low customization value:
**System Enablers:**
- Internal upgrade mechanics and system registration
- NBT manipulation and data preservation
- Configuration clearing and reset utilities

**Fixed Mechanics:**
- Hardcoded upgrade paths and transformations
- Metadata tracking and client-side utilities
- Empty recipe definitions and system placeholders

### Import System Features

#### **Enhanced Reporting**
- **Categorized Statistics**: Separates "unsupported" vs "intentionally ignored" recipes
- **Detailed Logging**: Configurable verbosity for import analysis
- **Progress Tracking**: Real-time feedback during large imports

#### **Recipe Type Normalization**
- **Namespace Handling**: Automatic `minecraft:` prefix for recipes missing namespaces
- **Consistent Reporting**: Prevents duplicate mod prefixes in unsupported type lists
- **Edge Case Handling**: Properly handles cross-mod recipe types and variants

#### **Configuration Management**
- **Centralized Control**: Single config file for all import behavior
- **Flexible Filtering**: Separate whitelist/ignore lists with clear categorization
- **Mod Support**: Comprehensive mod namespace definitions

### Analysis Methodology
The comprehensive recipe analysis followed a systematic approach:

1. **Discovery**: Search export folders for recipe type patterns
2. **Sampling**: Read 1-2 representative examples of each type
3. **Evaluation**: Apply standardized criteria for customization value
4. **Categorization**: Sort into whitelist (high value) or ignore list (low value)
5. **Validation**: Test import behavior and adjust configuration

**Evaluation Criteria Applied**:
- **Customization Value**: Frequency of modpack maker modifications
- **Content vs Mechanics**: Represents craftable content vs internal systems
- **Progression Impact**: Affects gameplay balance or tech progression
- **Cross-mod Integration**: Enables integration between different mods

**Common Patterns Identified**:
- **Machine Processing** → Whitelist (high customization value)
- **Empty System Enablers** → Ignore (no customization content)
- **NBT/Data Manipulation** → Ignore (fixed internal mechanics)
- **Progression Systems** → Whitelist (important for balance)
- **Cross-mod Compatibility** → Whitelist (integration value)

## Development Notes

- Focus on simplicity over enterprise features
- JSON storage prioritized for visibility and ease of use
- No complex validation - "import everything, see what happens" approach
- Designed for personal hobby use with ~7,000 recipe scale