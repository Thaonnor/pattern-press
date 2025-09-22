'use strict';

/**
 * @typedef {Object} CliOption
 * @property {string} name Option name (without dashes).
 * @property {string[]} aliases Alternative names for the option.
 * @property {boolean} requiresValue Whether the option requires a value.
 * @property {string} [description] Description of the option.
 */

/**
 * @typedef {Object} ParsedArgs
 * @property {string[]} positional Positional arguments (non-option arguments).
 * @property {Record<string, string|boolean>} options Parsed options with their values.
 * @property {string[]} unknown Unknown arguments that didn't match any option.
 */

/**
 * Simple CLI argument parser with support for options and positional arguments.
 */
class CliParser {
    constructor() {
        this.options = new Map();
        this.logger = console;
    }

    /**
     * Sets the logger for warnings and errors.
     * @param {Console} logger Logger instance to use.
     * @returns {CliParser} This parser for chaining.
     */
    setLogger(logger) {
        this.logger = logger;
        return this;
    }

    /**
     * Adds an option definition to the parser.
     * @param {CliOption} option Option configuration.
     * @returns {CliParser} This parser for chaining.
     */
    addOption(option) {
        const { name, aliases = [], requiresValue = false, description = '' } = option;

        const optionConfig = { name, requiresValue, description };

        // Register the main name
        this.options.set(`--${name}`, optionConfig);

        // Register aliases
        aliases.forEach(alias => {
            if (alias.length === 1) {
                this.options.set(`-${alias}`, optionConfig);
            } else {
                this.options.set(`--${alias}`, optionConfig);
            }
        });

        return this;
    }

    /**
     * Parses command line arguments.
     * @param {string[]} args Array of command line arguments.
     * @returns {ParsedArgs} Parsed arguments object.
     */
    parse(args) {
        const result = {
            positional: [],
            options: {},
            unknown: []
        };

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (!arg.startsWith('-')) {
                result.positional.push(arg);
                continue;
            }

            const optionConfig = this.options.get(arg);
            if (!optionConfig) {
                result.unknown.push(arg);
                this.logger.warn(`Unknown argument ignored: ${arg}`);
                continue;
            }

            if (optionConfig.requiresValue) {
                const nextArg = args[i + 1];
                if (!nextArg || nextArg.startsWith('-')) {
                    throw new Error(`Missing value for ${arg} option.`);
                }
                result.options[optionConfig.name] = nextArg;
                i++; // Skip the value argument
            } else {
                result.options[optionConfig.name] = true;
            }
        }

        return result;
    }

    /**
     * Generates a usage string for the defined options.
     * @param {string} [programName] Name of the program.
     * @param {string} [description] Program description.
     * @returns {string} Usage string.
     */
    generateUsage(programName = 'program', description = '') {
        let usage = `Usage: ${programName}`;

        if (this.options.size > 0) {
            usage += ' [options]';
        }

        if (description) {
            usage += `\n\n${description}`;
        }

        if (this.options.size > 0) {
            usage += '\n\nOptions:';
            const optionsByName = new Map();

            // Group options by their primary name
            for (const [flag, config] of this.options) {
                if (!optionsByName.has(config.name)) {
                    optionsByName.set(config.name, { config, flags: [] });
                }
                optionsByName.get(config.name).flags.push(flag);
            }

            for (const [name, { config, flags }] of optionsByName) {
                const flagsList = flags.join(', ');
                const valueHint = config.requiresValue ? ' <value>' : '';
                const desc = config.description ? ` - ${config.description}` : '';
                usage += `\n  ${flagsList}${valueHint}${desc}`;
            }
        }

        return usage;
    }
}

/**
 * Creates a pre-configured CLI parser with common options.
 * @returns {CliParser} Configured parser.
 */
function createCommonParser() {
    return new CliParser()
        .addOption({
            name: 'help',
            aliases: ['h'],
            requiresValue: false,
            description: 'Show this help message'
        })
        .addOption({
            name: 'verbose',
            aliases: ['v'],
            requiresValue: false,
            description: 'Enable verbose output'
        });
}

/**
 * Simple helper for validating required arguments.
 * @param {ParsedArgs} parsed Parsed arguments.
 * @param {string[]} required Array of required positional argument names.
 * @throws {Error} When required arguments are missing.
 */
function validateRequired(parsed, required) {
    if (parsed.positional.length < required.length) {
        const missing = required.slice(parsed.positional.length);
        throw new Error(`Missing required arguments: ${missing.join(', ')}`);
    }
}

/**
 * Helper for extracting positional arguments by name.
 * @param {ParsedArgs} parsed Parsed arguments.
 * @param {string[]} names Names for positional arguments.
 * @returns {Record<string, string>} Named positional arguments.
 */
function extractPositional(parsed, names) {
    const result = {};
    names.forEach((name, index) => {
        result[name] = parsed.positional[index] || null;
    });
    return result;
}

module.exports = {
    CliParser,
    createCommonParser,
    validateRequired,
    extractPositional
};