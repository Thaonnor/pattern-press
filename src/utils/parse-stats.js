'use strict';

/**
 * Lightweight parsing statistics utility for CraftTweaker recipe parsing.
 *
 * Provides formatted statistics output and structured data for programmatic use.
 * Works with existing console.log approach - no external dependencies.
 */

/**
 * Analyzes parsing results and returns structured statistics.
 *
 * @param {Object} results Results from processSegments() or processSegmentFile()
 * @returns {Object} Structured statistics data
 */
function analyzeResults(results) {
    const total = results.total || results.results?.length || 0;
    const parsed = results.parsed || results.results?.filter(r => r.dispatch?.status === 'parsed').length || 0;
    const errors = results.errors || results.results?.filter(r => r.dispatch?.status === 'error').length || 0;
    const unhandled = results.unhandled || results.results?.filter(r => r.dispatch?.status === 'unhandled').length || 0;

    // Group by recipe type
    const parsedByType = {};
    const unhandledByType = {};
    const errorsByType = {};

    if (results.results) {
        results.results.forEach(result => {
            const type = result.recipeType || 'unknown';
            const status = result.dispatch?.status || 'unknown';

            if (status === 'parsed') {
                parsedByType[type] = (parsedByType[type] || 0) + 1;
            } else if (status === 'unhandled') {
                unhandledByType[type] = (unhandledByType[type] || 0) + 1;
            } else if (status === 'error') {
                errorsByType[type] = (errorsByType[type] || 0) + 1;
            }
        });
    }

    const coverage = total > 0 ? ((parsed / total) * 100).toFixed(1) : '0.0';

    return {
        summary: {
            total,
            parsed,
            errors,
            unhandled,
            coverage: parseFloat(coverage)
        },
        byType: {
            parsed: parsedByType,
            unhandled: unhandledByType,
            errors: errorsByType
        }
    };
}

/**
 * Logs detailed parsing statistics to console.
 *
 * @param {Object} results Parsing results from dispatcher
 * @param {Object} options Logging options
 * @param {boolean} [options.showDetails=true] Show breakdown by type
 * @param {number} [options.maxUnhandled=5] Max unhandled types to show
 */
function logDetailedStats(results, options = {}) {
    const showDetails = options.showDetails !== false;
    const maxUnhandled = options.maxUnhandled || 5;

    const stats = analyzeResults(results);
    const { summary, byType } = stats;

    console.log(`📊 Parsing Coverage: ${summary.coverage}% (${summary.parsed}/${summary.total})`);
    console.log(`✅ Parsed: ${summary.parsed} | ❌ Errors: ${summary.errors} | 🚫 Unhandled: ${summary.unhandled}`);

    if (showDetails && Object.keys(byType.unhandled).length > 0) {
        console.log('\n🚫 Top Unhandled Types:');
        Object.entries(byType.unhandled)
            .sort(([,a], [,b]) => b - a)
            .slice(0, maxUnhandled)
            .forEach(([type, count]) => {
                const priority = count >= 100 ? '🔴' : count >= 20 ? '🟡' : '🟢';
                console.log(`   ${priority} ${type}: ${count} recipes`);
            });

        const totalUnhandled = Object.values(byType.unhandled).reduce((sum, count) => sum + count, 0);
        const potentialCoverage = ((summary.parsed + totalUnhandled) / summary.total * 100).toFixed(1);
        console.log(`💡 Potential coverage with all handlers: ${potentialCoverage}%`);
    }
}

/**
 * Returns a one-line summary string for minimal logging.
 *
 * @param {Object} results Parsing results
 * @returns {string} Formatted summary line
 */
function getQuickSummary(results) {
    const stats = analyzeResults(results);
    const { summary } = stats;

    return `Coverage: ${summary.coverage}% (${summary.parsed}/${summary.total}) | Unhandled: ${summary.unhandled} | Errors: ${summary.errors}`;
}

/**
 * Gets the top unhandled recipe types for development prioritization.
 *
 * @param {Object} results Parsing results
 * @param {number} [limit=3] Number of top types to return
 * @returns {Array<{type: string, count: number, priority: string}>} Top unhandled types
 */
function getTopUnhandledTypes(results, limit = 3) {
    const stats = analyzeResults(results);

    return Object.entries(stats.byType.unhandled)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([type, count]) => ({
            type,
            count,
            priority: count >= 100 ? 'HIGH' : count >= 20 ? 'MEDIUM' : 'LOW'
        }));
}

module.exports = {
    analyzeResults,
    logDetailedStats,
    getQuickSummary,
    getTopUnhandledTypes
};