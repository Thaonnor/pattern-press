const stream = require('stream');

// Mock modules before importing
jest.mock('fs');
jest.mock('readline');
jest.mock('path');

const fs = require('fs');
const readline = require('readline');
const path = require('path');

function createSubject(stubs = {}) {
    const log = [];

    // Set up mocks
    readline.createInterface = jest.fn(({ input }) => {
        const rl = stream.Readable.from(input.split(/\r?\n/));
        rl[Symbol.asyncIterator] = rl[Symbol.asyncIterator].bind(rl);
        return rl;
    });

    fs.existsSync = jest.fn(stubs.existsSync || (() => true));
    fs.createReadStream = jest.fn(stubs.createReadStream || ((_, opts) => opts?.input || ''));

    // Mock fs.promises before the module imports it
    fs.promises = {
        mkdir: jest.fn(stubs.mkdir || (() => Promise.resolve())),
        writeFile: jest.fn(stubs.writeFile || (() => Promise.resolve()))
    };

    path.resolve = jest.fn(stubs.resolve || ((p) => `/abs/${p}`));
    path.join = jest.fn((...parts) => parts.join('/'));
    path.dirname = jest.fn(stubs.dirname || ((p) => p));

    // Override specific mocks if provided
    if (stubs.readline) {
        readline.createInterface = jest.fn(stubs.readline.createInterface);
    }
    if (stubs.path) {
        if (stubs.path.resolve) path.resolve = jest.fn(stubs.path.resolve);
        if (stubs.path.join) path.join = jest.fn(stubs.path.join);
        if (stubs.path.dirname) path.dirname = jest.fn(stubs.path.dirname);
    }

    // Import module after mocks are set up using isolateModules to ensure fresh require
    let subject;
    jest.isolateModules(() => {
        subject = require('../src/log-segmenter');
    });

    return {
        ...subject,
        fsStub: fs,
        log
    };
}

describe('log-segmenter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('RecipeSegment', () => {
        test('stores the expected fields', () => {
            const { RecipeSegment } = require('../src/log-segmenter');
            const segment = new RecipeSegment({
                recipeType: '<recipetype:create:pressing>',
                startLine: 10,
                endLine: 20,
                lines: ['foo', 'bar']
            });

            expect(segment.recipeType).toBe('<recipetype:create:pressing>');
            expect(segment.startLine).toBe(10);
            expect(segment.endLine).toBe(20);
            expect(segment.rawText).toBe('foo\nbar');
        });
    });

    describe('segmentLogContent', () => {
        test('builds segments with default patterns', () => {
            const { segmentLogContent } = require('../src/log-segmenter');
            const content = [
                "Recipe type: '<recipetype:create:pressing>'",
                "<recipetype:create:pressing>.addJsonRecipe()",
                '{',
                '  key: value',
                '}',
                ');',
                '',
                "Recipe type: '<recipetype:minecraft:crafting>'",
                'craftingTable.addShaped()\n(',
                '  pattern',
                ');'
            ].join('\n');

            const segments = segmentLogContent(content);
            expect(segments).toHaveLength(2);
            expect(segments[0].recipeType).toBe('<recipetype:create:pressing>');
            expect(segments[0].startLine).toBe(2);
            expect(segments[0].endLine).toBe(6);
            expect(segments[0].rawText).toContain('addJsonRecipe');
            expect(segments[1].recipeType).toBe('<recipetype:minecraft:crafting>');
        });

        test('respects custom start patterns', () => {
            const { segmentLogContent } = require('../src/log-segmenter');
            const content = 'customHandler.foo()\n();';

            const segments = segmentLogContent(content, {
                startPatterns: [/^customHandler\.foo/]
            });

            expect(segments).toHaveLength(1);
        });

        test('rejects non-string input', () => {
            const { segmentLogContent } = require('../src/log-segmenter');
            expect(() => segmentLogContent(null)).toThrow(/must be a string/);
        });
    });

    describe('segmentLogFile', () => {
        test('streams the file and segments content', async () => {
            const fileContent = [
                "Recipe type: '<recipetype:create:pressing>'",
                '<recipetype:create:pressing>.foo()',
                '();'
            ].join('\n');

            const subject = createSubject({
                createReadStream: () => fileContent
            });

            const segments = await subject.segmentLogFile('crafttweaker.log');
            expect(segments).toHaveLength(1);
            expect(segments[0].startLine).toBe(2);
            expect(segments[0].endLine).toBe(3);
        });

        test('throws when file is missing', async () => {
            const subject = createSubject({ existsSync: () => false });

            await expect(subject.segmentLogFile('missing.log')).rejects.toThrow(/Log file not found/);
        });
    });

    describe('persistSegments', () => {
        test('writes summary to disk', async () => {
            const written = [];
            const subject = createSubject({
                writeFile: async (filePath, payload) => {
                    written.push({ filePath, payload });
                }
            });

            const segments = subject.segmentLogContent(
                "Recipe type: '<recipetype:create:pressing>'\n<recipetype:create:pressing>.foo()\n();"
            );

            const filePath = await subject.persistSegments(segments, './out', {
                prefix: 'test',
                includeRaw: false
            });

            expect(filePath).toMatch(/test-\d{8}-\d{6}\.json$/);
            expect(written).toHaveLength(1);
            const payload = JSON.parse(written[0].payload);
            expect(payload.segments[0].rawText).toBeUndefined();
        });

        test('includes raw text when includeRaw=true', async () => {
            const written = [];
            const subject = createSubject({
                writeFile: async (filePath, payload) => {
                    written.push({ filePath, payload });
                }
            });

            const segments = subject.segmentLogContent(
                "Recipe type: '<recipetype:create:pressing>'\n<recipetype:create:pressing>.foo()\n();"
            );

            await subject.persistSegments(segments, './out', {
                prefix: 'test',
                includeRaw: true
            });

            const payload = JSON.parse(written[0].payload);
            expect(payload.segments[0].rawText.length).toBeGreaterThan(0);
        });
    });
});
