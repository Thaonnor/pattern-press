const handler = require('../../../src/parsers/handlers/smeltingHandler');

function createTestSegment(rawText, recipeType = '<recipetype:minecraft:smelting>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 1
    };
}

describe('smeltingHandler', () => {
    describe('interface', () => {
        test('has required interface', () => {
            expect(handler.name).toBe('smelting-handler');
            expect(typeof handler.canParse).toBe('function');
            expect(typeof handler.parse).toBe('function');
        });
    });

    describe('canParse', () => {
        test('returns 1 for segments with furnace.addRecipe calls', () => {
            const segment = createTestSegment('furnace.addRecipe("minecraft:iron_ingot", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);');
            const score = handler.canParse(segment);

            expect(score).toBe(1);
        });

        test('returns 0 for segments without furnace.addRecipe calls', () => {
            const testCases = [
                'craftingTable.addShaped("test", <item:minecraft:stick>, []);',
                'blastFurnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 100);',
                'smoker.addRecipe("test", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);',
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
                'furnace.addRecipe("minecraft:iron_ingot", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);'
            );

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('minecraft:iron_ingot');
            expect(result.recipeType).toBe('<recipetype:minecraft:smelting>');
            expect(result.format).toBe('addSmelting');
            expect(result.output).toBe('<item:minecraft:iron_ingot>');
            expect(result.input).toBe('<item:minecraft:iron_ore>');
            expect(result.experience).toBe(0.7);
            expect(result.cookTime).toBe(200);
        });

        test('handles tag inputs correctly', () => {
            const segment = createTestSegment(
                'furnace.addRecipe("ftbmaterials:aluminum_ingot_from_smelting_aluminum_raw_ore", <item:ftbmaterials:aluminum_ingot>, <tag:item:c:raw_materials/aluminum>, 0.7, 200);'
            );

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('ftbmaterials:aluminum_ingot_from_smelting_aluminum_raw_ore');
            expect(result.output).toBe('<item:ftbmaterials:aluminum_ingot>');
            expect(result.input).toBe('<tag:item:c:raw_materials/aluminum>');
        });

        test('handles complex item specifications', () => {
            const segment = createTestSegment(
                'furnace.addRecipe("gold_from_tools", <item:minecraft:gold_nugget>, <item:minecraft:golden_pickaxe> | <item:minecraft:golden_shovel> | <item:minecraft:golden_axe>, 0.1, 200);'
            );

            const result = handler.parse(segment);

            expect(result.output).toBe('<item:minecraft:gold_nugget>');
            expect(result.input).toBe('<item:minecraft:golden_pickaxe> | <item:minecraft:golden_shovel> | <item:minecraft:golden_axe>');
        });

        test('handles real-world examples from the log file', () => {
            const realExamples = [
                {
                    rawText: 'furnace.addRecipe("oritech:adamant_ingot_from_smelting_adamant_dust", <item:oritech:adamant_ingot>, <item:oritech:adamant_dust>, 1.0, 200);',
                    expectedId: 'oritech:adamant_ingot_from_smelting_adamant_dust',
                    expectedOutput: '<item:oritech:adamant_ingot>',
                    expectedInput: '<item:oritech:adamant_dust>',
                    expectedExp: 1.0,
                    expectedTime: 200
                },
                {
                    rawText: 'furnace.addRecipe("refinedstorage:advanced_processor", <item:refinedstorage:advanced_processor>, <item:refinedstorage:raw_advanced_processor>, 0.5, 200);',
                    expectedId: 'refinedstorage:advanced_processor',
                    expectedOutput: '<item:refinedstorage:advanced_processor>',
                    expectedInput: '<item:refinedstorage:raw_advanced_processor>',
                    expectedExp: 0.5,
                    expectedTime: 200
                },
                {
                    rawText: 'furnace.addRecipe("minecraft:baked_potato", <item:minecraft:baked_potato>, <item:minecraft:potato>, 0.35, 200);',
                    expectedId: 'minecraft:baked_potato',
                    expectedOutput: '<item:minecraft:baked_potato>',
                    expectedInput: '<item:minecraft:potato>',
                    expectedExp: 0.35,
                    expectedTime: 200
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
                { input: '1.0, 200', expectedExp: 1.0, expectedTime: 200 },
                { input: '0.35, 150', expectedExp: 0.35, expectedTime: 150 },
                { input: '2.0, 100', expectedExp: 2.0, expectedTime: 100 },
                { input: '0, 50', expectedExp: 0, expectedTime: 50 },
                { input: '0.7, 200', expectedExp: 0.7, expectedTime: 200 }
            ];

            testCases.forEach(({ input, expectedExp, expectedTime }, index) => {
                const segment = createTestSegment(
                    `furnace.addRecipe("test_${index}", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, ${input});`
                );

                const result = handler.parse(segment);

                expect({ experience: result.experience, cookTime: result.cookTime }).toEqual(
                    { experience: expectedExp, cookTime: expectedTime }
                );
            });
        });

        test('handles malformed numeric values with fallbacks', () => {
            const segment = createTestSegment(
                'furnace.addRecipe("test_fallback", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, invalid, notanumber);'
            );

            const result = handler.parse(segment);

            expect(result.experience).toBe(0.0);
            expect(result.cookTime).toBe(200); // Default for smelting is 200 ticks
        });

        test('preserves whitespace handling in item specifications', () => {
            const segment = createTestSegment(
                'furnace.addRecipe("whitespace_test",   <item:minecraft:iron_ingot>  ,   <item:minecraft:iron_ore>   , 0.7, 200);'
            );

            const result = handler.parse(segment);

            expect(result.output).toBe('<item:minecraft:iron_ingot>');
            expect(result.input).toBe('<item:minecraft:iron_ore>');
        });

        test('handles modded items with complex namespaces', () => {
            const segment = createTestSegment(
                'furnace.addRecipe("farmersdelight:beef_patty", <item:farmersdelight:beef_patty>, <item:farmersdelight:minced_beef>, 0.35, 200);'
            );

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('farmersdelight:beef_patty');
            expect(result.output).toBe('<item:farmersdelight:beef_patty>');
            expect(result.input).toBe('<item:farmersdelight:minced_beef>');
        });

        test('throws error for invalid recipe pattern', () => {
            const invalidPatterns = [
                'furnace.addRecipe();', // no parameters
                'furnace.addRecipe("incomplete", <item:test>);', // too few parameters
                'not a recipe at all', // completely wrong format
                'blastFurnace.addRecipe("wrong_method", <item:test>, <item:test>, 0.7, 100);' // wrong method
            ];

            invalidPatterns.forEach((rawText) => {
                const segment = createTestSegment(rawText);

                expect(() => handler.parse(segment)).toThrow(/Unable to match furnace\.addRecipe pattern/);
            });
        });

        test('handles edge case recipe IDs', () => {
            const testCases = [
                'simple_id',
                'mod:complex_recipe_name_with_underscores',
                'namespace:very/complex/recipe/path',
                'oritech:adamant_ingot_from_smelting_adamant_dust'
            ];

            testCases.forEach((recipeId) => {
                const segment = createTestSegment(
                    `furnace.addRecipe("${recipeId}", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);`
                );

                const result = handler.parse(segment);

                expect(result.recipeId).toBe(recipeId);
            });
        });

        test('handles decimal and integer experience values correctly', () => {
            const testCases = [
                { exp: '1.0', expected: 1.0 },
                { exp: '0.35', expected: 0.35 },
                { exp: '0.7', expected: 0.7 },
                { exp: '0', expected: 0 },
                { exp: '1', expected: 1 },
                { exp: '2.5', expected: 2.5 }
            ];

            testCases.forEach(({ exp, expected }) => {
                const segment = createTestSegment(
                    `furnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, ${exp}, 200);`
                );

                const result = handler.parse(segment);

                expect(result.experience).toBe(expected);
            });
        });
    });

    describe('integration', () => {
        test('canParse and parse work together for dispatcher integration', () => {
            const validSegment = createTestSegment('furnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);');
            const invalidSegment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {});');

            // Valid segment should be parsed successfully
            const canParseValid = handler.canParse(validSegment);
            expect(canParseValid).toBe(1);

            const parsedResult = handler.parse(validSegment);
            expect(parsedResult.format).toBe('addSmelting');

            // Invalid segment should not be processed by this handler
            const canParseInvalid = handler.canParse(invalidSegment);
            expect(canParseInvalid).toBe(0);
        });

        test('works with different recipe types', () => {
            const segment = createTestSegment(
                'furnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);',
                '<recipetype:minecraft:smelting>'
            );

            const result = handler.parse(segment);

            expect(result.recipeType).toBe('<recipetype:minecraft:smelting>');
        });

        test('maintains consistent format identifier', () => {
            const segment = createTestSegment('furnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);');
            const result = handler.parse(segment);

            expect(result.format).toBe('addSmelting');
        });
    });
});