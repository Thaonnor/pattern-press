const test = require('tape');
const proxyquire = require('proxyquire');
const stream = require('stream');

function createSubject(stubs = {}) {
    const log = [];

    const readlineInterface = {
        close: () => {
            /* noop */
        }
    };

    const readlineStub = {
        createInterface: ({ input }) => {
            const rl = stream.Readable.from(input.split(/\r?\n/));
            rl[Symbol.asyncIterator] = rl[Symbol.asyncIterator].bind(rl);
            return rl;
        }
    };

    const fsStub = {
        existsSync: stubs.existsSync || (() => true),
        createReadStream: stubs.createReadStream || ((_, opts) => opts?.input || ''),
        promises: {
            mkdir: stubs.mkdir || (() => Promise.resolve()),
            writeFile: stubs.writeFile || (() => Promise.resolve())
        }
    };

    const subject = proxyquire('../src/log-segmenter', {
        fs: fsStub,
        readline: stubs.readline || readlineStub,
        path: stubs.path || {
            resolve: (p) => `/abs/${p}`,
            join: (...parts) => parts.join('/'),
            dirname: (p) => p
        }
    });

    return {
        ...subject,
        fsStub,
        log
    };
}

test('RecipeSegment stores the expected fields', (t) => {
    const { RecipeSegment } = require('../src/log-segmenter');
    const segment = new RecipeSegment({
        recipeType: '<recipetype:create:pressing>',
        startLine: 10,
        endLine: 20,
        lines: ['foo', 'bar']
    });

    t.equal(segment.recipeType, '<recipetype:create:pressing>');
    t.equal(segment.startLine, 10);
    t.equal(segment.endLine, 20);
    t.equal(segment.rawText, 'foo\nbar');
    t.end();
});

test('segmentLogContent builds segments with default patterns', (t) => {
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
    t.equal(segments.length, 2, 'two segments created');
    t.equal(segments[0].recipeType, '<recipetype:create:pressing>', 'recipe type tracked');
    t.equal(segments[0].startLine, 2, 'start line captured');
    t.equal(segments[0].endLine, 6, 'end line captured');
    t.ok(segments[0].rawText.includes('addJsonRecipe'), 'raw text preserved');
    t.equal(segments[1].recipeType, '<recipetype:minecraft:crafting>', 'recipe type carried forward');
    t.end();
});

test('segmentLogContent respects custom start patterns', (t) => {
    const { segmentLogContent } = require('../src/log-segmenter');
    const content = 'customHandler.foo()\n();';

    const segments = segmentLogContent(content, {
        startPatterns: [/^customHandler\.foo/]
    });

    t.equal(segments.length, 1, 'custom pattern matched');
    t.end();
});

test('segmentLogContent rejects non-string input', (t) => {
    const { segmentLogContent } = require('../src/log-segmenter');
    t.throws(() => segmentLogContent(null), /must be a string/);
    t.end();
});

test('segmentLogFile streams the file and segments content', async (t) => {
    t.plan(3);
    const fileContent = [
        "Recipe type: '<recipetype:create:pressing>'",
        '<recipetype:create:pressing>.foo()',
        '();'
    ].join('\n');

    const subject = createSubject({
        createReadStream: () => fileContent
    });

    const segments = await subject.segmentLogFile('crafttweaker.log');
    t.equal(segments.length, 1, 'segment produced from stream');
    t.equal(segments[0].startLine, 2, 'line counting preserved');
    t.equal(segments[0].endLine, 3, 'end line recorded');
});

test('segmentLogFile throws when file is missing', async (t) => {
    t.plan(1);
    const subject = createSubject({ existsSync: () => false });

    try {
        await subject.segmentLogFile('missing.log');
        t.fail('expected rejection when file missing');
    } catch (error) {
        t.match(error.message, /Log file not found/, 'missing file error forwarded');
    }
});

test('persistSegments writes summary to disk', async (t) => {
    t.plan(3);
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

    t.match(filePath, /test-\d{8}-\d{6}\.json$/, 'output uses timestamped filename');
    t.equal(written.length, 1, 'write invoked');
    const payload = JSON.parse(written[0].payload);
    t.equal(payload.segments[0].rawText, undefined, 'raw text omitted when includeRaw=false');
});

test('persistSegments includes raw text when includeRaw=true', async (t) => {
    t.plan(1);
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
    t.ok(payload.segments[0].rawText.length > 0, 'raw text retained when requested');
});
