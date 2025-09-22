'use strict';

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const readline = require('readline');

class RecipeSegment {
    /**
     * Represents a contiguous chunk of CraftTweaker log output associated with a recipe handler.
     *
     * @param {{ recipeType: string|null, startLine: number, endLine: number, lines: string[] }} params
     * Fields extracted from the segment accumulator.
     */
    constructor({ recipeType, startLine, endLine, lines }) {
        this.recipeType = recipeType;
        this.startLine = startLine;
        this.endLine = endLine;
        this.rawText = lines.join('\n');
    }
}

const defaultOptions = {
    startPatterns: [
        /^<recipetype:[^>]+>\.[a-zA-Z]/,
        /^craftingTable\.[a-zA-Z]/,
        /^[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+\(/
    ]
};

function isRecipeStart(trimmedLine, patterns) {
    return patterns.some((pattern) => pattern.test(trimmedLine));
}

function adjustParenthesisDepth(line) {
    const opens = (line.match(/\(/g) || []).length;
    const closes = (line.match(/\)/g) || []).length;
    return opens - closes;
}

function timestampSlug(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hour = pad(date.getUTCHours());
    const minute = pad(date.getUTCMinutes());
    const second = pad(date.getUTCSeconds());
    return `${year}${month}${day}-${hour}${minute}${second}`;
}

function createSegmentAccumulator(options = {}) {
    const config = { ...defaultOptions, ...options };
    const segments = [];

    let currentRecipeType = null;
    let activeSegment = null;
    let parenDepth = 0;

    function pushActiveSegment(endLine) {
        if (!activeSegment) {
            return;
        }

        segments.push(new RecipeSegment({
            recipeType: activeSegment.recipeType,
            startLine: activeSegment.startLine,
            endLine,
            lines: activeSegment.lines
        }));

        activeSegment = null;
        parenDepth = 0;
    }

    return {
        /**
         * Evaluates an incoming log line and mutates the active segment state when appropriate.
         *
         * @param {string} line Raw log line.
         * @param {number} lineNumber 1-based file line number used for diagnostics.
         */
        handleLine(line, lineNumber) {
            const trimmed = line.trim();

            if (!trimmed) {
                return;
            }

            const recipeTypeMatch = trimmed.match(/Recipe type:\s*'(<recipetype:[^']+>)'/);
            if (recipeTypeMatch) {
                currentRecipeType = recipeTypeMatch[1];
                return;
            }

            if (!activeSegment) {
                if (!isRecipeStart(trimmed, config.startPatterns)) {
                    return;
                }

                activeSegment = {
                    recipeType: currentRecipeType,
                    startLine: lineNumber,
                    lines: []
                };
                parenDepth = 0;
            }

            activeSegment.lines.push(line);
            parenDepth += adjustParenthesisDepth(line);

            if (parenDepth <= 0 && trimmed.endsWith(');')) {
                pushActiveSegment(lineNumber);
            }
        },

        /**
         * Flushes any incomplete segment at the end of the file.
         *
         * @param {number} lineNumber Line number to use as the closing boundary.
         */
        finalize(lineNumber) {
            if (activeSegment) {
                pushActiveSegment(lineNumber);
            }
        },

        /**
         * @returns {RecipeSegment[]} All segments accumulated so far.
         */
        getSegments() {
            return segments;
        }
    };
}

/**
 * Reads a CraftTweaker log from disk and breaks it into recipe segments.
 *
 * @param {string} logPath Path to the `crafttweaker.log` file.
 * @param {{ startPatterns?: RegExp[] }} [options] Optional overrides for handler detection.
 * @returns {Promise<RecipeSegment[]>} Segmented recipe chunks.
 */
async function segmentLogFile(logPath, options = {}) {
    const resolvedPath = path.resolve(logPath);
    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Log file not found: ${resolvedPath}`);
    }

    const rl = readline.createInterface({
        input: fs.createReadStream(resolvedPath, { encoding: 'utf8' }),
        crlfDelay: Infinity
    });

    const accumulator = createSegmentAccumulator(options);
    let lineNumber = 0;

    for await (const line of rl) {
        lineNumber += 1;
        accumulator.handleLine(line, lineNumber);
    }

    accumulator.finalize(lineNumber);
    return accumulator.getSegments();
}

/**
 * Segments an in-memory log string without touching the filesystem.
 *
 * @param {string} logContent Raw log content.
 * @param {{ startPatterns?: RegExp[] }} [options] Optional overrides for handler detection.
 * @returns {RecipeSegment[]} Segmented recipe chunks.
 */
function segmentLogContent(logContent, options = {}) {
    if (typeof logContent !== 'string') {
        throw new Error('logContent must be a string');
    }

    const lines = logContent.split(/\r?\n/);
    const accumulator = createSegmentAccumulator(options);

    for (let index = 0; index < lines.length; index += 1) {
        accumulator.handleLine(lines[index], index + 1);
    }

    accumulator.finalize(lines.length);
    return accumulator.getSegments();
}

/**
 * Persists segmented log output to a timestamped JSON file.
 *
 * @param {RecipeSegment[]} segments Segments to serialize.
 * @param {string} outputDir Destination directory.
 * @param {{ prefix?: string, includeRaw?: boolean }} [options] Output shaping options.
 * @returns {Promise<string>} Absolute path to the written JSON artifact.
 */
async function persistSegments(segments, outputDir, options = {}) {
    const { prefix = 'segments', includeRaw = true } = options;

    await fsPromises.mkdir(outputDir, { recursive: true });

    const fileName = `${prefix}-${timestampSlug()}.json`;
    const filePath = path.join(outputDir, fileName);

    const payload = {
        generatedAt: new Date().toISOString(),
        count: segments.length,
        segments: segments.map((segment, index) => ({
            id: `${prefix}-${index + 1}`,
            recipeType: segment.recipeType,
            startLine: segment.startLine,
            endLine: segment.endLine,
            status: 'pending',
            rawText: includeRaw ? segment.rawText : undefined
        }))
    };

    if (!includeRaw) {
        payload.segments.forEach((entry) => {
            delete entry.rawText;
        });
    }

    await fsPromises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
    return filePath;
}

module.exports = {
    segmentLogFile,
    segmentLogContent,
    RecipeSegment,
    persistSegments
};

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('Usage: node log-segmenter.js <path-to-crafttweaker.log> [--out-dir ./segments] [--prefix run1]');
        process.exit(1);
    }

    let targetPath = null;
    let outDir = null;
    let prefix = 'segments';

    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];

        if (!targetPath && !arg.startsWith('--')) {
            targetPath = arg;
            continue;
        }

        if (arg === '--out-dir') {
            outDir = args[i + 1];
            i += 1;
            continue;
        }

        if (arg === '--prefix') {
            prefix = args[i + 1] || prefix;
            i += 1;
            continue;
        }

        console.warn(`Unknown argument ignored: ${arg}`);
    }

    if (!targetPath) {
        console.error('Missing path to log file.');
        process.exit(1);
    }

    (async () => {
        try {
            const segments = await segmentLogFile(targetPath);
            console.log(`Found ${segments.length} recipe statements.`);

            if (segments.length > 0) {
                const preview = segments.slice(0, 3).map((segment) => ({
                    recipeType: segment.recipeType,
                    startLine: segment.startLine,
                    endLine: segment.endLine,
                    sample: segment.rawText.split('\n')[0].trim()
                }));
                console.log('Preview:', preview);
            }

            if (outDir) {
                const outputFile = await persistSegments(segments, outDir, {
                    prefix,
                    includeRaw: true
                });
                console.log(`Persisted segments to ${outputFile}`);
            }
        } catch (error) {
            console.error('Failed to segment log:', error.message);
            process.exit(1);
        }
    })();
}
