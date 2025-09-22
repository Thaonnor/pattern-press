'use strict';

const fs = require('fs');
const path = require('path');

const recipesPath = "C:\\Users\\thaon\\AppData\\Roaming\\PrismLauncher\\instances\\Framework\\minecraft\\local\\kubejs\\export\\recipes";

console.log(`📁 Analyzing recipe folders in: ${recipesPath}\n`);

try {
    const folders = fs.readdirSync(recipesPath, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

    const folderStats = [];

    for (const folder of folders) {
        const folderPath = path.join(recipesPath, folder);
        try {
            const files = fs.readdirSync(folderPath, { withFileTypes: true })
                .filter(entry => entry.isFile() && entry.name.endsWith('.json'));

            folderStats.push({
                folder: folder,
                count: files.length
            });
        } catch (error) {
            console.warn(`⚠️  Could not read folder ${folder}: ${error.message}`);
        }
    }

    // Sort by count (descending)
    folderStats.sort((a, b) => b.count - a.count);

    console.log('📊 JSON files per folder:\n');
    folderStats.forEach((stat, index) => {
        const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📁';
        console.log(`${emoji} ${stat.folder}: ${stat.count} files`);
    });

    const totalFiles = folderStats.reduce((sum, stat) => sum + stat.count, 0);
    console.log(`\n📈 Total: ${totalFiles} JSON files across ${folderStats.length} folders`);

} catch (error) {
    console.error(`💥 Error: ${error.message}`);
}