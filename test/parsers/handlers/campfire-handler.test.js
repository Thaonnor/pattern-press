const handler = require('../../../src/parsers/handlers/campfireHandler');

function createTestSegment(rawText, recipeType = '<recipetype:minecraft:campfire_cooking>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 1
    };
}

describe('campfireHandler', () => {
    describe('interface', () => {
        test('has required interface', () => {
            expect(handler.name).toBe('campfire-handler');
            expect(typeof handler.canParse).toBe('function');
            expect(typeof handler.parse).toBe('function');
        });
    });

    describe('canParse', () => {
        test('returns 1 for segments with campfire.addRecipe calls', () => {
            const segment = createTestSegment('campfire.addRecipe("test_recipe", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);');
            const score = handler.canParse(segment);

            expect(score).toBe(1);
        });

        test('returns 0 for segments without campfire.addRecipe calls', () => {
            const testCases = [
                'craftingTable.addShaped("test", <item:minecraft:stick>, []);',
                'blastFurnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 100);',
                '<recipetype:create:mixing>.addJsonRecipe("test", {});',
                'some other log content'
            ];

            testCases.forEach((rawText, index) => {
                const segment = createTestSegment(rawText);
                const score = handler.canParse(segment);
                expect(score).toBe(0);
            });
        });

        test('handles invalid segment input', () => {
            expect(handler.canParse(null)).toBe(0);
            expect(handler.canParse({})).toBe(0);
            expect(handler.canParse({ rawText: '' })).toBe(0);
        });
    });

    describe('parse', () => {
        test('extracts basic recipe data correctly', () => {
            const segment = createTestSegment(
                'campfire.addRecipe("minecraft:baked_potato_from_campfire_cooking", <item:minecraft:baked_potato>, <item:minecraft:potato>, 0.35, 100);'
            );

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('minecraft:baked_potato_from_campfire_cooking');
            expect(result.recipeType).toBe('<recipetype:minecraft:campfire_cooking>');
            expect(result.format).toBe('addCampfire');
            expect(result.output).toBe('<item:minecraft:baked_potato>');
            expect(result.input).toBe('<item:minecraft:potato>');
            expect(result.experience).toBe(0.35);
            expect(result.cookTime).toBe(100);
        });

        test('handles different food items correctly', () => {
            const testCases = [
                {
                    input: 'campfire.addRecipe("farmersdelight:beef_patty_from_campfire_cooking", <item:farmersdelight:beef_patty>, <item:minecraft:beef>, 0.35, 100);',
                    expectedOutput: '<item:farmersdelight:beef_patty>',
                    expectedInput: '<item:minecraft:beef>'
                },
                {
                    input: 'campfire.addRecipe("create:campfire_cooking/bread", <item:minecraft:bread>, <item:create:dough>, 0.35, 100);',
                    expectedOutput: '<item:minecraft:bread>',
                    expectedInput: '<item:create:dough>'
                },
                {
                    input: 'campfire.addRecipe("minecraft:cooked_chicken_from_campfire_cooking", <item:minecraft:cooked_chicken>, <item:minecraft:chicken>, 0.35, 100);',
                    expectedOutput: '<item:minecraft:cooked_chicken>',
                    expectedInput: '<item:minecraft:chicken>'
                }
            ];

            testCases.forEach(({ input, expectedOutput, expectedInput }, index) => {
                const segment = createTestSegment(input);
                const result = handler.parse(segment);

                expect(result.output).toBe(expectedOutput);
                expect(result.input).toBe(expectedInput);
            });
        });

        test('handles different numeric formats', () => {
            const testCases = [
                { input: '0.35, 100', expectedExp: 0.35, expectedTime: 100 },
                { input: '0.5, 200', expectedExp: 0.5, expectedTime: 200 },
                { input: '1.0, 150', expectedExp: 1.0, expectedTime: 150 },
                { input: '0, 50', expectedExp: 0, expectedTime: 50 }
            ];

            testCases.forEach(({ input, expectedExp, expectedTime }, index) => {
                const segment = createTestSegment(
                    `campfire.addRecipe("test_${index}", <item:minecraft:cooked_beef>, <item:minecraft:beef>, ${input});`
                );

                const result = handler.parse(segment);

                expect({ experience: result.experience, cookTime: result.cookTime }).toEqual(
                    { experience: expectedExp, cookTime: expectedTime }
                );
            });
        });

        test('handles malformed numeric values with fallbacks', () => {
            const segment = createTestSegment(
                'campfire.addRecipe("test_fallback", <item:minecraft:cooked_beef>, <item:minecraft:beef>, invalid, notanumber);'
            );

            const result = handler.parse(segment);

            expect(result.experience).toBe(0.0);
            expect(result.cookTime).toBe(100);
        });

        test('preserves whitespace handling in item specifications', () => {
            const segment = createTestSegment(
                'campfire.addRecipe("whitespace_test",   <item:minecraft:cooked_beef>  ,   <item:minecraft:beef>   , 0.35, 100);'
            );

            const result = handler.parse(segment);

            expect(result.output).toBe('<item:minecraft:cooked_beef>');
            expect(result.input).toBe('<item:minecraft:beef>');
        });

        test('handles complex recipe IDs from different mods', () => {
            const testCases = [
                'minecraft:baked_potato_from_campfire_cooking',
                'farmersdelight:beef_patty_from_campfire_cooking',
                'create:campfire_cooking/bread',
                'modname:very_complex_recipe_name_with_underscores'
            ];

            testCases.forEach((recipeId) => {
                const segment = createTestSegment(
                    `campfire.addRecipe("${recipeId}", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);`
                );

                const result = handler.parse(segment);

                expect(result.recipeId).toBe(recipeId);
            });
        });

        test('throws error for invalid recipe pattern', () => {
            const invalidPatterns = [
                'campfire.addRecipe();', // no parameters
                'campfire.addRecipe("incomplete", <item:test>);', // too few parameters
                'not a campfire recipe at all' // completely wrong format
            ];

            invalidPatterns.forEach((rawText) => {
                const segment = createTestSegment(rawText);

                expect(() => handler.parse(segment)).toThrow(/Unable to match campfire\.addRecipe pattern/);
            });
        });

        test('handles real-world recipe examples', () => {
            // Test with actual examples from the log output
            const realExamples = [
                {
                    input: 'campfire.addRecipe("minecraft:baked_potato_from_campfire_cooking", <item:minecraft:baked_potato>, <item:minecraft:potato>, 0.35, 100);',
                    expectedId: 'minecraft:baked_potato_from_campfire_cooking',
                    description: 'vanilla potato cooking'
                },
                {
                    input: 'campfire.addRecipe("farmersdelight:beef_patty_from_campfire_cooking", <item:farmersdelight:beef_patty>, <item:minecraft:beef>, 0.35, 100);',
                    expectedId: 'farmersdelight:beef_patty_from_campfire_cooking',
                    description: 'modded beef patty cooking'
                },
                {
                    input: 'campfire.addRecipe("create:campfire_cooking/bread", <item:minecraft:bread>, <item:create:dough>, 0.35, 100);',
                    expectedId: 'create:campfire_cooking/bread',
                    description: 'create mod bread cooking'
                }
            ];

            realExamples.forEach(({ input, expectedId, description }) => {
                const segment = createTestSegment(input);
                const result = handler.parse(segment);

                expect(result.recipeId).toBe(expectedId);
            });
        });
    });

    describe('integration', () => {
        test('canParse and parse work together for dispatcher integration', () => {
            const validSegment = createTestSegment('campfire.addRecipe("test", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);');
            const invalidSegment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {});');

            // Valid segment should be parsed successfully
            const canParseValid = handler.canParse(validSegment);
            expect(canParseValid).toBe(1);

            // Invalid segment should not be processed by this handler
            const canParseInvalid = handler.canParse(invalidSegment);
            expect(canParseInvalid).toBe(0);
        });
    });
});