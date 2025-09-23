'use strict';

const path = require('path');
const { findJsonFiles, readJsonFile, ensureDirectoryExists, writeJsonFile, loadImportConfig } = require('./utils');

/**
 * Extracts mod namespace from file path
 */
function extractModNamespace(filePath, recipeData) {
    // Handle both Windows and Unix path separators
    const pathParts = filePath.split(/[/\\]/);
    const recipesIndex = pathParts.findIndex(part => part === 'recipes');

    if (recipesIndex !== -1 && pathParts[recipesIndex + 1]) {
        return pathParts[recipesIndex + 1];
    }

    throw new Error(`Unable to extract mod namespace from file path: ${filePath}`);
}

/**
 * Extracts category from recipe data if available
 */
function extractCategory(recipeData) {
    // Check for category field in the recipe data
    if (recipeData && typeof recipeData.category === 'string') {
        return recipeData.category;
    }

    return null;
}

/**
 * Checks if a recipe should be imported based on configuration
 */
function shouldImportRecipe(mod, recipeType, config) {
    // Check if mod is explicitly ignored
    if (config.ignoredMods && config.ignoredMods.includes(mod)) {
        return { allowed: false, reason: 'mod ignored' };
    }

    // Check if recipe type is explicitly ignored
    if (config.ignoredRecipeTypes && config.ignoredRecipeTypes.includes(recipeType)) {
        return { allowed: false, reason: 'recipe type ignored' };
    }

    // Check if mod is allowed
    if (!config.mods.includes(mod)) {
        return { allowed: false, reason: 'mod not supported' };
    }

    // Check if recipe type is allowed
    if (config.recipeTypes.includes(recipeType)) {
        return { allowed: true };
    }

    // Check for wildcard patterns like "mekanism:*"
    const wildcardMatch = config.recipeTypes.find(type =>
        type.endsWith(':*') && recipeType.startsWith(type.slice(0, -1))
    );

    if (wildcardMatch) {
        return { allowed: true };
    }

    return { allowed: false, reason: 'recipe type not supported' };
}

/**
 * Generates metadata from imported recipe data
 */
function generateMetadata(recipesByMod) {
    const metadata = {
        generated_at: new Date(),
        total_recipes: 0,
        mods: [],
        recipe_types: [],
        categories: [],
        stats: {
            by_mod: {},
            by_type: {},
            by_category: {}
        }
    };

    const modSet = new Set();
    const typeSet = new Set();
    const categorySet = new Set();

    // Scan all recipes to build metadata
    for (const [mod, recipes] of Object.entries(recipesByMod)) {
        metadata.total_recipes += recipes.length;
        metadata.stats.by_mod[mod] = recipes.length;
        modSet.add(mod);

        for (const recipe of recipes) {
            // Collect recipe types
            if (recipe.type) {
                typeSet.add(recipe.type);
                metadata.stats.by_type[recipe.type] = (metadata.stats.by_type[recipe.type] || 0) + 1;
            }

            // Collect categories
            if (recipe.category) {
                categorySet.add(recipe.category);
                metadata.stats.by_category[recipe.category] = (metadata.stats.by_category[recipe.category] || 0) + 1;
            }
        }
    }

    // Convert sets to sorted arrays
    metadata.mods = Array.from(modSet).sort();
    metadata.recipe_types = Array.from(typeSet).sort();
    metadata.categories = Array.from(categorySet).sort();

    return metadata;
}

/**
 * Main import function
 */
async function importRecipes(inputPath) {
    console.log(`🔍 Starting import from: ${inputPath}`);

    // Load configuration
    const config = loadImportConfig();
    console.log(`📋 Loaded config with ${Object.keys(config.mods).length} supported mods`);

    // Find all JSON files
    const jsonFiles = findJsonFiles(inputPath);
    console.log(`📁 Found ${jsonFiles.length} JSON files`);

    const stats = {
        total: 0,
        imported: 0,
        skipped: 0,
        ignored: 0,
        errors: 0,
        byMod: {},
        skippedMods: new Set(),
        skippedTypes: new Set()
    };

    const recipesByMod = {};

    // Process each JSON file
    for (const filePath of jsonFiles) {
        try {
            const recipeData = readJsonFile(filePath);
            const mod = extractModNamespace(filePath, recipeData);
            let recipeType = recipeData.type || 'unknown';

            // Normalize recipe type - add minecraft: prefix if missing
            if (recipeType && !recipeType.includes(':')) {
                recipeType = `minecraft:${recipeType}`;
            }
            const fileName = path.basename(filePath, '.json');

            stats.total++;

            // Check if we should import this recipe
            const importCheck = shouldImportRecipe(mod, recipeType, config);

            if (!importCheck.allowed) {
                if (importCheck.reason === 'recipe type ignored' || importCheck.reason === 'mod ignored') {
                    stats.ignored++;
                } else {
                    stats.skipped++;

                    if (importCheck.reason === 'mod not supported') {
                        stats.skippedMods.add(mod);
                    } else {
                        // Only add mod prefix if recipe type doesn't already have a namespace
                        const reportedType = recipeType.includes(':') ? recipeType : `${mod}:${recipeType}`;
                        stats.skippedTypes.add(reportedType);
                    }
                }

                if (config.logging.logSkipped) {
                    console.log(`⚠️  Skipped ${fileName} (${importCheck.reason})`);
                }
                continue;
            }

            // Extract normalized fields from recipe data
            const category = extractCategory(recipeData);

            // Create recipe object
            const recipe = {
                id: fileName,
                mod: mod,
                type: recipeType,
                name: fileName,
                category: category,
                data: recipeData,
                imported_at: new Date()
            };

            // Group by mod
            if (!recipesByMod[mod]) {
                recipesByMod[mod] = [];
                stats.byMod[mod] = 0;
            }

            recipesByMod[mod].push(recipe);
            stats.byMod[mod]++;
            stats.imported++;

            console.log(`✅ ${fileName} (${recipeType})`);

        } catch (error) {
            stats.errors++;
            console.log(`❌ ${path.basename(filePath)}: ${error.message}`);
        }
    }

    // Ensure output directory exists
    const outputDir = path.join(__dirname, '..', 'data', 'recipes');
    ensureDirectoryExists(outputDir);

    // Save recipes by mod
    for (const [mod, recipes] of Object.entries(recipesByMod)) {
        const outputPath = path.join(outputDir, `${mod}.json`);
        writeJsonFile(outputPath, recipes);
        console.log(`💾 Saved ${recipes.length} ${mod} recipes to ${mod}.json`);
    }

    // Generate and save metadata
    if (Object.keys(recipesByMod).length > 0) {
        const metadata = generateMetadata(recipesByMod);
        const metadataPath = path.join(__dirname, '..', 'data', 'metadata.json');
        writeJsonFile(metadataPath, metadata);
        console.log(`📋 Generated metadata with ${metadata.mods.length} mods, ${metadata.recipe_types.length} recipe types, ${metadata.categories.length} categories`);
    }

    // Print summary
    console.log(`\n📊 Import Summary:`);
    console.log(`   📦 Total files: ${stats.total}`);
    console.log(`   ✅ Imported: ${stats.imported}`);
    console.log(`   ⚠️  Unsupported: ${stats.skipped}`);
    console.log(`   🚫 Ignored: ${stats.ignored}`);
    console.log(`   ❌ Errors: ${stats.errors}`);

    if (stats.skippedMods.size > 0) {
        console.log(`\n🚫 Unsupported mods (${stats.skippedMods.size}):`);
        Array.from(stats.skippedMods).forEach(mod => {
            console.log(`   - ${mod}`);
        });
    }

    if (stats.skippedTypes.size > 0) {
        console.log(`\n🔍 Unsupported recipe types (${stats.skippedTypes.size}):`);
        Array.from(stats.skippedTypes).sort().forEach(type => {
            console.log(`   - ${type}`);
        });
        console.log(`\n💡 Add these types to config/import.json to support them`);
    }

    return stats;
}

// CLI usage
if (require.main === module) {
    const inputPath = process.argv[2];

    if (!inputPath) {
        console.log('Usage: node src/import-recipes.js <path-to-kubejs-export-directory>');
        console.log('Example: node src/import-recipes.js "C:\\Users\\...\\kubejs\\export\\recipes\\minecraft"');
        process.exit(1);
    }

    importRecipes(inputPath)
        .then(() => {
            console.log('\n🎉 Import completed successfully!');
        })
        .catch(error => {
            console.error(`💥 Import failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { importRecipes };