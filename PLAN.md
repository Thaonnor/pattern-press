# KubeJS Integration Implementation Plan

## Current Status: Clean Slate ✅
- All CraftTweaker code removed
- Dependencies cleaned up
- Documentation updated
- Ready for fresh KubeJS implementation

## Implementation Phases

### Phase 1: Core Import System 🚧
**Goal**: Import KubeJS JSON files and organize by mod

**Tasks**:
- Build import CLI tool (`src/import-recipes.js`)
- Implement recursive JSON file discovery
- Group recipes by mod namespace
- Save to `data/recipes/{mod}.json` files
- Test with minecraft subfolder (~1,280 recipes)

### Phase 2: Basic Web Server 📋
**Goal**: Serve imported recipes via web API

**Tasks**:
- Build Express server (`src/server.js`)
- Implement `/recipes` endpoint with filtering
- Add `/stats` endpoint for mod/type counts
- Build simple HTML frontend for browsing
- Test with small dataset

### Phase 3: Scale & Polish 📋
**Goal**: Handle full dataset and improve UX

**Tasks**:
- Import all 7,000+ recipes across 71 mods
- Add pagination and search functionality
- Improve frontend UI/UX
- Add basic error handling and logging

## Implementation Philosophy

### "Import Everything, See What Happens"
- No complex validation upfront
- Store raw KubeJS JSON and organize later
- Build features as actually needed
- Personal tool - no enterprise requirements

### JSON-First Storage
- One JSON file per mod for easy viewing
- Git-friendly diffs and version control
- No database complexity
- Direct file editing when needed

### Incremental Development
- Start small (minecraft only)
- Prove each phase works before expanding
- Add complexity only when required
- Keep codebase readable and maintainable

## Next Steps
1. Build Phase 1 import system
2. Test with minecraft recipes
3. Expand to more mods as needed