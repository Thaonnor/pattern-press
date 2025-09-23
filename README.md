# Pattern Press

A comprehensive web-based tool for importing and browsing KubeJS recipe exports with sophisticated visualizations and intelligent filtering.

## Features

- **Comprehensive Recipe Import**: Supports 70+ mods with 250+ recipe types
- **Advanced Web Interface**: Dark mode Minecraft-themed interface with recipe visualizations
- **Recipe Visualizations**: Visual representations for 8 recipe types (crafting, smelting, smithing, etc.)
- **Smart Filtering**: Filter by mod and recipe type with intelligent sorting (minecraft types first)
- **Mod Information**: Visual overlays showing item source mods on all recipe ingredients
- **Intelligent Categorization**: Automatically categorizes recipe types by customization value
- **Dynamic Metadata**: Modpack-agnostic UI that adapts to available mods and recipe types
- **Responsive Design**: Clean two-column badge layout with consistent alignment
- **Import Analytics**: Detailed statistics and unsupported recipe reporting

## Directory Structure

- `src/` – server code and import utilities
- `public/` – web interface for browsing recipes
- `data/` – imported recipe JSON files organized by mod
- `config/` – import configuration with mod and recipe type settings
- `test/` – test suite

## Getting Started

1. **Install dependencies**: `npm install`
2. **Import recipes**: `node src/import-recipes.js <path-to-kubejs-export>`
3. **Start web server**: `npm start`
4. **Browse recipes**: Open http://localhost:3000 and explore the comprehensive web interface
5. **Run tests**: `npm test`

## Web Interface Features

- **Recipe Visualizations**: View crafting grids, smelting flows, smithing tables, and more
- **Advanced Filtering**: Filter by mod (minecraft first) and recipe type with search
- **Dark Mode Design**: Minecraft-themed interface with intuitive color coding
- **Mod Information**: See which mod each ingredient comes from via subtle overlays
- **Responsive Layout**: Clean badge organization with consistent alignment
- **JSON Access**: Expand any recipe to view the raw KubeJS data

## Import Configuration

The import system uses `config/import.json` to control which recipe types are imported:

- **Whitelist** (`recipeTypes`): High-value recipes for modpack customization
- **Ignore List** (`ignoredRecipeTypes`): Internal mechanics and system enablers
- **Mod Support** (`mods`): Supported mod namespaces

## Supported Mods

Comprehensive support for major tech, magic, and utility mods including:
- **Tech**: Mekanism, Modern Industrialization, Immersive Engineering, PneumaticCraft
- **Magic**: Ars Nouveau, Botania (via Actually Additions integration)
- **Storage**: Applied Energistics 2, Refined Storage, Sophisticated Backpacks/Storage
- **Automation**: Create, Integrated Dynamics, Pretty Pipes, Modular Routers
- **Processing**: Oritech, JAOPCA auto-generation, Thermal series integration
- **Utility**: JustDireThings, SolOnion, LaserIO, and many more
