'use strict';

const fs = require('fs');
const path = require('path');
const { processSegmentFile } = require('./parsers');

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('Usage: node parse-segments.js <segments.json> [--out <results.json>]');
        process.exit(1);
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
            outputPath = args[i + 1];
            i += 1;
            continue;
        }

        console.warn(`Unknown argument ignored: ${arg}`);
    }

    if (!segmentPath) {
        console.error('Missing path to segment JSON file.');
        process.exit(1);
    }

    (async () => {
        try {
            const summary = await processSegmentFile(segmentPath);
            console.log(`Processed ${summary.total} segments.`);
            console.log(`  Parsed: ${summary.parsed}`);
            console.log(`  Errors: ${summary.errors}`);
            console.log(`  Unhandled: ${summary.unhandled}`);

            if (outputPath) {
                const resolved = path.resolve(outputPath);
                fs.writeFileSync(resolved, JSON.stringify(summary, null, 2), 'utf8');
                console.log(`Results written to ${resolved}`);
            }
        } catch (error) {
            console.error('Failed to process segments:', error.message);
            process.exit(1);
        }
    })();
}
