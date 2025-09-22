'use strict';

const { RecipeDispatcher, loadSegments, processSegments } = require('./dispatcher');
const jsonCraftingHandler = require('./handlers/jsonCraftingHandler');
const shapedCraftingHandler = require('./handlers/shapedCraftingHandler');
const shapelessCraftingHandler = require('./handlers/shapelessCraftingHandler');

function createDefaultDispatcher({ logger = console } = {}) {
    const dispatcher = new RecipeDispatcher({ logger });
    dispatcher.registerHandler(jsonCraftingHandler);
    dispatcher.registerHandler(shapedCraftingHandler);
    dispatcher.registerHandler(shapelessCraftingHandler);
    return dispatcher;
}

async function processSegmentFile(filePath, options = {}) {
    const segments = loadSegments(filePath);
    const dispatcher = options.dispatcher || createDefaultDispatcher(options);
    const results = await processSegments(dispatcher, segments);
    return {
        total: segments.length,
        parsed: results.filter((entry) => entry.dispatch.status === 'parsed').length,
        errors: results.filter((entry) => entry.dispatch.status === 'error').length,
        unhandled: results.filter((entry) => entry.dispatch.status === 'unhandled').length,
        results
    };
}

module.exports = {
    createDefaultDispatcher,
    processSegmentFile,
    processSegments
};
