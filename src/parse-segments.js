'use strict';

const fs = require('fs');
const path = require('path');
const { processSegmentFile } = require('./parsers');
const { RecipeDatabase } = require('./recipe-database');
const { normalizeRecipeTypeValue } = require('./utils/recipe-utils');
const { logDetailedStats, getQuickSummary, getTopUnhandledTypes } = require('./utils/parse-stats');

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

        // Use enhanced logging for better coverage analysis
        console.log('\n' + '='.repeat(60));
        console.log('CRAFTTWEAKER PARSING ANALYSIS');
        console.log('='.repeat(60));

        logDetailedStats(summary, {
            showDetails: true,
            maxUnhandled: verbose ? Infinity : 5
        });

        // Show development priorities
        const topUnhandled = getTopUnhandledTypes(summary, 5);
        if (topUnhandled.length > 0) {
            console.log('\n🎯 DEVELOPMENT PRIORITIES:');
            console.log('-'.repeat(30));
            topUnhandled.forEach((item, index) => {
                const priority = item.priority === 'HIGH' ? '🔴' : item.priority === 'MEDIUM' ? '🟡' : '🟢';
                console.log(`${index + 1}. ${priority} ${item.type.replace('<recipetype:', '').replace('>', '')}: ${item.count} recipes`);
            });
            console.log(`\n💡 Focus on HIGH priority types for maximum coverage impact`);
        }

        console.log('='.repeat(60));

        // Show detailed examples only if verbose mode
        if (verbose && summary.unhandled > 0 && summary.results) {
            const unhandledSegments = summary.results.filter(r => r.dispatch.status === 'unhandled');

            console.log(`\n🔍 DETAILED UNHANDLED EXAMPLES:`);
            console.log('-'.repeat(40));
            unhandledSegments.slice(0, 10).forEach((segment, index) => {
                logger.log(`${index + 1}. ${segment.recipeType || 'unknown'} (lines ${segment.startLine}-${segment.endLine}):`);
                logger.log(`   ${segment.rawText.replace(/\n/g, '\\n')}`);
                logger.log('');
            });

            if (unhandledSegments.length > 10) {
                logger.log(`... and ${unhandledSegments.length - 10} more unhandled segments`);
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
