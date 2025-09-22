const test = require('tape');
const proxyquire = require('proxyquire');

function createTestHarness(stubs = {}) {
    const logs = [];
    const warns = [];
    const readFileCalls = [];
    const pathResolveCalls = [];

    const fsStub = {
        readFileSync: (filePath, encoding) => {
            readFileCalls.push({ filePath, encoding });
            if (typeof stubs.readFileSync === 'function') {
                return stubs.readFileSync(filePath, encoding);
            }
            return JSON.stringify({
                generatedAt: '2023-01-01T00:00:00.000Z',
                count: 2,
                segments: [
                    { id: 'seg-1', rawText: 'recipe1', startLine: 1, endLine: 2 },
                    { id: 'seg-2', rawText: 'recipe2', startLine: 3, endLine: 4 }
                ]
            });
        }
    };

    const pathStub = {
        resolve: (filePath) => {
            pathResolveCalls.push(filePath);
            if (typeof stubs.pathResolve === 'function') {
                return stubs.pathResolve(filePath);
            }
            return `/abs/${filePath}`;
        }
    };

    const subject = proxyquire('../src/parsers/dispatcher', {
        fs: fsStub,
        path: pathStub
    });

    const mockLogger = {
        log: (message) => logs.push(message),
        warn: (message) => warns.push(message)
    };

    return {
        ...subject,
        logs,
        warns,
        readFileCalls,
        pathResolveCalls,
        mockLogger,
        fsStub,
        pathStub
    };
}

function createMockHandler(name, canParseScore = 1, parseResult = { data: 'test' }, options = {}) {
    const calls = {
        canParse: [],
        parse: []
    };

    return {
        name,
        calls,
        canParse: async (segment, context) => {
            calls.canParse.push({ segment, context });
            if (options.canParseError) {
                throw new Error(options.canParseError);
            }
            return typeof canParseScore === 'function' ? canParseScore(segment, context) : canParseScore;
        },
        parse: async (segment, context) => {
            calls.parse.push({ segment, context });
            if (options.parseError) {
                throw new Error(options.parseError);
            }
            return typeof parseResult === 'function' ? parseResult(segment, context) : parseResult;
        }
    };
}

test('RecipeDispatcher constructor initializes with default values', (t) => {
    t.plan(3);
    const harness = createTestHarness();

    const dispatcher = new harness.RecipeDispatcher();

    t.deepEqual(dispatcher.handlers, [], 'handlers array starts empty');
    t.equal(dispatcher.logger, console, 'default logger is console');
    t.equal(typeof dispatcher.registerHandler, 'function', 'registerHandler method exists');
});

test('RecipeDispatcher constructor accepts initial handlers and logger', (t) => {
    t.plan(2);
    const harness = createTestHarness();
    const initialHandlers = [{ name: 'test' }];
    const customLogger = { warn: () => {} };

    const dispatcher = new harness.RecipeDispatcher({
        handlers: initialHandlers,
        logger: customLogger
    });

    t.equal(dispatcher.handlers, initialHandlers, 'initial handlers are stored');
    t.equal(dispatcher.logger, customLogger, 'custom logger is stored');
});

test('registerHandler validates handler interface', (t) => {
    t.plan(4);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher();

    t.throws(() => dispatcher.registerHandler(null), /must implement/, 'rejects null handler');
    t.throws(() => dispatcher.registerHandler({}), /must implement/, 'rejects handler without methods');
    t.throws(() => dispatcher.registerHandler({ canParse: 'not-function' }), /must implement/, 'rejects invalid canParse');

    const validHandler = { canParse: () => {}, parse: () => {} };
    dispatcher.registerHandler(validHandler);
    t.equal(dispatcher.handlers.length, 1, 'accepts valid handler');
});

test('registerHandler adds handler to collection', (t) => {
    t.plan(3);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher();
    const handler1 = createMockHandler('handler1');
    const handler2 = createMockHandler('handler2');

    dispatcher.registerHandler(handler1);
    t.equal(dispatcher.handlers.length, 1, 'first handler added');

    dispatcher.registerHandler(handler2);
    t.equal(dispatcher.handlers.length, 2, 'second handler added');
    t.deepEqual(dispatcher.handlers, [handler1, handler2], 'handlers stored in registration order');
});

test('dispatch returns unhandled when no handlers registered', async (t) => {
    t.plan(1);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher();
    const segment = { rawText: 'test', startLine: 1, endLine: 1 };

    const result = await dispatcher.dispatch(segment);

    t.deepEqual(result, { status: 'unhandled' }, 'unhandled status returned when no handlers');
});

test('dispatch skips handlers that return zero score', async (t) => {
    t.plan(3);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher({ logger: harness.mockLogger });
    const handler1 = createMockHandler('handler1', 0);
    const handler2 = createMockHandler('handler2', 1, { success: true });

    dispatcher.registerHandler(handler1);
    dispatcher.registerHandler(handler2);

    const segment = { rawText: 'test', startLine: 1, endLine: 1 };
    const result = await dispatcher.dispatch(segment);

    t.equal(handler1.calls.canParse.length, 1, 'first handler canParse called');
    t.equal(handler1.calls.parse.length, 0, 'first handler parse not called for zero score');
    t.equal(result.status, 'parsed', 'second handler processed segment');
});

test('dispatch uses first handler with positive score', async (t) => {
    t.plan(4);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher({ logger: harness.mockLogger });
    const handler1 = createMockHandler('handler1', 0.5, { first: true });
    const handler2 = createMockHandler('handler2', 0.8, { second: true });

    dispatcher.registerHandler(handler1);
    dispatcher.registerHandler(handler2);

    const segment = { rawText: 'test', startLine: 1, endLine: 1 };
    const result = await dispatcher.dispatch(segment);

    t.equal(handler1.calls.parse.length, 1, 'first handler with positive score is used');
    t.equal(handler2.calls.canParse.length, 0, 'subsequent handlers not evaluated');
    t.equal(result.status, 'parsed', 'parsed status returned');
    t.deepEqual(result.result, { first: true }, 'first handler result returned');
});

test('dispatch includes handler metadata in parsed result', async (t) => {
    t.plan(3);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher({ logger: harness.mockLogger });
    const handler = createMockHandler('test-handler', 0.7, { data: 'parsed' });

    dispatcher.registerHandler(handler);

    const segment = { rawText: 'test', startLine: 1, endLine: 1 };
    const result = await dispatcher.dispatch(segment);

    t.equal(result.handler, 'test-handler', 'handler name included');
    t.equal(result.score, 0.7, 'handler score included');
    t.deepEqual(result.result, { data: 'parsed' }, 'handler result included');
});

test('dispatch passes context and score to parse method', async (t) => {
    t.plan(2);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher({ logger: harness.mockLogger });
    const handler = createMockHandler('handler', 0.9);

    dispatcher.registerHandler(handler);

    const segment = { rawText: 'test', startLine: 1, endLine: 1 };
    const context = { custom: 'context' };
    await dispatcher.dispatch(segment, context);

    const parseCall = handler.calls.parse[0];
    t.deepEqual(parseCall.context.custom, 'context', 'original context passed to parse');
    t.equal(parseCall.context.handlerScore, 0.9, 'handler score added to context');
});

test('dispatch logs and continues when canParse throws error', async (t) => {
    t.plan(4);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher({ logger: harness.mockLogger });
    const handler1 = createMockHandler('failing-handler', 1, {}, { canParseError: 'canParse failed' });
    const handler2 = createMockHandler('working-handler', 1, { success: true });

    dispatcher.registerHandler(handler1);
    dispatcher.registerHandler(handler2);

    const segment = { rawText: 'test', startLine: 1, endLine: 1 };
    const result = await dispatcher.dispatch(segment);

    t.equal(harness.warns.length, 1, 'warning logged for canParse error');
    t.match(harness.warns[0], /failing-handler.*failed during canParse.*canParse failed/, 'error details included in warning');
    t.equal(handler2.calls.canParse.length, 1, 'processing continues to next handler');
    t.equal(result.status, 'parsed', 'successful handler still processes segment');
});

test('dispatch returns error status when parse throws error', async (t) => {
    t.plan(4);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher({ logger: harness.mockLogger });
    const handler = createMockHandler('failing-handler', 1, {}, { parseError: 'parse failed' });

    dispatcher.registerHandler(handler);

    const segment = { rawText: 'test', startLine: 5, endLine: 10 };
    const result = await dispatcher.dispatch(segment);

    t.equal(result.status, 'error', 'error status returned');
    t.equal(result.handler, 'failing-handler', 'handler name included in error result');
    t.equal(result.error, 'parse failed', 'error message included');
    t.match(harness.warns[0], /failing-handler.*failed to parse segment at lines 5-10.*parse failed/, 'detailed error logged');
});

test('dispatch handles handlers without name property', async (t) => {
    t.plan(2);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher({ logger: harness.mockLogger });
    const handler = createMockHandler(undefined, 1, { data: 'test' });
    delete handler.name;

    dispatcher.registerHandler(handler);

    const segment = { rawText: 'test', startLine: 1, endLine: 1 };
    const result = await dispatcher.dispatch(segment);

    t.equal(result.handler, 'unknown-handler', 'fallback name used for unnamed handler');
    t.equal(result.status, 'parsed', 'processing still succeeds');
});

test('processSegments processes array of segments independently', async (t) => {
    t.plan(4);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher({ logger: harness.mockLogger });
    const handler = createMockHandler('handler', 1, (segment) => ({ id: segment.id }));

    dispatcher.registerHandler(handler);

    const segments = [
        { id: 'seg1', rawText: 'recipe1', startLine: 1, endLine: 2 },
        { id: 'seg2', rawText: 'recipe2', startLine: 3, endLine: 4 }
    ];

    const results = await harness.processSegments(dispatcher, segments);

    t.equal(results.length, 2, 'all segments processed');
    t.equal(results[0].id, 'seg1', 'original segment properties preserved');
    t.equal(results[0].dispatch.status, 'parsed', 'dispatch result attached');
    t.deepEqual(results[1].dispatch.result, { id: 'seg2' }, 'handler result varies per segment');
});

test('processSegments uses context factory when provided', async (t) => {
    t.plan(2);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher({ logger: harness.mockLogger });
    const handler = createMockHandler('handler', 1);

    dispatcher.registerHandler(handler);

    const segments = [{ id: 'seg1', rawText: 'test', startLine: 1, endLine: 1 }];
    const contextFactory = (segment) => ({ segmentId: segment.id });

    await harness.processSegments(dispatcher, segments, contextFactory);

    t.equal(handler.calls.canParse.length, 1, 'handler called once');
    t.equal(handler.calls.canParse[0].context.segmentId, 'seg1', 'context factory result passed to handler');
});

test('processSegments handles null context from factory', async (t) => {
    t.plan(1);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher({ logger: harness.mockLogger });
    const handler = createMockHandler('handler', 1);

    dispatcher.registerHandler(handler);

    const segments = [{ id: 'seg1', rawText: 'test', startLine: 1, endLine: 1 }];
    const contextFactory = () => null;

    await harness.processSegments(dispatcher, segments, contextFactory);

    t.deepEqual(handler.calls.canParse[0].context, {}, 'empty context used when factory returns null');
});

test('loadSegments reads and parses JSON file', (t) => {
    t.plan(3);
    const segmentData = {
        generatedAt: '2023-01-01T00:00:00.000Z',
        count: 1,
        segments: [{ id: 'test', rawText: 'recipe' }]
    };

    const harness = createTestHarness({
        readFileSync: () => JSON.stringify(segmentData)
    });

    const segments = harness.loadSegments('segments.json');

    t.equal(harness.pathResolveCalls[0], 'segments.json', 'path resolved');
    t.equal(harness.readFileCalls[0].encoding, 'utf8', 'file read with utf8 encoding');
    t.deepEqual(segments, segmentData.segments, 'segments array extracted from JSON');
});

test('loadSegments validates segments array presence', (t) => {
    t.plan(2);
    const harness = createTestHarness({
        readFileSync: (path) => {
            if (path.includes('missing-segments')) {
                return JSON.stringify({ count: 0 });
            }
            if (path.includes('null-segments')) {
                return JSON.stringify({ segments: null });
            }
            return '{}';
        }
    });

    t.throws(() => harness.loadSegments('missing-segments.json'), /missing segments array/, 'rejects when segments missing');
    t.throws(() => harness.loadSegments('null-segments.json'), /missing segments array/, 'rejects when segments is null');
});

test('loadSegments propagates file system errors', (t) => {
    t.plan(1);
    const harness = createTestHarness({
        readFileSync: () => {
            throw new Error('File not found');
        }
    });

    t.throws(() => harness.loadSegments('missing.json'), /File not found/, 'file system errors propagated');
});

test('loadSegments propagates JSON parsing errors', (t) => {
    t.plan(1);
    const harness = createTestHarness({
        readFileSync: () => 'invalid json'
    });

    t.throws(() => harness.loadSegments('invalid.json'), /JSON/, 'JSON parsing errors propagated');
});

test('module exports expected functions and classes', (t) => {
    t.plan(3);
    const harness = createTestHarness();

    t.equal(typeof harness.RecipeDispatcher, 'function', 'exports RecipeDispatcher class');
    t.equal(typeof harness.loadSegments, 'function', 'exports loadSegments function');
    t.equal(typeof harness.processSegments, 'function', 'exports processSegments function');
});

test('RecipeDispatcher handles async and sync handlers', async (t) => {
    t.plan(2);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher({ logger: harness.mockLogger });

    // Sync handler
    const syncHandler = {
        name: 'sync-handler',
        canParse: () => 1,
        parse: () => ({ sync: true })
    };

    // Async handler
    const asyncHandler = {
        name: 'async-handler',
        canParse: async () => 0,
        parse: async () => ({ async: true })
    };

    dispatcher.registerHandler(asyncHandler);
    dispatcher.registerHandler(syncHandler);

    const segment = { rawText: 'test', startLine: 1, endLine: 1 };
    const result = await dispatcher.dispatch(segment);

    t.equal(result.handler, 'sync-handler', 'sync handler processed segment');
    t.deepEqual(result.result, { sync: true }, 'sync handler result returned');
});

test('dispatch preserves segment properties in context', async (t) => {
    t.plan(1);
    const harness = createTestHarness();
    const dispatcher = new harness.RecipeDispatcher({ logger: harness.mockLogger });
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
    t.deepEqual(canParseCall.segment, segment, 'complete segment passed to handler');
});