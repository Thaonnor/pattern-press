const test = require('tape');
const proxyquire = require('proxyquire');

function createHarness({ summary, processImpl, resolveImpl, writeImpl } = {}) {
    const logs = [];
    const warns = [];
    const writes = [];
    const processCalls = [];
    const resolvedPaths = [];

    const fsStub = {
        writeFileSync: (...args) => {
            writes.push(args);
            if (typeof writeImpl === 'function') {
                return writeImpl(...args);
            }
            return undefined;
        }
    };

    const pathStub = {
        resolve: (outputPath) => {
            resolvedPaths.push(outputPath);
            if (typeof resolveImpl === 'function') {
                return resolveImpl(outputPath);
            }
            return `/abs/${outputPath}`;
        }
    };

    const parsersStub = {
        processSegmentFile: async (segmentPath) => {
            processCalls.push(segmentPath);
            if (typeof processImpl === 'function') {
                return processImpl(segmentPath);
            }
            return (
                summary || {
                    total: 3,
                    parsed: 2,
                    errors: 0,
                    unhandled: 1
                }
            );
        }
    };

    const subject = proxyquire('../src/parse-segments', {
        fs: fsStub,
        path: pathStub,
        './parsers': parsersStub
    });

    const loggerWithWarn = {
        log: (message) => logs.push(message),
        warn: (message) => warns.push(message)
    };

    const loggerWithoutWarn = {
        log: (message) => logs.push(message)
    };

    return {
        ...subject,
        logs,
        warns,
        writes,
        processCalls,
        resolvedPaths,
        loggerWithWarn,
        loggerWithoutWarn
    };
}

test('runCli rejects with usage banner when no arguments are provided', async (t) => {
    t.plan(1);
    const { runCli, USAGE } = createHarness();

    try {
        await runCli([]);
        t.fail('runCli should reject when missing arguments');
    } catch (error) {
        t.equal(error.message, USAGE, 'usage banner is surfaced to the caller');
    }
});

test('runCli warns on unknown arguments and requires a segment path', async (t) => {
    t.plan(2);
    const harness = createHarness();

    try {
        await harness.runCli(['--mystery'], { logger: harness.loggerWithWarn });
        t.fail('runCli should reject when segment path is missing');
    } catch (error) {
        t.equal(error.message, 'Missing path to segment JSON file.', 'missing segment path is reported');
        t.deepEqual(harness.warns, ['Unknown argument ignored: --mystery'], 'unknown flag triggers warning');
    }
});

test('runCli enforces a value for --out option', async (t) => {
    t.plan(1);
    const harness = createHarness();

    try {
        await harness.runCli(['segments.json', '--out'], { logger: harness.loggerWithWarn });
        t.fail('runCli should reject when --out value is missing');
    } catch (error) {
        t.equal(error.message, 'Missing value for --out option.', '--out must be followed by a path');
    }
});

test('runCli processes segments and returns summary metadata', async (t) => {
    t.plan(5);
    const summary = { total: 5, parsed: 4, errors: 1, unhandled: 0 };
    const harness = createHarness({ summary });

    const result = await harness.runCli(['segments.json'], { logger: harness.loggerWithWarn });

    t.deepEqual(harness.processCalls, ['segments.json'], 'segment file is forwarded to parser');
    t.deepEqual(result.summary, summary, 'summary is returned to the caller');
    t.equal(result.segmentPath, 'segments.json', 'segment path metadata returned');
    t.equal(result.outputPath, null, 'output path is null when not provided');
    t.deepEqual(
        harness.logs,
        [
            'Processed 5 segments.',
            '  Parsed: 4',
            '  Errors: 1',
            '  Unhandled: 0'
        ],
        'progress details are logged'
    );
});

test('runCli writes summary to disk when --out is supplied', async (t) => {
    t.plan(6);
    const summary = { total: 2, parsed: 2, errors: 0, unhandled: 0 };
    const harness = createHarness({ summary });

    const result = await harness.runCli(['segments.json', '--out', 'results.json'], {
        logger: harness.loggerWithWarn
    });

    t.equal(harness.resolvedPaths[0], 'results.json', 'output path is resolved relative to cwd');
    t.equal(harness.writes.length, 1, 'summary is written once');
    t.equal(harness.writes[0][0], '/abs/results.json', 'resolved path is used for writing');
    t.equal(harness.writes[0][2], 'utf8', 'summary written with utf8 encoding');
    t.deepEqual(JSON.parse(harness.writes[0][1]), summary, 'stringified summary payload matches');
    t.equal(result.outputPath, '/abs/results.json', 'resolved output path returned to caller');
});

test('runCli logs unknown flags even when logger.warn is unavailable', async (t) => {
    t.plan(2);
    const harness = createHarness();

    await harness.runCli(['segments.json', '--extra'], { logger: harness.loggerWithoutWarn });

    t.ok(harness.logs.includes('Unknown argument ignored: --extra'), 'log fallback used for warnings');
    t.deepEqual(harness.processCalls, ['segments.json'], 'segment processing still occurs');
});

test('runCli surfaces processing failures with helpful context', async (t) => {
    t.plan(1);
    const harness = createHarness({
        processImpl: () => {
            throw new Error('boom');
        }
    });

    try {
        await harness.runCli(['segments.json'], { logger: harness.loggerWithWarn });
        t.fail('runCli should reject when processing fails');
    } catch (error) {
        t.equal(error.message, 'Failed to process segments: boom', 'error message includes original failure');
    }
});
