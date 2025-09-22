# KubeJS Integration Plan for Pattern Press

## Overview
Integrate KubeJS recipe export data (~17,604 recipes) into Pattern Press while keeping the project simple and manageable for personal hobby use.

## Context
- This is a personal tool for a video game to make life easier
- No backward compatibility requirements
- Focus on simplicity over enterprise features
- Maintain testing approach for code health visibility
- JSON document storage preferred over relational database

## Document Database Options
- **NeDB** (recommended): Pure JavaScript, SQLite-like API, zero-config, file-based JSON documents
- **LowDB**: Lightweight JSON database, perfect for small projects
- **PouchDB**: More feature-rich but might be overkill
- **Alternative**: Stick with JSON files but use directory structure (recipes/minecraft/, recipes/mekanism/, etc.)

## Phase 1: Core Infrastructure

### Document Storage Setup
- Replace single JSON array with NeDB database
- Simple schema: `{ id, mod, type, name, data }` where `data` is the raw recipe JSON
- Keep existing in-memory caching for web serving

### Bulk Import System
- CLI command: `node src/import-kubejs.js /path/to/export/recipes`
- Progress tracking (simple console output)
- Error logging for malformed JSONs
- **No validation initially** - just store everything and see what breaks

## Phase 2: Basic Integration

### Frontend Compatibility
- Modify existing `/recipes` endpoint to query NeDB instead of memory array
- Keep same filtering/pagination API
- Update stats endpoint for new data source

### Testing Strategy
- Unit tests for import process
- Test with subset of recipes first (maybe just minecraft + mekanism)
- Existing frontend tests should still pass

## Phase 3: Simple Enhancements

### Basic Format Handling
- No complex validation - just ensure required fields exist (`type`, `result`)
- Log recipes that can't be normalized (for manual review)
- Simple error boundary: skip broken recipes, continue processing

### Improved Browsing
- Better mod filtering (now that we have way more mods)
- Recipe type filtering based on actual types found
- Simple search across recipe names

## Implementation Notes

### Keep It Simple
- Start with "import everything, see what happens" approach
- No backward compatibility needed - this is your tool
- Focus on getting the data accessible via the existing UI first
- Add features as you actually need them

### Testing Focus
- Test import process with real data subsets
- Test that existing UI still works with new data source
- Performance testing with larger datasets (but not over-engineering)

## Benefits
This approach allows quickly importing and browsing 17k recipes while keeping the codebase manageable for a hobby project. Additional sophistication can be added later as needed.