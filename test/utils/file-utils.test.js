const fs = require('fs');
const path = require('path');

const {
    timestampSlug,
    ensureDirectoryExists,
    writeJsonFile,
    readJsonFile,
    createFileBackup,
    safeWriteFile,
    getFileStats,
    isFile,
    isDirectory
} = require('../../src/utils/file-utils');

describe('file-utils', () => {
    describe('timestampSlug', () => {
        test('generates valid timestamp format', () => {
            const timestamp = timestampSlug();
            expect(timestamp).toMatch(/^\d{8}-\d{6}$/);

            const customDate = new Date('2025-01-15T14:30:45.000Z');
            const customTimestamp = timestampSlug(customDate);
            expect(customTimestamp).toBe('20250115-143045');
        });
    });

    describe('ensureDirectoryExists', () => {
        test('creates directory when missing', () => {
            const testDir = path.join(__dirname, 'temp-test-dir');

            // Cleanup first
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true });
            }

            expect(fs.existsSync(testDir)).toBe(false);

            ensureDirectoryExists(testDir);
            expect(fs.existsSync(testDir)).toBe(true);

            // Cleanup
            fs.rmSync(testDir, { recursive: true });
        });
    });

    describe('writeJsonFile and readJsonFile', () => {
        test('work correctly', () => {
            const testFile = path.join(__dirname, 'temp-test.json');
            const testData = { test: 'data', array: [1, 2, 3] };

            writeJsonFile(testFile, testData);
            expect(fs.existsSync(testFile)).toBe(true);

            const readData = readJsonFile(testFile);
            expect(readData).toEqual(testData);

            // Cleanup
            fs.unlinkSync(testFile);
        });
    });

    describe('isFile and isDirectory', () => {
        test('utility functions', () => {
            expect(isFile(__filename)).toBe(true);
            expect(isDirectory(__dirname)).toBe(true);
            expect(isFile(__dirname)).toBe(false);
            expect(isDirectory(__filename)).toBe(false);
            expect(isFile('nonexistent-file')).toBe(false);
        });
    });
});