'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Recursively finds all JSON files in a directory and its subdirectories.
 */
function findJsonFiles(dirPath) {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        throw new Error(`Directory does not exist: ${dirPath}`);
    }

    const results = [];

    function scan(currentDir) {
        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    scan(fullPath);
                } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
                    results.push(fullPath);
                }
            }
        } catch (error) {
            console.warn(`Warning: Could not read directory ${currentDir}: ${error.message}`);
        }
    }

    scan(dirPath);
    return results;
}

/**
 * Safely reads and parses a JSON file.
 */
function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
    }
}

/**
 * Ensures a directory exists, creating it recursively if needed.
 */
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Writes JSON data to a file with consistent formatting.
 */
function writeJsonFile(filePath, data) {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonString, 'utf8');
}

/**
 * Loads import configuration from config/import.json
 */
function loadImportConfig() {
    const configPath = path.join(__dirname, '..', 'config', 'import.json');

    if (!fs.existsSync(configPath)) {
        throw new Error(`Import configuration not found: ${configPath}`);
    }

    return readJsonFile(configPath);
}

module.exports = {
    findJsonFiles,
    readJsonFile,
    ensureDirectoryExists,
    writeJsonFile,
    loadImportConfig
};