'use strict';

const fs = require('fs');
const path = require('path');

class RecipeDispatcher {
    constructor({ handlers = [], logger = console } = {}) {
        this.handlers = handlers;
        this.logger = logger;
    }

    registerHandler(handler) {
        if (!handler || typeof handler.canParse !== 'function' || typeof handler.parse !== 'function') {
            throw new Error('Handler must implement canParse() and parse()');
        }

        this.handlers.push(handler);
    }

    async dispatch(segment, context = {}) {
        for (const handler of this.handlers) {
            let score = 0;

            try {
                score = await handler.canParse(segment, context);
            } catch (error) {
                this.logger.warn(`[${handler.name ?? 'handler'}] failed during canParse: ${error.message}`);
                continue;
            }

            if (!score) {
                continue;
            }

            try {
                const result = await handler.parse(segment, { ...context, handlerScore: score });
                return {
                    status: 'parsed',
                    handler: handler.name ?? 'unknown-handler',
                    score,
                    result
                };
            } catch (error) {
                this.logger.warn(`[${handler.name ?? 'handler'}] failed to parse segment at lines ${segment.startLine}-${segment.endLine}: ${error.message}`);
                return {
                    status: 'error',
                    handler: handler.name ?? 'unknown-handler',
                    score,
                    error: error.message
                };
            }
        }

        return {
            status: 'unhandled'
        };
    }
}

async function processSegments(dispatcher, segments, contextFactory = () => ({})) {
    const results = [];

    for (const segment of segments) {
        const context = contextFactory(segment) || {};
        const outcome = await dispatcher.dispatch(segment, context);
        results.push({
            ...segment,
            dispatch: outcome
        });
    }

    return results;
}

function loadSegments(filePath) {
    const resolvedPath = path.resolve(filePath);
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data?.segments)) {
        throw new Error('Segment file missing segments array');
    }

    return data.segments;
}

module.exports = {
    RecipeDispatcher,
    loadSegments,
    processSegments
};
