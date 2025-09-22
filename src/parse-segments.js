'use strict';

const fs = require('fs');
const path = require('path');
const { processSegmentFile } = require('./parsers');
const { RecipeDatabase } = require('./recipe-database');
const { normalizeRecipeTypeValue } = require('./utils/recipe-utils');

/**
 * CLI usage banner displayed when required arguments are missing.
 * @type {string}
 */
const USAGE = 'Usage: node parse-segments.js <segments.json> [--out <results.json>] [--db <database.json>] [--verbose]';

/**
 * @typedef {Object} SegmentProcessingSummary
 * @property {number} total Count of segment entries that were inspected.
 * @property {number} parsed Number of segments that produced a normalized recipe.
 * @property {number} errors Number of segments that failed with an error.
 * @property {number} unhandled Number of segments emitted by the dispatcher but not parsed.
 * @property {Object} [database] Database persistence statistics when enabled.
 */

/**
 * Parses command line arguments and drives the segment processing workflow.
 *
 * The function mirrors the legacy CLI behaviour: it logs progress, optionally writes
 * a JSON summary to disk, and returns the processed summary for further inspection.
 *
 * @param {string[]} args CLI arguments (typically `process.argv.slice(2)`).
 * @param {{ logger?: Console }} [options] Optional logger sink; defaults to the global console.
 * @returns {Promise<{ summary: SegmentProcessingSummary, segmentPath: string, outputPath: string|null, databasePath: string|null }>} Processing metadata.
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
    let databasePath = null;
    let verbose = false;

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

        if (arg === '--db') {
            const candidate = args[i + 1];
            if (!candidate) {
                throw new Error('Missing value for --db option.');
            }
            databasePath = candidate;
            i += 1;
            continue;
        }

        if (arg === '--verbose' || arg === '-v') {
            verbose = true;
            continue;
        }

        warn(`Unknown argument ignored: ${arg}`);
    }

    if (!segmentPath) {
        throw new Error('Missing path to segment JSON file.');
    }

    try {
        const summary = await processSegmentFile(segmentPath);

        // Handle database persistence if requested
        if (databasePath) {
            const db = new RecipeDatabase(databasePath);
            await db.load();

            // Extract successfully parsed recipes and normalize recipe types
            const recipes = summary.results
                .filter(r => r.dispatch.status === 'parsed')
                .map(r => {
                    const recipe = { ...r.dispatch.result };
                    // Normalize recipe type to remove <recipetype:> wrapper
                    if (recipe.recipeType) {
                        recipe.recipeType = normalizeRecipeTypeValue(recipe.recipeType);
                    }
                    return recipe;
                });

            const dbStats = await db.bulkUpsert(recipes);
            summary.database = dbStats;

            logger.log(`Database updated: ${dbStats.added} added, ${dbStats.updated} updated, ${dbStats.total} total recipes`);
        }

        logger.log(`Processed ${summary.total} segments.`);
        logger.log(`  Parsed: ${summary.parsed}`);
        logger.log(`  Errors: ${summary.errors}`);
        logger.log(`  Unhandled: ${summary.unhandled}`);

        // Show examples of unhandled segments to help identify missing parsers
        if (summary.unhandled > 0 && summary.results) {
            const unhandledSegments = summary.results.filter(r => r.dispatch.status === 'unhandled');

            if (verbose) {
                logger.log(`\nAll unhandled segments:`);
                unhandledSegments.forEach((segment, index) => {
                    logger.log(`  ${index + 1}. Lines ${segment.startLine}-${segment.endLine} (Recipe Type: ${segment.recipeType || 'unknown'}):`);
                    logger.log(`     ${segment.rawText.replace(/\n/g, '\\n')}`);
                    logger.log('');
                });
            } else {
                logger.log(`\nUnhandled segment examples (showing first 3, use --verbose to see all):`);
                unhandledSegments.slice(0, 3).forEach((segment, index) => {
                    const preview = segment.rawText.length > 100
                        ? segment.rawText.substring(0, 100) + '...'
                        : segment.rawText;
                    logger.log(`  ${index + 1}. Lines ${segment.startLine}-${segment.endLine} (Recipe Type: ${segment.recipeType || 'unknown'}):`);
                    logger.log(`     ${preview.replace(/\n/g, '\\n')}`);
                });

                if (unhandledSegments.length > 3) {
                    logger.log(`     ... and ${unhandledSegments.length - 3} more unhandled segments`);
                }
                logger.log('');
            }
        }

        let resolvedOutput = null;
        if (outputPath) {
            resolvedOutput = path.resolve(outputPath);
            fs.writeFileSync(resolvedOutput, JSON.stringify(summary, null, 2), 'utf8');
            logger.log(`Results written to ${resolvedOutput}`);
        }

        return {
            summary,
            segmentPath,
            outputPath: resolvedOutput,
            databasePath
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
