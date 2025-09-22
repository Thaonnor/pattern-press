'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} RecipeHandler
 * @property {string} name Identifier for the handler used in logging and dispatch results.
 * @property {function(Object, Object): Promise<number>|number} canParse Evaluates segment compatibility.
 * @property {function(Object, Object): Promise<Object>|Object} parse Extracts recipe data from the segment.
 */

/**
 * @typedef {Object} DispatchResult
 * @property {'parsed'|'error'|'unhandled'} status Outcome of the dispatch operation.
 * @property {string} [handler] Name of the handler that processed the segment (if applicable).
 * @property {number} [score] Compatibility score returned by the handler's canParse method (if applicable).
 * @property {Object} [result] Parsed recipe data (when status is 'parsed').
 * @property {string} [error] Error message (when status is 'error').
 */

/**
 * @typedef {Object} ProcessedSegment
 * @property {string} [id] Segment identifier from the source file.
 * @property {string|null} recipeType CraftTweaker recipe type associated with the segment.
 * @property {number} startLine 1-based line number where the segment begins.
 * @property {number} endLine 1-based line number where the segment ends.
 * @property {string} rawText Original log content for the segment.
 * @property {DispatchResult} dispatch Processing outcome with handler results.
 */

/**
 * Coordinates recipe parsing by managing a collection of format-specific handlers.
 *
 * The dispatcher evaluates each segment against registered handlers in order, selecting
 * the first handler that returns a positive compatibility score. Handler evaluation
 * and parsing errors are logged but do not interrupt processing of other segments.
 */
class RecipeDispatcher {
    /**
     * Creates a new recipe dispatcher with optional initial handlers and logger.
     *
     * @param {Object} [options] Configuration options for the dispatcher.
     * @param {RecipeHandler[]} [options.handlers=[]] Initial handlers to register.
     * @param {Console} [options.logger=console] Logger instance for warnings and errors.
     */
    constructor({ handlers = [], logger = console } = {}) {
        this.handlers = handlers;
        this.logger = logger;
    }

    /**
     * Registers a recipe format handler with the dispatcher.
     *
     * Handlers are evaluated in registration order when dispatching segments.
     * The first handler returning a positive canParse score will be used to
     * process the segment.
     *
     * @param {RecipeHandler} handler Handler implementing canParse() and parse() methods.
     * @throws {Error} When the handler is missing required methods.
     */
    registerHandler(handler) {
        if (!handler || typeof handler.canParse !== 'function' || typeof handler.parse !== 'function') {
            throw new Error('Handler must implement canParse() and parse()');
        }

        this.handlers.push(handler);
    }

    /**
     * Processes a segment through the registered handlers and returns the parsing outcome.
     *
     * Handlers are evaluated in registration order. The first handler returning a positive
     * canParse score attempts to parse the segment. Errors during canParse evaluation
     * are logged and the next handler is tried. Parse errors result in an 'error' status.
     *
     * @param {Object} segment Recipe segment to process.
     * @param {string|null} segment.recipeType CraftTweaker recipe type for the segment.
     * @param {number} segment.startLine 1-based starting line number.
     * @param {number} segment.endLine 1-based ending line number.
     * @param {string} segment.rawText Original log content for the segment.
     * @param {Object} [context={}] Additional context passed to handlers.
     * @returns {Promise<DispatchResult>} Processing outcome with handler results.
     */
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

/**
 * Processes an array of segments through a dispatcher and returns augmented results.
 *
 * Each segment is processed independently through the dispatcher. The original segment
 * properties are preserved and augmented with dispatch metadata describing the parsing
 * outcome. Context can be customized per segment using the optional context factory.
 *
 * @param {RecipeDispatcher} dispatcher Configured dispatcher with registered handlers.
 * @param {Object[]} segments Array of recipe segments to process.
 * @param {function(Object): Object} [contextFactory] Optional function to generate per-segment context.
 * @returns {Promise<ProcessedSegment[]>} Segments with dispatch results attached.
 */
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

/**
 * Loads and validates recipe segments from a JSON file generated by the log segmenter.
 *
 * The function expects a JSON file with a top-level 'segments' array containing
 * segment objects with the required properties (startLine, endLine, rawText, etc.).
 * File paths are resolved relative to the current working directory.
 *
 * @param {string} filePath Absolute or relative path to the segments JSON file.
 * @returns {Object[]} Array of segment objects ready for dispatcher processing.
 * @throws {Error} When the file cannot be read, parsed, or lacks the required structure.
 */
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
