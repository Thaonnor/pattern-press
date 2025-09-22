// Mock modules before importing
jest.mock('fs');
jest.mock('path');
jest.mock('../src/parsers');

const fs = require('fs');
const path = require('path');
const parsers = require('../src/parsers');

function createHarness({ summary, processImpl, resolveImpl, writeImpl } = {}) {
    const logs = [];
    const warns = [];
    const writes = [];
    const processCalls = [];
    const resolvedPaths = [];

    // Set up mocks
    fs.writeFileSync = jest.fn((...args) => {
        writes.push(args);
        if (typeof writeImpl === 'function') {
            return writeImpl(...args);
        }
        return undefined;
    });

    path.resolve = jest.fn((outputPath) => {
        resolvedPaths.push(outputPath);
        if (typeof resolveImpl === 'function') {
            return resolveImpl(outputPath);
        }
        return `/abs/${outputPath}`;
    });

    parsers.processSegmentFile = jest.fn(async (segmentPath) => {
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
    });

    // Import module after mocks are set up using isolateModules to ensure fresh require
    let subject;
    jest.isolateModules(() => {
        subject = require('../src/parse-segments');
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

describe('parse-segments CLI', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('runCli rejects with usage banner when no arguments are provided', async () => {
        const { runCli, USAGE } = createHarness();

        await expect(runCli([])).rejects.toThrow(USAGE);
    });

    test('runCli warns on unknown arguments and requires a segment path', async () => {
        const harness = createHarness();

        await expect(harness.runCli(['--mystery'], { logger: harness.loggerWithWarn })).rejects.toThrow('Missing path to segment JSON file.');
        expect(harness.warns).toEqual(['Unknown argument ignored: --mystery']);
    });

    test('runCli enforces a value for --out option', async () => {
        const harness = createHarness();

        await expect(harness.runCli(['segments.json', '--out'], { logger: harness.loggerWithWarn })).rejects.toThrow('Missing value for --out option.');
    });

    test('runCli processes segments and returns summary metadata', async () => {
        const summary = { total: 5, parsed: 4, errors: 1, unhandled: 0 };
        const harness = createHarness({ summary });

        const result = await harness.runCli(['segments.json'], { logger: harness.loggerWithWarn });

        expect(harness.processCalls).toEqual(['segments.json']);
        expect(result.summary).toEqual(summary);
        expect(result.segmentPath).toBe('segments.json');
        expect(result.outputPath).toBeNull();
        expect(harness.logs).toEqual([
            'Processed 5 segments.',
            '  Parsed: 4',
            '  Errors: 1',
            '  Unhandled: 0'
        ]);
    });

    test('runCli writes summary to disk when --out is supplied', async () => {
        const summary = { total: 2, parsed: 2, errors: 0, unhandled: 0 };
        const harness = createHarness({ summary });

        const result = await harness.runCli(['segments.json', '--out', 'results.json'], {
            logger: harness.loggerWithWarn
        });

        expect(harness.resolvedPaths[0]).toBe('results.json');
        expect(harness.writes).toHaveLength(1);
        expect(harness.writes[0][0]).toBe('/abs/results.json');
        expect(harness.writes[0][2]).toBe('utf8');
        expect(JSON.parse(harness.writes[0][1])).toEqual(summary);
        expect(result.outputPath).toBe('/abs/results.json');
    });

    test('runCli logs unknown flags even when logger.warn is unavailable', async () => {
        const harness = createHarness();

        await harness.runCli(['segments.json', '--extra'], { logger: harness.loggerWithoutWarn });

        expect(harness.logs).toContain('Unknown argument ignored: --extra');
        expect(harness.processCalls).toEqual(['segments.json']);
    });

    test('runCli surfaces processing failures with helpful context', async () => {
        const harness = createHarness({
            processImpl: () => {
                throw new Error('boom');
            }
        });

        await expect(harness.runCli(['segments.json'], { logger: harness.loggerWithWarn })).rejects.toThrow('Failed to process segments: boom');
    });
});
