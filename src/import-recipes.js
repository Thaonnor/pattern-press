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
            const recipeType = recipeData.type || 'unknown';
            const fileName = path.basename(filePath, '.json');

            stats.total++;

            // Check if we should import this recipe
            const importCheck = shouldImportRecipe(mod, recipeType, config);

            if (!importCheck.allowed) {
                stats.skipped++;

                if (importCheck.reason === 'mod not supported') {
                    stats.skippedMods.add(mod);
                } else if (importCheck.reason === 'recipe type ignored' || importCheck.reason === 'mod ignored') {
                    // Don't add ignored items to the unsupported lists
                } else {
                    stats.skippedTypes.add(`${mod}:${recipeType}`);
                }

                if (config.logging.logSkipped) {
                    console.log(`⚠️  Skipped ${fileName} (${importCheck.reason})`);
                }
                continue;
            }

            // Create recipe object
            const recipe = {
                id: fileName,
                mod: mod,
                type: recipeType,
                name: fileName,
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

    // Print summary
    console.log(`\n📊 Import Summary:`);
    console.log(`   📦 Total files: ${stats.total}`);
    console.log(`   ✅ Imported: ${stats.imported}`);
    console.log(`   ⚠️  Skipped: ${stats.skipped}`);
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