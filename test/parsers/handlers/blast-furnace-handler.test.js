const handler = require('../../../src/parsers/handlers/blastFurnaceHandler');

function createTestSegment(rawText, recipeType = '<recipetype:minecraft:blasting>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 1
    };
}

describe('blastFurnaceHandler', () => {
    describe('interface', () => {
        test('has required interface', () => {
            expect(handler.name).toBe('blast-furnace-handler');
            expect(typeof handler.canParse).toBe('function');
            expect(typeof handler.parse).toBe('function');
        });
    });

    describe('canParse', () => {
        test('returns 1 for segments with blastFurnace.addRecipe calls', () => {
            const segment = createTestSegment('blastFurnace.addRecipe("test_recipe", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 100);');
            const score = handler.canParse(segment);

            expect(score).toBe(1);
        });

        test('returns 0 for segments without blastFurnace.addRecipe calls', () => {
            const testCases = [
                'craftingTable.addShaped("test", <item:minecraft:stick>, []);',
                'campfire.addRecipe("test", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);',
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
                'blastFurnace.addRecipe("test:iron_ingot_from_ore", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 100);'
            );

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('test:iron_ingot_from_ore');
            expect(result.recipeType).toBe('<recipetype:minecraft:blasting>');
            expect(result.format).toBe('addBlastFurnace');
            expect(result.output).toBe('<item:minecraft:iron_ingot>');
            expect(result.input).toBe('<item:minecraft:iron_ore>');
            expect(result.experience).toBe(0.7);
            expect(result.cookTime).toBe(100);
        });

        test('handles tag inputs correctly', () => {
            const segment = createTestSegment(
                'blastFurnace.addRecipe("aluminum_from_raw", <item:ftbmaterials:aluminum_ingot>, <tag:item:c:raw_materials/aluminum>, 0.7, 100);'
            );

            const result = handler.parse(segment);

            expect(result.output).toBe('<item:ftbmaterials:aluminum_ingot>');
            expect(result.input).toBe('<tag:item:c:raw_materials/aluminum>');
        });

        test('handles complex item specifications', () => {
            const segment = createTestSegment(
                'blastFurnace.addRecipe("complex_recipe", <item:minecraft:gold_nugget>, <item:minecraft:golden_pickaxe> | <item:minecraft:golden_shovel> | <item:minecraft:golden_axe>, 0.1, 100);'
            );

            const result = handler.parse(segment);

            expect(result.output).toBe('<item:minecraft:gold_nugget>');
            expect(result.input).toBe('<item:minecraft:golden_pickaxe> | <item:minecraft:golden_shovel> | <item:minecraft:golden_axe>');
        });

        test('handles different numeric formats', () => {
            const testCases = [
                { input: '1.0, 200', expectedExp: 1.0, expectedTime: 200 },
                { input: '0.35, 150', expectedExp: 0.35, expectedTime: 150 },
                { input: '2.0, 100', expectedExp: 2.0, expectedTime: 100 },
                { input: '0, 50', expectedExp: 0, expectedTime: 50 }
            ];

            testCases.forEach(({ input, expectedExp, expectedTime }, index) => {
                const segment = createTestSegment(
                    `blastFurnace.addRecipe("test_${index}", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, ${input});`
                );

                const result = handler.parse(segment);

                expect({ experience: result.experience, cookTime: result.cookTime }).toEqual(
                    { experience: expectedExp, cookTime: expectedTime }
                );
            });
        });

        test('handles malformed numeric values with fallbacks', () => {
            const segment = createTestSegment(
                'blastFurnace.addRecipe("test_fallback", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, invalid, notanumber);'
            );

            const result = handler.parse(segment);

            expect(result.experience).toBe(0.0);
            expect(result.cookTime).toBe(100);
        });

        test('preserves whitespace handling in item specifications', () => {
            const segment = createTestSegment(
                'blastFurnace.addRecipe("whitespace_test",   <item:minecraft:iron_ingot>  ,   <item:minecraft:iron_ore>   , 0.7, 100);'
            );

            const result = handler.parse(segment);

            expect(result.output).toBe('<item:minecraft:iron_ingot>');
            expect(result.input).toBe('<item:minecraft:iron_ore>');
        });

        test('throws error for invalid recipe pattern', () => {
            const invalidPatterns = [
                'blastFurnace.addRecipe();', // no parameters
                'blastFurnace.addRecipe("incomplete", <item:test>);', // too few parameters
                'not a recipe at all' // completely wrong format
            ];

            invalidPatterns.forEach((rawText) => {
                const segment = createTestSegment(rawText);

                expect(() => handler.parse(segment)).toThrow(/Unable to match blastFurnace\.addRecipe pattern/);
            });
        });

        test('handles edge case recipe IDs', () => {
            const testCases = [
                'simple_id',
                'mod:complex_recipe_name_with_underscores',
                'namespace:very/complex/recipe/path'
            ];

            testCases.forEach((recipeId) => {
                const segment = createTestSegment(
                    `blastFurnace.addRecipe("${recipeId}", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 100);`
                );

                const result = handler.parse(segment);

                expect(result.recipeId).toBe(recipeId);
            });
        });
    });

    describe('integration', () => {
        test('canParse and parse work together for dispatcher integration', () => {
            const validSegment = createTestSegment('blastFurnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 100);');
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