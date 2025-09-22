'use strict';

const path = require('path');
const Datastore = require('nedb');
const { findFilesRecursive, readJsonFile } = require('./utils/file-utils');

/**
 * Simple test script to import first 10 minecraft recipes into NeDB
 */

// Initialize database
const db = new Datastore({
    filename: path.join(__dirname, '..', 'data', 'recipes-test.db'),
    autoload: true
});

async function testImport() {
    const recipesPath = "C:\\Users\\thaon\\AppData\\Roaming\\PrismLauncher\\instances\\Framework\\minecraft\\local\\kubejs\\export\\recipes\\minecraft";

    console.log(`🔍 Scanning for JSON files in: ${recipesPath}`);

    try {
        // Find all JSON files in minecraft folder
        const jsonFiles = findFilesRecursive(recipesPath);
        console.log(`📁 Found ${jsonFiles.length} JSON files`);

        // Take first 10 files for testing
        const testFiles = jsonFiles.slice(0, 10);
        console.log(`🧪 Testing with first ${testFiles.length} files\n`);

        let imported = 0;
        let errors = 0;

        for (const filePath of testFiles) {
            try {
                const recipeData = readJsonFile(filePath);
                const fileName = path.basename(filePath, '.json');

                // Simple schema: { id, mod, type, name, data }
                const record = {
                    id: fileName,
                    mod: 'minecraft',
                    type: recipeData.type || 'unknown',
                    name: fileName,
                    data: recipeData,
                    imported_at: new Date()
                };

                // Insert into NeDB
                await new Promise((resolve, reject) => {
                    db.insert(record, (err, newDoc) => {
                        if (err) reject(err);
                        else resolve(newDoc);
                    });
                });

                console.log(`✅ ${fileName} (${record.type})`);
                imported++;

            } catch (error) {
                console.log(`❌ ${path.basename(filePath)}: ${error.message}`);
                errors++;
            }
        }

        console.log(`\n📊 Import Complete:`);
        console.log(`   ✅ Imported: ${imported}`);
        console.log(`   ❌ Errors: ${errors}`);

        // Show what's in the database
        const count = await new Promise((resolve) => {
            db.count({}, (err, count) => resolve(count || 0));
        });
        console.log(`   📦 Total in DB: ${count}`);

    } catch (error) {
        console.error(`💥 Failed to scan directory: ${error.message}`);
        process.exit(1);
    }
}

testImport().catch(console.error);