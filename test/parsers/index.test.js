// Mock modules before importing
jest.mock('../../src/parsers/dispatcher');
jest.mock('../../src/parsers/handlers/jsonCraftingHandler');
jest.mock('../../src/parsers/handlers/shapedCraftingHandler');
jest.mock('../../src/parsers/handlers/shapelessCraftingHandler');

const dispatcherMock = require('../../src/parsers/dispatcher');
const jsonHandlerMock = require('../../src/parsers/handlers/jsonCraftingHandler');
const shapedHandlerMock = require('../../src/parsers/handlers/shapedCraftingHandler');
const shapelessHandlerMock = require('../../src/parsers/handlers/shapelessCraftingHandler');

describe('Parsers Index', () => {
    let parsersModule;
    let mockHandlers;
    let loadSegmentsCalls;
    let processSegmentsCalls;
    let registerHandlerCalls;
    let mockLogger;
    let mockDispatcher;

    beforeEach(() => {
        jest.clearAllMocks();

        loadSegmentsCalls = [];
        processSegmentsCalls = [];
        registerHandlerCalls = [];

        mockHandlers = {
            jsonCraftingHandler: { name: 'json-crafting-handler' },
            shapedCraftingHandler: { name: 'shaped-crafting-handler' },
            shapelessCraftingHandler: { name: 'shapeless-crafting-handler' }
        };

        mockDispatcher = {
            registerHandler: jest.fn((handler) => {
                registerHandlerCalls.push(handler);
            })
        };

        class RecipeDispatcherMock {
            constructor({ logger }) {
                this.logger = logger;
                this.registerHandler = jest.fn((handler) => {
                    registerHandlerCalls.push(handler);
                });
            }
        }

        // Setup dispatcher mocks
        dispatcherMock.RecipeDispatcher = RecipeDispatcherMock;
        dispatcherMock.loadSegments = jest.fn((filePath) => {
            loadSegmentsCalls.push(filePath);
            return [
                { id: 'seg-1', rawText: 'recipe1' },
                { id: 'seg-2', rawText: 'recipe2' }
            ];
        });
        dispatcherMock.processSegments = jest.fn(async (dispatcher, segments) => {
            processSegmentsCalls.push({ dispatcher, segments });
            return [
                { ...segments[0], dispatch: { status: 'parsed' } },
                { ...segments[1], dispatch: { status: 'error', error: 'test error' } }
            ];
        });

        // Setup handler mocks - these are module objects, not functions
        Object.assign(jsonHandlerMock, mockHandlers.jsonCraftingHandler);
        Object.assign(shapedHandlerMock, mockHandlers.shapedCraftingHandler);
        Object.assign(shapelessHandlerMock, mockHandlers.shapelessCraftingHandler);

        mockLogger = {
            log: jest.fn(),
            warn: jest.fn()
        };

        // Import module after mocks are setup
        jest.isolateModules(() => {
            parsersModule = require('../../src/parsers/index');
        });
    });

    describe('createDefaultDispatcher', () => {
        test('registers all default handlers', () => {
            const dispatcher = parsersModule.createDefaultDispatcher();

            expect(dispatcher.registerHandler).toBeDefined();
            expect(registerHandlerCalls).toHaveLength(13);
            expect(registerHandlerCalls[0].name).toBe('json-crafting-handler');
            expect(registerHandlerCalls[1].name).toBe('shaped-crafting-handler');
        });

        test('accepts custom logger', () => {
            const customLogger = { log: jest.fn(), warn: jest.fn() };
            const dispatcher = parsersModule.createDefaultDispatcher({ logger: customLogger });

            expect(dispatcher.logger).toBe(customLogger);
        });

        test('uses console as default logger', () => {
            const dispatcher = parsersModule.createDefaultDispatcher();

            expect(dispatcher.logger).toBe(console);
        });
    });

    describe('processSegmentFile', () => {
        test('loads segments and processes them', async () => {
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

            dispatcherMock.loadSegments.mockImplementation((filePath) => {
                loadSegmentsCalls.push(filePath);
                return mockSegments;
            });
            dispatcherMock.processSegments.mockImplementation(async (dispatcher, segments) => {
                processSegmentsCalls.push({ dispatcher, segments });
                return mockResults;
            });

            const summary = await parsersModule.processSegmentFile('segments.json');

            expect(loadSegmentsCalls[0]).toBe('segments.json');
            expect(processSegmentsCalls).toHaveLength(1);
            expect(processSegmentsCalls[0].segments).toEqual(mockSegments);
            expect(summary.results).toEqual(mockResults);
        });

        test('calculates correct summary statistics', async () => {
            const mockResults = [
                { dispatch: { status: 'parsed' } },
                { dispatch: { status: 'parsed' } },
                { dispatch: { status: 'error' } },
                { dispatch: { status: 'unhandled' } },
                { dispatch: { status: 'unhandled' } }
            ];

            dispatcherMock.loadSegments.mockReturnValue(Array(5).fill({ rawText: 'test' }));
            dispatcherMock.processSegments.mockResolvedValue(mockResults);

            const summary = await parsersModule.processSegmentFile('segments.json');

            expect(summary.total).toBe(5);
            expect(summary.parsed).toBe(2);
            expect(summary.errors).toBe(1);
            expect(summary.unhandled).toBe(2);
        });

        test('uses custom dispatcher when provided', async () => {
            const customDispatcher = { custom: true };

            await parsersModule.processSegmentFile('segments.json', { dispatcher: customDispatcher });

            expect(processSegmentsCalls[0].dispatcher).toBe(customDispatcher);
            expect(registerHandlerCalls).toHaveLength(0);
        });

        test('creates default dispatcher when none provided', async () => {
            await parsersModule.processSegmentFile('segments.json');

            expect(processSegmentsCalls[0].dispatcher.registerHandler).toBeDefined();
            expect(registerHandlerCalls).toHaveLength(13);
        });

        test('passes logger option to default dispatcher', async () => {
            const customLogger = { log: jest.fn(), warn: jest.fn() };

            await parsersModule.processSegmentFile('segments.json', { logger: customLogger });

            expect(processSegmentsCalls[0].dispatcher.logger).toBe(customLogger);
        });

        test('handles empty segment files', async () => {
            dispatcherMock.loadSegments.mockReturnValue([]);
            dispatcherMock.processSegments.mockResolvedValue([]);

            const summary = await parsersModule.processSegmentFile('empty.json');

            expect(summary.total).toBe(0);
            expect(summary.parsed).toBe(0);
            expect(summary.errors).toBe(0);
            expect(summary.unhandled).toBe(0);
        });

        test('surfaces loading errors', async () => {
            dispatcherMock.loadSegments.mockImplementation(() => {
                throw new Error('Failed to load segments');
            });

            await expect(parsersModule.processSegmentFile('bad.json'))
                .rejects
                .toThrow('Failed to load segments');
        });

        test('surfaces processing errors', async () => {
            dispatcherMock.processSegments.mockImplementation(() => {
                throw new Error('Processing failed');
            });

            await expect(parsersModule.processSegmentFile('segments.json'))
                .rejects
                .toThrow('Processing failed');
        });

        test('handles mixed dispatch statuses', async () => {
            const mixedResults = [
                { dispatch: { status: 'parsed' } },
                { dispatch: { status: 'parsed' } },
                { dispatch: { status: 'error' } },
                { dispatch: { status: 'unhandled' } },
                { dispatch: { status: 'parsed' } },
                { dispatch: { status: 'error' } },
                { dispatch: { status: 'error' } }
            ];

            dispatcherMock.loadSegments.mockReturnValue(Array(7).fill({ rawText: 'test' }));
            dispatcherMock.processSegments.mockResolvedValue(mixedResults);

            const summary = await parsersModule.processSegmentFile('segments.json');

            expect({
                total: summary.total,
                parsed: summary.parsed,
                errors: summary.errors,
                unhandled: summary.unhandled
            }).toEqual({
                total: 7,
                parsed: 3,
                errors: 3,
                unhandled: 1
            });
        });
    });

    describe('module exports', () => {
        test('exports expected functions', () => {
            expect(typeof parsersModule.createDefaultDispatcher).toBe('function');
            expect(typeof parsersModule.processSegmentFile).toBe('function');
            expect(typeof parsersModule.processSegments).toBe('function');
        });

        test('processSegments is re-exported from dispatcher module', () => {
            // The processSegments function should be the same as the one from dispatcher
            // We can verify this by checking that it calls the mocked version
            parsersModule.processSegments({}, []);

            expect(processSegmentsCalls).toHaveLength(1);
        });
    });
});