const handler = require('../../../src/parsers/handlers/smokingHandler');

function createTestSegment(rawText, recipeType = '<recipetype:minecraft:smoking>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 1
    };
}

describe('smokingHandler', () => {
    describe('interface', () => {
        test('has required interface', () => {
            expect(handler.name).toBe('smoking-handler');
            expect(typeof handler.canParse).toBe('function');
            expect(typeof handler.parse).toBe('function');
        });
    });

    describe('canParse', () => {
        test('returns 1 for segments with smoker.addRecipe calls', () => {
            const segment = createTestSegment('smoker.addRecipe("minecraft:cooked_beef", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);');
            const score = handler.canParse(segment);

            expect(score).toBe(1);
        });

        test('returns 0 for segments without smoker.addRecipe calls', () => {
            const testCases = [
                'craftingTable.addShaped("test", <item:minecraft:stick>, []);',
                'furnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);',
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
                'smoker.addRecipe("minecraft:cooked_beef", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);'
            );

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('minecraft:cooked_beef');
            expect(result.recipeType).toBe('<recipetype:minecraft:smoking>');
            expect(result.format).toBe('addSmoking');
            expect(result.output).toBe('<item:minecraft:cooked_beef>');
            expect(result.input).toBe('<item:minecraft:beef>');
            expect(result.experience).toBe(0.35);
            expect(result.cookTime).toBe(100);
        });

        test('handles tag inputs correctly', () => {
            const segment = createTestSegment(
                'smoker.addRecipe("cooked_fish_from_raw_fish", <item:minecraft:cooked_cod>, <tag:item:c:raw_fish>, 0.35, 100);'
            );

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('cooked_fish_from_raw_fish');
            expect(result.output).toBe('<item:minecraft:cooked_cod>');
            expect(result.input).toBe('<tag:item:c:raw_fish>');
        });

        test('handles complex item specifications', () => {
            const segment = createTestSegment(
                'smoker.addRecipe("cooked_meat_variety", <item:minecraft:cooked_beef>, <item:minecraft:beef> | <item:minecraft:pork> | <item:minecraft:chicken>, 0.35, 100);'
            );

            const result = handler.parse(segment);

            expect(result.output).toBe('<item:minecraft:cooked_beef>');
            expect(result.input).toBe('<item:minecraft:beef> | <item:minecraft:pork> | <item:minecraft:chicken>');
        });

        test('handles real-world examples from the log file', () => {
            const realExamples = [
                {
                    rawText: 'smoker.addRecipe("minecraft:baked_potato_from_smoking", <item:minecraft:baked_potato>, <item:minecraft:potato>, 0.35, 100);',
                    expectedId: 'minecraft:baked_potato_from_smoking',
                    expectedOutput: '<item:minecraft:baked_potato>',
                    expectedInput: '<item:minecraft:potato>',
                    expectedExp: 0.35,
                    expectedTime: 100
                },
                {
                    rawText: 'smoker.addRecipe("farmersdelight:beef_patty_from_smoking", <item:farmersdelight:beef_patty>, <item:farmersdelight:minced_beef>, 0.35, 100);',
                    expectedId: 'farmersdelight:beef_patty_from_smoking',
                    expectedOutput: '<item:farmersdelight:beef_patty>',
                    expectedInput: '<item:farmersdelight:minced_beef>',
                    expectedExp: 0.35,
                    expectedTime: 100
                },
                {
                    rawText: 'smoker.addRecipe("farmersdelight:bread_from_smoking", <item:minecraft:bread>, <item:farmersdelight:wheat_dough>, 0.35, 100);',
                    expectedId: 'farmersdelight:bread_from_smoking',
                    expectedOutput: '<item:minecraft:bread>',
                    expectedInput: '<item:farmersdelight:wheat_dough>',
                    expectedExp: 0.35,
                    expectedTime: 100
                }
            ];

            realExamples.forEach((example, index) => {
                const segment = createTestSegment(example.rawText);
                const result = handler.parse(segment);

                expect({
                    recipeId: result.recipeId,
                    output: result.output,
                    input: result.input,
                    experience: result.experience,
                    cookTime: result.cookTime
                }).toEqual({
                    recipeId: example.expectedId,
                    output: example.expectedOutput,
                    input: example.expectedInput,
                    experience: example.expectedExp,
                    cookTime: example.expectedTime
                });
            });
        });

        test('handles different numeric formats', () => {
            const testCases = [
                { input: '0.35, 100', expectedExp: 0.35, expectedTime: 100 },
                { input: '0.1, 50', expectedExp: 0.1, expectedTime: 50 },
                { input: '1.0, 200', expectedExp: 1.0, expectedTime: 200 },
                { input: '0, 80', expectedExp: 0, expectedTime: 80 },
                { input: '0.5, 100', expectedExp: 0.5, expectedTime: 100 }
            ];

            testCases.forEach(({ input, expectedExp, expectedTime }, index) => {
                const segment = createTestSegment(
                    `smoker.addRecipe("test_${index}", <item:minecraft:cooked_beef>, <item:minecraft:beef>, ${input});`
                );

                const result = handler.parse(segment);

                expect({ experience: result.experience, cookTime: result.cookTime }).toEqual(
                    { experience: expectedExp, cookTime: expectedTime }
                );
            });
        });

        test('handles malformed numeric values with fallbacks', () => {
            const segment = createTestSegment(
                'smoker.addRecipe("test_fallback", <item:minecraft:cooked_beef>, <item:minecraft:beef>, invalid, notanumber);'
            );

            const result = handler.parse(segment);

            expect(result.experience).toBe(0.0);
            expect(result.cookTime).toBe(100); // Default for smoking is 100 ticks
        });

        test('preserves whitespace handling in item specifications', () => {
            const segment = createTestSegment(
                'smoker.addRecipe("whitespace_test",   <item:minecraft:cooked_beef>  ,   <item:minecraft:beef>   , 0.35, 100);'
            );

            const result = handler.parse(segment);

            expect(result.output).toBe('<item:minecraft:cooked_beef>');
            expect(result.input).toBe('<item:minecraft:beef>');
        });

        test('handles modded food items with complex namespaces', () => {
            const testCases = [
                {
                    rawText: 'smoker.addRecipe("farmersdelight:cooked_mutton_from_smoking", <item:minecraft:cooked_mutton>, <item:minecraft:mutton>, 0.35, 100);',
                    expectedId: 'farmersdelight:cooked_mutton_from_smoking',
                    expectedOutput: '<item:minecraft:cooked_mutton>',
                    expectedInput: '<item:minecraft:mutton>'
                },
                {
                    rawText: 'smoker.addRecipe("complexmod:special_cooked_food", <item:complexmod:cooked_special_meat>, <item:complexmod:raw_special_meat>, 0.5, 150);',
                    expectedId: 'complexmod:special_cooked_food',
                    expectedOutput: '<item:complexmod:cooked_special_meat>',
                    expectedInput: '<item:complexmod:raw_special_meat>'
                }
            ];

            testCases.forEach((testCase) => {
                const segment = createTestSegment(testCase.rawText);
                const result = handler.parse(segment);

                expect(result.recipeId).toBe(testCase.expectedId);
                expect(result.output).toBe(testCase.expectedOutput);
                expect(result.input).toBe(testCase.expectedInput);
            });
        });

        test('throws error for invalid recipe pattern', () => {
            const invalidPatterns = [
                'smoker.addRecipe();', // no parameters
                'smoker.addRecipe("incomplete", <item:test>);', // too few parameters
                'not a recipe at all', // completely wrong format
                'furnace.addRecipe("wrong_method", <item:test>, <item:test>, 0.35, 100);' // wrong method
            ];

            invalidPatterns.forEach((rawText) => {
                const segment = createTestSegment(rawText);

                expect(() => handler.parse(segment)).toThrow(/Unable to match smoker\.addRecipe pattern/);
            });
        });

        test('handles edge case recipe IDs', () => {
            const testCases = [
                'simple_id',
                'mod:complex_recipe_name_with_underscores',
                'namespace:very/complex/recipe/path',
                'farmersdelight:beef_patty_from_smoking'
            ];

            testCases.forEach((recipeId) => {
                const segment = createTestSegment(
                    `smoker.addRecipe("${recipeId}", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);`
                );

                const result = handler.parse(segment);

                expect(result.recipeId).toBe(recipeId);
            });
        });

        test('handles decimal and integer experience values correctly', () => {
            const testCases = [
                { exp: '0.35', expected: 0.35 },
                { exp: '0.1', expected: 0.1 },
                { exp: '0.5', expected: 0.5 },
                { exp: '0', expected: 0 },
                { exp: '1', expected: 1 },
                { exp: '1.0', expected: 1.0 }
            ];

            testCases.forEach(({ exp, expected }) => {
                const segment = createTestSegment(
                    `smoker.addRecipe("test", <item:minecraft:cooked_beef>, <item:minecraft:beef>, ${exp}, 100);`
                );

                const result = handler.parse(segment);

                expect(result.experience).toBe(expected);
            });
        });

        test('handles faster cooking times typical for smokers', () => {
            const testCases = [
                { time: '100', expected: 100 }, // Default smoker time
                { time: '50', expected: 50 },   // Faster than furnace
                { time: '80', expected: 80 },   // Typical smoker range
                { time: '200', expected: 200 }  // Slower edge case
            ];

            testCases.forEach(({ time, expected }) => {
                const segment = createTestSegment(
                    `smoker.addRecipe("test", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, ${time});`
                );

                const result = handler.parse(segment);

                expect(result.cookTime).toBe(expected);
            });
        });
    });

    describe('integration', () => {
        test('canParse and parse work together for dispatcher integration', () => {
            const validSegment = createTestSegment('smoker.addRecipe("test", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);');
            const invalidSegment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {});');

            // Valid segment should be parsed successfully
            const canParseValid = handler.canParse(validSegment);
            expect(canParseValid).toBe(1);

            const parsedResult = handler.parse(validSegment);
            expect(parsedResult.format).toBe('addSmoking');

            // Invalid segment should not be processed by this handler
            const canParseInvalid = handler.canParse(invalidSegment);
            expect(canParseInvalid).toBe(0);
        });

        test('works with different recipe types', () => {
            const segment = createTestSegment(
                'smoker.addRecipe("test", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);',
                '<recipetype:minecraft:smoking>'
            );

            const result = handler.parse(segment);

            expect(result.recipeType).toBe('<recipetype:minecraft:smoking>');
        });

        test('maintains consistent format identifier', () => {
            const segment = createTestSegment('smoker.addRecipe("test", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);');
            const result = handler.parse(segment);

            expect(result.format).toBe('addSmoking');
        });

        test('distinguishes from other cooking methods', () => {
            const smokingSegment = createTestSegment('smoker.addRecipe("test", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);');
            const furnaceSegment = createTestSegment('furnace.addRecipe("test", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 200);');
            const blastFurnaceSegment = createTestSegment('blastFurnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 100);');

            // Only smoking segment should be parseable
            expect(handler.canParse(smokingSegment)).toBe(1);
            expect(handler.canParse(furnaceSegment)).toBe(0);
            expect(handler.canParse(blastFurnaceSegment)).toBe(0);
        });
    });
});