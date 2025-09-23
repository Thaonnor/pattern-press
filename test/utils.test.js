'use strict';

const fs = require('fs');
const path = require('path');
const { findJsonFiles, readJsonFile, ensureDirectoryExists, writeJsonFile, loadImportConfig } = require('../src/utils');

describe('utils.js', () => {
    const testDir = path.join(__dirname, 'temp');

    beforeEach(() => {
        // Clean up test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        // Clean up test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('findJsonFiles', () => {
        it('should find JSON files in directory', () => {
            // Setup test directory with JSON files
            ensureDirectoryExists(testDir);
            fs.writeFileSync(path.join(testDir, 'test1.json'), '{}');
            fs.writeFileSync(path.join(testDir, 'test2.json'), '{}');
            fs.writeFileSync(path.join(testDir, 'test.txt'), 'not json');

            const result = findJsonFiles(testDir);

            expect(result).toHaveLength(2);
            expect(result).toContain(path.join(testDir, 'test1.json'));
            expect(result).toContain(path.join(testDir, 'test2.json'));
        });

        it('should find JSON files recursively', () => {
            // Setup nested directory structure
            const subDir = path.join(testDir, 'sub');
            ensureDirectoryExists(subDir);
            fs.writeFileSync(path.join(testDir, 'root.json'), '{}');
            fs.writeFileSync(path.join(subDir, 'nested.json'), '{}');

            const result = findJsonFiles(testDir);

            expect(result).toHaveLength(2);
            expect(result).toContain(path.join(testDir, 'root.json'));
            expect(result).toContain(path.join(subDir, 'nested.json'));
        });

        it('should throw error for non-existent directory', () => {
            expect(() => {
                findJsonFiles('/non/existent/path');
            }).toThrow('Directory does not exist');
        });

        it('should handle case-insensitive JSON extensions', () => {
            ensureDirectoryExists(testDir);
            fs.writeFileSync(path.join(testDir, 'test.JSON'), '{}');
            fs.writeFileSync(path.join(testDir, 'other.json'), '{}');

            const result = findJsonFiles(testDir);

            expect(result).toHaveLength(2);
        });
    });

    describe('readJsonFile', () => {
        it('should read and parse valid JSON file', () => {
            const testFile = path.join(testDir, 'test.json');
            const testData = { name: 'test', value: 42 };

            ensureDirectoryExists(testDir);
            fs.writeFileSync(testFile, JSON.stringify(testData));

            const result = readJsonFile(testFile);

            expect(result).toEqual(testData);
        });

        it('should throw error for invalid JSON', () => {
            const testFile = path.join(testDir, 'invalid.json');

            ensureDirectoryExists(testDir);
            fs.writeFileSync(testFile, 'invalid json content');

            expect(() => {
                readJsonFile(testFile);
            }).toThrow('Failed to read JSON file');
        });

        it('should throw error for non-existent file', () => {
            expect(() => {
                readJsonFile('/non/existent/file.json');
            }).toThrow('Failed to read JSON file');
        });
    });

    describe('ensureDirectoryExists', () => {
        it('should create directory if it does not exist', () => {
            const newDir = path.join(testDir, 'new', 'nested', 'dir');

            expect(fs.existsSync(newDir)).toBe(false);

            ensureDirectoryExists(newDir);

            expect(fs.existsSync(newDir)).toBe(true);
            expect(fs.statSync(newDir).isDirectory()).toBe(true);
        });

        it('should not fail if directory already exists', () => {
            ensureDirectoryExists(testDir);

            expect(() => {
                ensureDirectoryExists(testDir);
            }).not.toThrow();
        });
    });

    describe('writeJsonFile', () => {
        it('should write JSON data to file', () => {
            const testFile = path.join(testDir, 'output.json');
            const testData = { name: 'test', items: [1, 2, 3] };

            ensureDirectoryExists(testDir);
            writeJsonFile(testFile, testData);

            expect(fs.existsSync(testFile)).toBe(true);

            const written = JSON.parse(fs.readFileSync(testFile, 'utf8'));
            expect(written).toEqual(testData);
        });

        it('should format JSON with proper indentation', () => {
            const testFile = path.join(testDir, 'formatted.json');
            const testData = { nested: { object: true } };

            ensureDirectoryExists(testDir);
            writeJsonFile(testFile, testData);

            const content = fs.readFileSync(testFile, 'utf8');
            expect(content).toContain('  "nested": {');
            expect(content).toContain('    "object": true');
        });
    });

    describe('loadImportConfig', () => {
        it('should load import configuration', () => {
            const result = loadImportConfig();

            expect(result).toHaveProperty('mods');
            expect(result).toHaveProperty('recipeTypes');
            expect(result).toHaveProperty('logging');
            expect(Array.isArray(result.mods)).toBe(true);
            expect(result.mods).toContain('minecraft');
            expect(Array.isArray(result.recipeTypes)).toBe(true);
        });

        it('should throw error if config file does not exist', () => {
            // Mock the config path to non-existent location
            const originalJoin = path.join;
            jest.spyOn(path, 'join').mockImplementation((...args) => {
                if (args.includes('config') && args.includes('import.json')) {
                    return '/non/existent/config.json';
                }
                return originalJoin(...args);
            });

            expect(() => {
                loadImportConfig();
            }).toThrow('Import configuration not found');

            path.join.mockRestore();
        });
    });
});