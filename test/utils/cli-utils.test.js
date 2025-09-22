const {
    CliParser,
    createCommonParser,
    validateRequired,
    extractPositional
} = require('../../src/utils/cli-utils');

describe('cli-utils', () => {
    describe('CliParser', () => {
        test('handles basic options', () => {
            const parser = new CliParser()
                .addOption({ name: 'verbose', aliases: ['v'], requiresValue: false })
                .addOption({ name: 'output', aliases: ['o'], requiresValue: true });

            const result = parser.parse(['--verbose', '--output', 'file.txt', 'input.log']);

            expect(result.options.verbose).toBe(true);
            expect(result.options.output).toBe('file.txt');
            expect(result.positional).toEqual(['input.log']);
            expect(result.unknown).toHaveLength(0);
        });

        test('handles aliases', () => {
            const parser = new CliParser()
                .addOption({ name: 'verbose', aliases: ['v'], requiresValue: false });

            const result = parser.parse(['-v']);
            expect(result.options.verbose).toBe(true);
        });

        test('validates required values', () => {
            const parser = new CliParser()
                .addOption({ name: 'output', requiresValue: true });

            expect(() => {
                parser.parse(['--output']);
            }).toThrow(/Missing value for --output/);

            expect(() => {
                parser.parse(['--output', '--verbose']);
            }).toThrow(/Missing value for --output/);
        });

        test('tracks unknown arguments', () => {
            const mockLogger = { warn: jest.fn() }; // Silent logger for test
            const parser = new CliParser().setLogger(mockLogger);

            const result = parser.parse(['--unknown', 'value']);
            expect(result.unknown).toEqual(['--unknown']);
        });

        test('generateUsage creates help text', () => {
            const parser = new CliParser()
                .addOption({ name: 'verbose', aliases: ['v'], requiresValue: false, description: 'Enable verbose output' })
                .addOption({ name: 'output', aliases: ['o'], requiresValue: true, description: 'Output file path' });

            const usage = parser.generateUsage('my-program', 'A test program');

            expect(usage).toMatch(/Usage: my-program \[options\]/);
            expect(usage).toMatch(/A test program/);
            expect(usage).toMatch(/--verbose, -v.*Enable verbose output/);
            expect(usage).toMatch(/--output, -o <value>.*Output file path/);
        });
    });

    describe('createCommonParser', () => {
        test('includes standard options', () => {
            const parser = createCommonParser();
            const result = parser.parse(['--help', '--verbose']);

            expect(result.options.help).toBe(true);
            expect(result.options.verbose).toBe(true);
        });
    });

    describe('validateRequired', () => {
        test('enforces required positional arguments', () => {
            const parsed = { positional: ['file1.txt'], options: {} };

            expect(() => {
                validateRequired(parsed, ['input']);
            }).not.toThrow();

            expect(() => {
                validateRequired(parsed, ['input', 'output']);
            }).toThrow(/Missing required arguments: output/);
        });
    });

    describe('extractPositional', () => {
        test('maps positional arguments to names', () => {
            const parsed = { positional: ['input.log', 'output.json'], options: {} };
            const result = extractPositional(parsed, ['input', 'output', 'extra']);

            expect(result.input).toBe('input.log');
            expect(result.output).toBe('output.json');
            expect(result.extra).toBeNull();
        });
    });
});