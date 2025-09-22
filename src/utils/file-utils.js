'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Generates a timestamp slug in the format YYYYMMDD-HHMMSS for file naming.
 *
 * @param {Date} [date=new Date()] Date to use for timestamp generation.
 * @returns {string} Timestamp slug suitable for file names.
 */
function timestampSlug(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hour = pad(date.getUTCHours());
    const minute = pad(date.getUTCMinutes());
    const second = pad(date.getUTCSeconds());
    return `${year}${month}${day}-${hour}${minute}${second}`;
}

/**
 * Ensures a directory exists, creating it recursively if needed.
 *
 * @param {string} dirPath Path to the directory to ensure exists.
 * @returns {void}
 */
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Writes JSON data to a file with consistent formatting.
 *
 * @param {string} filePath Path to the file to write.
 * @param {any} data Data to serialize as JSON.
 * @param {string} [encoding='utf8'] File encoding.
 * @returns {void}
 */
function writeJsonFile(filePath, data, encoding = 'utf8') {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonString, encoding);
}

/**
 * Reads and parses a JSON file.
 *
 * @param {string} filePath Path to the JSON file to read.
 * @param {string} [encoding='utf8'] File encoding.
 * @returns {any} Parsed JSON data.
 * @throws {Error} When file cannot be read or JSON is invalid.
 */
function readJsonFile(filePath, encoding = 'utf8') {
    try {
        const content = fs.readFileSync(filePath, encoding);
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
    }
}

/**
 * Creates a backup copy of a file with a timestamp suffix.
 *
 * @param {string} filePath Path to the file to backup.
 * @param {string} [suffix] Custom suffix instead of timestamp.
 * @returns {string} Path to the backup file.
 * @throws {Error} When backup operation fails.
 */
function createFileBackup(filePath, suffix) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Cannot backup non-existent file: ${filePath}`);
    }

    const timestamp = suffix || timestampSlug();
    const ext = path.extname(filePath);
    const base = filePath.replace(ext, '');
    const backupPath = `${base}-backup-${timestamp}${ext}`;

    try {
        fs.copyFileSync(filePath, backupPath);
        return backupPath;
    } catch (error) {
        throw new Error(`Failed to create backup: ${error.message}`);
    }
}

/**
 * Safely writes data to a file with automatic backup of existing content.
 *
 * @param {string} filePath Path to the file to write.
 * @param {string|Buffer} data Data to write.
 * @param {Object} [options] Write options.
 * @param {string} [options.encoding='utf8'] File encoding.
 * @param {boolean} [options.backup=true] Whether to create backup of existing file.
 * @returns {string|null} Path to backup file if created, null otherwise.
 */
function safeWriteFile(filePath, data, options = {}) {
    const { encoding = 'utf8', backup = true } = options;
    let backupPath = null;

    if (backup && fs.existsSync(filePath)) {
        backupPath = createFileBackup(filePath);
    }

    fs.writeFileSync(filePath, data, encoding);
    return backupPath;
}

/**
 * Gets file stats safely, returning null if file doesn't exist.
 *
 * @param {string} filePath Path to the file.
 * @returns {fs.Stats|null} File stats or null if file doesn't exist.
 */
function getFileStats(filePath) {
    try {
        return fs.statSync(filePath);
    } catch (error) {
        return null;
    }
}

/**
 * Checks if a path exists and is a file.
 *
 * @param {string} filePath Path to check.
 * @returns {boolean} True if path exists and is a file.
 */
function isFile(filePath) {
    const stats = getFileStats(filePath);
    return stats ? stats.isFile() : false;
}

/**
 * Checks if a path exists and is a directory.
 *
 * @param {string} dirPath Path to check.
 * @returns {boolean} True if path exists and is a directory.
 */
function isDirectory(dirPath) {
    const stats = getFileStats(dirPath);
    return stats ? stats.isDirectory() : false;
}

/**
 * Recursively finds all files with specified extensions in a directory and its subdirectories.
 *
 * @param {string} dirPath Directory to search.
 * @param {Object} [options] Search options.
 * @param {string[]} [options.extensions=['.json']] File extensions to include.
 * @returns {string[]} Array of absolute file paths.
 * @throws {Error} When directory doesn't exist or can't be read.
 */
function findFilesRecursive(dirPath, options = {}) {
    const { extensions = ['.json'] } = options;

    if (!isDirectory(dirPath)) {
        throw new Error(`Directory does not exist or is not accessible: ${dirPath}`);
    }

    const results = [];

    function scan(currentDir) {
        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    scan(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (extensions.includes(ext)) {
                        results.push(fullPath);
                    }
                }
            }
        } catch (error) {
            // Skip directories we can't read (permissions, etc.)
            console.warn(`Warning: Could not read directory ${currentDir}: ${error.message}`);
        }
    }

    scan(dirPath);
    return results;
}

module.exports = {
    timestampSlug,
    ensureDirectoryExists,
    writeJsonFile,
    readJsonFile,
    createFileBackup,
    safeWriteFile,
    getFileStats,
    isFile,
    isDirectory,
    findFilesRecursive
};