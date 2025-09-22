'use strict';

const fs = require('fs');
const path = require('path');
const { processSegmentFile } = require('./parsers');

/**
 * CLI usage banner displayed when required arguments are missing.
 * @type {string}
 */
const USAGE = 'Usage: node parse-segments.js <segments.json> [--out <results.json>]';

/**
 * @typedef {Object} SegmentProcessingSummary
 * @property {number} total Count of segment entries that were inspected.
 * @property {number} parsed Number of segments that produced a normalized recipe.
 * @property {number} errors Number of segments that failed with an error.
 * @property {number} unhandled Number of segments emitted by the dispatcher but not parsed.
 */

/**
 * Parses command line arguments and drives the segment processing workflow.
 *
 * The function mirrors the legacy CLI behaviour: it logs progress, optionally writes
 * a JSON summary to disk, and returns the processed summary for further inspection.
 *
 * @param {string[]} args CLI arguments (typically `process.argv.slice(2)`).
 * @param {{ logger?: Console }} [options] Optional logger sink; defaults to the global console.
 * @returns {Promise<{ summary: SegmentProcessingSummary, segmentPath: string, outputPath: string|null }>} Processing metadata.
 * @throws {Error} When required arguments are missing or segment processing fails.
 */
async function runCli(args, options = {}) {
    const logger = options.logger || console;
    const warn = typeof logger.warn === 'function' ? logger.warn.bind(logger) : logger.log.bind(logger);

    if (!Array.isArray(args) || args.length === 0) {
        throw new Error(USAGE);
    }

    let segmentPath = null;
    let outputPath = null;

    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];

        if (!segmentPath && !arg.startsWith('--')) {
            segmentPath = arg;
            continue;
        }

        if (arg === '--out') {
            const candidate = args[i + 1];
            if (!candidate) {
                throw new Error('Missing value for --out option.');
            }
            outputPath = candidate;
            i += 1;
            continue;
        }

        warn(`Unknown argument ignored: ${arg}`);
    }

    if (!segmentPath) {
        throw new Error('Missing path to segment JSON file.');
    }

    try {
        const summary = await processSegmentFile(segmentPath);

        logger.log(`Processed ${summary.total} segments.`);
        logger.log(`  Parsed: ${summary.parsed}`);
        logger.log(`  Errors: ${summary.errors}`);
        logger.log(`  Unhandled: ${summary.unhandled}`);

        let resolvedOutput = null;
        if (outputPath) {
            resolvedOutput = path.resolve(outputPath);
            fs.writeFileSync(resolvedOutput, JSON.stringify(summary, null, 2), 'utf8');
            logger.log(`Results written to ${resolvedOutput}`);
        }

        return {
            summary,
            segmentPath,
            outputPath: resolvedOutput
        };
    } catch (error) {
        throw new Error(`Failed to process segments: ${error.message}`);
    }
}

if (require.main === module) {
    runCli(process.argv.slice(2)).catch((error) => {
        console.error(error.message);
        process.exit(1);
    });
}

module.exports = {
    runCli,
    USAGE
};
