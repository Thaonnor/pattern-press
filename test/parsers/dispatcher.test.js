const fs = require('fs');
const path = require('path');

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

const { RecipeDispatcher, loadSegments, processSegments } = require('../../src/parsers/dispatcher');

function createMockHandler(name, canParseScore = 1, parseResult = { data: 'test' }, options = {}) {
    const calls = {
        canParse: [],
        parse: []
    };

    return {
        name,
        calls,
        canParse: jest.fn(async (segment, context) => {
            calls.canParse.push({ segment, context });
            if (options.canParseError) {
                throw new Error(options.canParseError);
            }
            return typeof canParseScore === 'function' ? canParseScore(segment, context) : canParseScore;
        }),
        parse: jest.fn(async (segment, context) => {
            calls.parse.push({ segment, context });
            if (options.parseError) {
                throw new Error(options.parseError);
            }
            return typeof parseResult === 'function' ? parseResult(segment, context) : parseResult;
        })
    };
}

describe('RecipeDispatcher', () => {
    let mockLogger;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogger = {
            log: jest.fn(),
            warn: jest.fn()
        };
    });

    describe('constructor', () => {
        test('initializes with default values', () => {
            const dispatcher = new RecipeDispatcher();

            expect(dispatcher.handlers).toEqual([]);
            expect(dispatcher.logger).toBe(console);
            expect(typeof dispatcher.registerHandler).toBe('function');
        });

        test('accepts initial handlers and logger', () => {
            const initialHandlers = [{ name: 'test' }];
            const customLogger = { warn: jest.fn() };

            const dispatcher = new RecipeDispatcher({
                handlers: initialHandlers,
                logger: customLogger
            });

            expect(dispatcher.handlers).toBe(initialHandlers);
            expect(dispatcher.logger).toBe(customLogger);
        });
    });

    describe('registerHandler', () => {
        test('validates handler interface', () => {
            const dispatcher = new RecipeDispatcher();

            expect(() => dispatcher.registerHandler(null)).toThrow(/must implement/);
            expect(() => dispatcher.registerHandler({})).toThrow(/must implement/);
            expect(() => dispatcher.registerHandler({ canParse: 'not-function' })).toThrow(/must implement/);

            const validHandler = { canParse: jest.fn(), parse: jest.fn() };
            dispatcher.registerHandler(validHandler);
            expect(dispatcher.handlers).toHaveLength(1);
        });

        test('adds handler to collection', () => {
            const dispatcher = new RecipeDispatcher();
            const handler1 = createMockHandler('handler1');
            const handler2 = createMockHandler('handler2');

            dispatcher.registerHandler(handler1);
            expect(dispatcher.handlers).toHaveLength(1);

            dispatcher.registerHandler(handler2);
            expect(dispatcher.handlers).toHaveLength(2);
            expect(dispatcher.handlers).toEqual([handler1, handler2]);
        });
    });

    describe('dispatch', () => {
        test('returns unhandled when no handlers registered', async () => {
            const dispatcher = new RecipeDispatcher();
            const segment = { rawText: 'test', startLine: 1, endLine: 1 };

            const result = await dispatcher.dispatch(segment);

            expect(result).toEqual({ status: 'unhandled' });
        });

        test('skips handlers that return zero score', async () => {
            const dispatcher = new RecipeDispatcher({ logger: mockLogger });
            const handler1 = createMockHandler('handler1', 0);
            const handler2 = createMockHandler('handler2', 1, { success: true });

            dispatcher.registerHandler(handler1);
            dispatcher.registerHandler(handler2);

            const segment = { rawText: 'test', startLine: 1, endLine: 1 };
            const result = await dispatcher.dispatch(segment);

            expect(handler1.calls.canParse).toHaveLength(1);
            expect(handler1.calls.parse).toHaveLength(0);
            expect(result.status).toBe('parsed');
        });

        test('uses first handler with positive score', async () => {
            const dispatcher = new RecipeDispatcher({ logger: mockLogger });
            const handler1 = createMockHandler('handler1', 0.5, { first: true });
            const handler2 = createMockHandler('handler2', 0.8, { second: true });

            dispatcher.registerHandler(handler1);
            dispatcher.registerHandler(handler2);

            const segment = { rawText: 'test', startLine: 1, endLine: 1 };
            const result = await dispatcher.dispatch(segment);

            expect(handler1.calls.parse).toHaveLength(1);
            expect(handler2.calls.canParse).toHaveLength(0);
            expect(result.status).toBe('parsed');
            expect(result.result).toEqual({ first: true });
        });

        test('includes handler metadata in parsed result', async () => {
            const dispatcher = new RecipeDispatcher({ logger: mockLogger });
            const handler = createMockHandler('test-handler', 0.7, { data: 'parsed' });

            dispatcher.registerHandler(handler);

            const segment = { rawText: 'test', startLine: 1, endLine: 1 };
            const result = await dispatcher.dispatch(segment);

            expect(result.handler).toBe('test-handler');
            expect(result.score).toBe(0.7);
            expect(result.result).toEqual({ data: 'parsed' });
        });

        test('passes context and score to parse method', async () => {
            const dispatcher = new RecipeDispatcher({ logger: mockLogger });
            const handler = createMockHandler('handler', 0.9);

            dispatcher.registerHandler(handler);

            const segment = { rawText: 'test', startLine: 1, endLine: 1 };
            const context = { custom: 'context' };
            await dispatcher.dispatch(segment, context);

            const parseCall = handler.calls.parse[0];
            expect(parseCall.context.custom).toBe('context');
            expect(parseCall.context.handlerScore).toBe(0.9);
        });

        test('logs and continues when canParse throws error', async () => {
            const dispatcher = new RecipeDispatcher({ logger: mockLogger });
            const handler1 = createMockHandler('failing-handler', 1, {}, { canParseError: 'canParse failed' });
            const handler2 = createMockHandler('working-handler', 1, { success: true });

            dispatcher.registerHandler(handler1);
            dispatcher.registerHandler(handler2);

            const segment = { rawText: 'test', startLine: 1, endLine: 1 };
            const result = await dispatcher.dispatch(segment);

            expect(mockLogger.warn).toHaveBeenCalledTimes(1);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringMatching(/failing-handler.*failed during canParse.*canParse failed/)
            );
            expect(handler2.calls.canParse).toHaveLength(1);
            expect(result.status).toBe('parsed');
        });

        test('returns error status when parse throws error', async () => {
            const dispatcher = new RecipeDispatcher({ logger: mockLogger });
            const handler = createMockHandler('failing-handler', 1, {}, { parseError: 'parse failed' });

            dispatcher.registerHandler(handler);

            const segment = { rawText: 'test', startLine: 5, endLine: 10 };
            const result = await dispatcher.dispatch(segment);

            expect(result.status).toBe('error');
            expect(result.handler).toBe('failing-handler');
            expect(result.error).toBe('parse failed');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringMatching(/failing-handler.*failed to parse segment at lines 5-10.*parse failed/)
            );
        });

        test('handles handlers without name property', async () => {
            const dispatcher = new RecipeDispatcher({ logger: mockLogger });
            const handler = createMockHandler(undefined, 1, { data: 'test' });
            delete handler.name;

            dispatcher.registerHandler(handler);

            const segment = { rawText: 'test', startLine: 1, endLine: 1 };
            const result = await dispatcher.dispatch(segment);

            expect(result.handler).toBe('unknown-handler');
            expect(result.status).toBe('parsed');
        });

        test('handles async and sync handlers', async () => {
            const dispatcher = new RecipeDispatcher({ logger: mockLogger });

            const syncHandler = {
                name: 'sync-handler',
                canParse: jest.fn(() => 1),
                parse: jest.fn(() => ({ sync: true }))
            };

            const asyncHandler = {
                name: 'async-handler',
                canParse: jest.fn(async () => 0),
                parse: jest.fn(async () => ({ async: true }))
            };

            dispatcher.registerHandler(asyncHandler);
            dispatcher.registerHandler(syncHandler);

            const segment = { rawText: 'test', startLine: 1, endLine: 1 };
            const result = await dispatcher.dispatch(segment);

            expect(result.handler).toBe('sync-handler');
            expect(result.result).toEqual({ sync: true });
        });

        test('preserves segment properties in context', async () => {
            const dispatcher = new RecipeDispatcher({ logger: mockLogger });
            const handler = createMockHandler('handler', 1);

            dispatcher.registerHandler(handler);

            const segment = {
                rawText: 'test',
                startLine: 5,
                endLine: 10,
                recipeType: '<recipetype:test>',
                customProperty: 'value'
            };

            await dispatcher.dispatch(segment, { existing: 'context' });

            const canParseCall = handler.calls.canParse[0];
            expect(canParseCall.segment).toEqual(segment);
        });
    });
});

describe('processSegments', () => {
    let dispatcher;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            log: jest.fn(),
            warn: jest.fn()
        };
        dispatcher = new RecipeDispatcher({ logger: mockLogger });
    });

    test('processes array of segments independently', async () => {
        const handler = createMockHandler('handler', 1, (segment) => ({ id: segment.id }));
        dispatcher.registerHandler(handler);

        const segments = [
            { id: 'seg1', rawText: 'recipe1', startLine: 1, endLine: 2 },
            { id: 'seg2', rawText: 'recipe2', startLine: 3, endLine: 4 }
        ];

        const results = await processSegments(dispatcher, segments);

        expect(results).toHaveLength(2);
        expect(results[0].id).toBe('seg1');
        expect(results[0].dispatch.status).toBe('parsed');
        expect(results[1].dispatch.result).toEqual({ id: 'seg2' });
    });

    test('uses context factory when provided', async () => {
        const handler = createMockHandler('handler', 1);
        dispatcher.registerHandler(handler);

        const segments = [{ id: 'seg1', rawText: 'test', startLine: 1, endLine: 1 }];
        const contextFactory = (segment) => ({ segmentId: segment.id });

        await processSegments(dispatcher, segments, contextFactory);

        expect(handler.calls.canParse).toHaveLength(1);
        expect(handler.calls.canParse[0].context.segmentId).toBe('seg1');
    });

    test('handles null context from factory', async () => {
        const handler = createMockHandler('handler', 1);
        dispatcher.registerHandler(handler);

        const segments = [{ id: 'seg1', rawText: 'test', startLine: 1, endLine: 1 }];
        const contextFactory = () => null;

        await processSegments(dispatcher, segments, contextFactory);

        expect(handler.calls.canParse[0].context).toEqual({});
    });
});

describe('loadSegments', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('reads and parses JSON file', () => {
        const segmentData = {
            generatedAt: '2023-01-01T00:00:00.000Z',
            count: 1,
            segments: [{ id: 'test', rawText: 'recipe' }]
        };

        path.resolve.mockReturnValue('/abs/segments.json');
        fs.readFileSync.mockReturnValue(JSON.stringify(segmentData));

        const segments = loadSegments('segments.json');

        expect(path.resolve).toHaveBeenCalledWith('segments.json');
        expect(fs.readFileSync).toHaveBeenCalledWith('/abs/segments.json', 'utf8');
        expect(segments).toEqual(segmentData.segments);
    });

    test('validates segments array presence', () => {
        path.resolve.mockReturnValue('/abs/test.json');

        // Test missing segments
        fs.readFileSync.mockReturnValue(JSON.stringify({ count: 0 }));
        expect(() => loadSegments('missing-segments.json')).toThrow(/missing segments array/);

        // Test null segments
        fs.readFileSync.mockReturnValue(JSON.stringify({ segments: null }));
        expect(() => loadSegments('null-segments.json')).toThrow(/missing segments array/);
    });

    test('propagates file system errors', () => {
        path.resolve.mockReturnValue('/abs/missing.json');
        fs.readFileSync.mockImplementation(() => {
            throw new Error('File not found');
        });

        expect(() => loadSegments('missing.json')).toThrow(/File not found/);
    });

    test('propagates JSON parsing errors', () => {
        path.resolve.mockReturnValue('/abs/invalid.json');
        fs.readFileSync.mockReturnValue('invalid json');

        expect(() => loadSegments('invalid.json')).toThrow(/JSON/);
    });
});

describe('Module exports', () => {
    test('exports expected functions and classes', () => {
        const dispatcher = require('../../src/parsers/dispatcher');

        expect(typeof dispatcher.RecipeDispatcher).toBe('function');
        expect(typeof dispatcher.loadSegments).toBe('function');
        expect(typeof dispatcher.processSegments).toBe('function');
    });
});