# Pattern Press

A Node.js tool for importing and browsing KubeJS recipe exports with comprehensive mod support and intelligent filtering.

## Features

- **Comprehensive Recipe Import**: Supports 70+ mods with 250+ recipe types
- **Intelligent Filtering**: Automatically categorizes recipe types by customization value
- **Web Interface**: Browse and filter imported recipes by mod, type, and content
- **Configurable**: Flexible whitelist/ignore system for recipe type management
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
4. **Browse recipes**: Open http://localhost:3000
5. **Run tests**: `npm test`

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
