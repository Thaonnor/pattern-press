const test = require('tape');
const proxyquire = require('proxyquire');

function createTestHarness(stubs = {}) {
    const logs = [];
    const warns = [];
    const loadSegmentsCalls = [];
    const processSegmentsCalls = [];
    const registerHandlerCalls = [];

    const mockDispatcher = {
        registerHandler: (handler) => {
            registerHandlerCalls.push(handler);
        }
    };

    const RecipeDispatcherStub = class {
        constructor({ logger }) {
            this.logger = logger;
            this.registerHandler = (handler) => {
                registerHandlerCalls.push(handler);
            };
        }
    };

    const dispatcherStub = {
        RecipeDispatcher: RecipeDispatcherStub,
        loadSegments: (filePath) => {
            loadSegmentsCalls.push(filePath);
            if (typeof stubs.loadSegments === 'function') {
                return stubs.loadSegments(filePath);
            }
            return [
                { id: 'seg-1', rawText: 'recipe1' },
                { id: 'seg-2', rawText: 'recipe2' }
            ];
        },
        processSegments: async (dispatcher, segments) => {
            processSegmentsCalls.push({ dispatcher, segments });
            if (typeof stubs.processSegments === 'function') {
                return stubs.processSegments(dispatcher, segments);
            }
            return [
                { ...segments[0], dispatch: { status: 'parsed' } },
                { ...segments[1], dispatch: { status: 'error', error: 'test error' } }
            ];
        }
    };

    const mockHandlers = {
        jsonCraftingHandler: { name: 'json-crafting-handler' },
        shapedCraftingHandler: { name: 'shaped-crafting-handler' },
        shapelessCraftingHandler: { name: 'shapeless-crafting-handler' }
    };

    const subject = proxyquire('../src/parsers/index', {
        './dispatcher': dispatcherStub,
        './handlers/jsonCraftingHandler': stubs.jsonHandler || mockHandlers.jsonCraftingHandler,
        './handlers/shapedCraftingHandler': stubs.shapedHandler || mockHandlers.shapedCraftingHandler,
        './handlers/shapelessCraftingHandler': stubs.shapelessHandler || mockHandlers.shapelessCraftingHandler
    });

    const mockLogger = {
        log: (message) => logs.push(message),
        warn: (message) => warns.push(message)
    };

    return {
        ...subject,
        logs,
        warns,
        loadSegmentsCalls,
        processSegmentsCalls,
        registerHandlerCalls,
        mockLogger,
        mockDispatcher,
        mockHandlers
    };
}

test('createDefaultDispatcher registers all default handlers', (t) => {
    t.plan(4);
    const harness = createTestHarness();

    const dispatcher = harness.createDefaultDispatcher();

    t.ok(dispatcher.registerHandler, 'returns object with registerHandler method');
    t.equal(harness.registerHandlerCalls.length, 3, 'registers three handlers');
    t.equal(harness.registerHandlerCalls[0].name, 'json-crafting-handler', 'registers JSON handler');
    t.equal(harness.registerHandlerCalls[1].name, 'shaped-crafting-handler', 'registers shaped handler');
});

test('createDefaultDispatcher accepts custom logger', (t) => {
    t.plan(1);
    const harness = createTestHarness();
    const customLogger = { log: () => {}, warn: () => {} };

    const dispatcher = harness.createDefaultDispatcher({ logger: customLogger });

    t.equal(dispatcher.logger, customLogger, 'custom logger is passed to dispatcher');
});

test('createDefaultDispatcher uses console as default logger', (t) => {
    t.plan(1);
    const harness = createTestHarness();

    const dispatcher = harness.createDefaultDispatcher();

    t.equal(dispatcher.logger, console, 'console is used as default logger');
});

test('processSegmentFile loads segments and processes them', async (t) => {
    t.plan(4);
    const mockSegments = [
        { id: 'seg-1', rawText: 'recipe1' },
        { id: 'seg-2', rawText: 'recipe2' },
        { id: 'seg-3', rawText: 'recipe3' }
    ];

    const mockResults = [
        { ...mockSegments[0], dispatch: { status: 'parsed' } },
        { ...mockSegments[1], dispatch: { status: 'error' } },
        { ...mockSegments[2], dispatch: { status: 'unhandled' } }
    ];

    const harness = createTestHarness({
        loadSegments: () => mockSegments,
        processSegments: () => mockResults
    });

    const summary = await harness.processSegmentFile('segments.json');

    t.equal(harness.loadSegmentsCalls[0], 'segments.json', 'loads segments from specified file');
    t.equal(harness.processSegmentsCalls.length, 1, 'processes segments once');
    t.deepEqual(harness.processSegmentsCalls[0].segments, mockSegments, 'passes loaded segments to processor');
    t.deepEqual(summary.results, mockResults, 'returns complete results array');
});

test('processSegmentFile calculates correct summary statistics', async (t) => {
    t.plan(4);
    const mockResults = [
        { dispatch: { status: 'parsed' } },
        { dispatch: { status: 'parsed' } },
        { dispatch: { status: 'error' } },
        { dispatch: { status: 'unhandled' } },
        { dispatch: { status: 'unhandled' } }
    ];

    const harness = createTestHarness({
        loadSegments: () => Array(5).fill({ rawText: 'test' }),
        processSegments: () => mockResults
    });

    const summary = await harness.processSegmentFile('segments.json');

    t.equal(summary.total, 5, 'counts total segments correctly');
    t.equal(summary.parsed, 2, 'counts parsed segments correctly');
    t.equal(summary.errors, 1, 'counts error segments correctly');
    t.equal(summary.unhandled, 2, 'counts unhandled segments correctly');
});

test('processSegmentFile uses custom dispatcher when provided', async (t) => {
    t.plan(2);
    const customDispatcher = { custom: true };
    const harness = createTestHarness();

    await harness.processSegmentFile('segments.json', { dispatcher: customDispatcher });

    t.equal(harness.processSegmentsCalls[0].dispatcher, customDispatcher, 'uses provided dispatcher');
    t.equal(harness.registerHandlerCalls.length, 0, 'does not create default dispatcher when custom provided');
});

test('processSegmentFile creates default dispatcher when none provided', async (t) => {
    t.plan(2);
    const harness = createTestHarness();

    await harness.processSegmentFile('segments.json');

    t.ok(harness.processSegmentsCalls[0].dispatcher.registerHandler, 'creates dispatcher with registerHandler method');
    t.equal(harness.registerHandlerCalls.length, 3, 'registers default handlers');
});

test('processSegmentFile passes logger option to default dispatcher', async (t) => {
    t.plan(1);
    const customLogger = { log: () => {}, warn: () => {} };
    const harness = createTestHarness();

    await harness.processSegmentFile('segments.json', { logger: customLogger });

    t.equal(harness.processSegmentsCalls[0].dispatcher.logger, customLogger, 'custom logger passed to dispatcher');
});

test('processSegmentFile handles empty segment files', async (t) => {
    t.plan(4);
    const harness = createTestHarness({
        loadSegments: () => [],
        processSegments: () => []
    });

    const summary = await harness.processSegmentFile('empty.json');

    t.equal(summary.total, 0, 'handles empty segment array');
    t.equal(summary.parsed, 0, 'no parsed segments');
    t.equal(summary.errors, 0, 'no error segments');
    t.equal(summary.unhandled, 0, 'no unhandled segments');
});

test('processSegmentFile surfaces loading errors', async (t) => {
    t.plan(1);
    const harness = createTestHarness({
        loadSegments: () => {
            throw new Error('Failed to load segments');
        }
    });

    try {
        await harness.processSegmentFile('bad.json');
        t.fail('should throw when loadSegments fails');
    } catch (error) {
        t.equal(error.message, 'Failed to load segments', 'loading errors are propagated');
    }
});

test('processSegmentFile surfaces processing errors', async (t) => {
    t.plan(1);
    const harness = createTestHarness({
        processSegments: () => {
            throw new Error('Processing failed');
        }
    });

    try {
        await harness.processSegmentFile('segments.json');
        t.fail('should throw when processSegments fails');
    } catch (error) {
        t.equal(error.message, 'Processing failed', 'processing errors are propagated');
    }
});

test('processSegmentFile handles mixed dispatch statuses', async (t) => {
    t.plan(1);
    const mixedResults = [
        { dispatch: { status: 'parsed' } },
        { dispatch: { status: 'parsed' } },
        { dispatch: { status: 'error' } },
        { dispatch: { status: 'unhandled' } },
        { dispatch: { status: 'parsed' } },
        { dispatch: { status: 'error' } },
        { dispatch: { status: 'error' } }
    ];

    const harness = createTestHarness({
        loadSegments: () => Array(7).fill({ rawText: 'test' }),
        processSegments: () => mixedResults
    });

    const summary = await harness.processSegmentFile('segments.json');

    t.deepEqual(
        { total: summary.total, parsed: summary.parsed, errors: summary.errors, unhandled: summary.unhandled },
        { total: 7, parsed: 3, errors: 3, unhandled: 1 },
        'correctly counts all status types in mixed results'
    );
});

test('module exports expected functions', (t) => {
    t.plan(3);
    const harness = createTestHarness();

    t.equal(typeof harness.createDefaultDispatcher, 'function', 'exports createDefaultDispatcher');
    t.equal(typeof harness.processSegmentFile, 'function', 'exports processSegmentFile');
    t.equal(typeof harness.processSegments, 'function', 'exports processSegments');
});

test('processSegments is re-exported from dispatcher module', (t) => {
    t.plan(1);
    const harness = createTestHarness();

    // The processSegments function should be the same as the one from dispatcher
    // We can verify this by checking that it calls the stubbed version
    harness.processSegments({}, []);

    t.equal(harness.processSegmentsCalls.length, 1, 'processSegments calls through to dispatcher module');
});