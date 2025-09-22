const handler = require('../../../src/parsers/handlers/cookingHandler');

function createTestSegment(rawText, recipeType = '<recipetype:farmersdelight:cooking>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 1
    };
}

describe('cookingHandler', () => {
    describe('interface', () => {
        test('has required interface', () => {
            expect(handler.name).toBe('cooking-handler');
            expect(typeof handler.canParse).toBe('function');
            expect(typeof handler.parse).toBe('function');
        });
    });

    describe('canParse', () => {
        test('returns 1 for segments with farmersdelight cooking recipe calls', () => {
            const segment = createTestSegment('<recipetype:farmersdelight:cooking>.addRecipe("test", <item:minecraft:stew>, [<item:minecraft:beef>], (<item:minecraft:bowl>).mutable(), 1.0, 200);');
            const score = handler.canParse(segment);

            expect(score).toBe(1);
        });

        test('returns 0 for segments without cooking recipe calls', () => {
            const testCases = [
                'craftingTable.addShaped("test", <item:minecraft:stick>, []);',
                'furnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);',
                '<recipetype:farmersdelight:cutting>.addRecipe("test", <item:test>, [], <tool>, Optional.empty);',
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
        test('extracts basic cooking recipe data correctly', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cooking>.addRecipe("farmersdelight:cooking/beef_stew", <item:farmersdelight:beef_stew>, [<item:minecraft:beef>, <item:minecraft:carrot>, <item:minecraft:potato>], (<item:minecraft:bowl>).mutable(), 1.0, 200);'
            );

            const result = handler.parse(segment);

            expect(result.recipeId).toBe('farmersdelight:cooking/beef_stew');
            expect(result.recipeType).toBe('<recipetype:farmersdelight:cooking>');
            expect(result.format).toBe('addCooking');
            expect(result.output).toBe('<item:farmersdelight:beef_stew>');
            expect(result.ingredients).toBe('[<item:minecraft:beef>, <item:minecraft:carrot>, <item:minecraft:potato>]');
            expect(result.container).toBe('(<item:minecraft:bowl>).mutable()');
            expect(result.experience).toBe(1.0);
            expect(result.cookTime).toBe(200);
        });

        test('handles real-world examples from log file', () => {
            const realExamples = [
                {
                    rawText: '<recipetype:farmersdelight:cooking>.addRecipe("endersdelight:cooking/amberveil_stew", <item:endersdelight:amberveil_stew>, [<item:endersdelight:amberveil>, <item:endersdelight:voidpepper>, <item:endersdelight:ethereal_saffron>, <item:minecraft:chorus_flower>], (<item:endersdelight:shulker_bowl>).mutable(), 1.0, 200);',
                    expectedId: 'endersdelight:cooking/amberveil_stew',
                    expectedOutput: '<item:endersdelight:amberveil_stew>',
                    expectedIngredients: '[<item:endersdelight:amberveil>, <item:endersdelight:voidpepper>, <item:endersdelight:ethereal_saffron>, <item:minecraft:chorus_flower>]',
                    expectedContainer: '(<item:endersdelight:shulker_bowl>).mutable()',
                    expectedExperience: 1.0,
                    expectedCookTime: 200
                },
                {
                    rawText: '<recipetype:farmersdelight:cooking>.addRecipe("farmersdelight:cooking/apple_cider", <item:farmersdelight:apple_cider>, [<item:minecraft:apple>, <item:minecraft:apple>, <item:minecraft:sugar>], (<item:minecraft:glass_bottle>).mutable(), 1.0, 200);',
                    expectedId: 'farmersdelight:cooking/apple_cider',
                    expectedOutput: '<item:farmersdelight:apple_cider>',
                    expectedIngredients: '[<item:minecraft:apple>, <item:minecraft:apple>, <item:minecraft:sugar>]',
                    expectedContainer: '(<item:minecraft:glass_bottle>).mutable()',
                    expectedExperience: 1.0,
                    expectedCookTime: 200
                },
                {
                    rawText: '<recipetype:farmersdelight:cooking>.addRecipe("farmersdelight:cooking/cabbage_rolls", <item:farmersdelight:cabbage_rolls>, [<tag:item:c:crops/cabbage>, <tag:item:farmersdelight:cabbage_roll_ingredients>], (<item:minecraft:air>).mutable(), 0.35, 100);',
                    expectedId: 'farmersdelight:cooking/cabbage_rolls',
                    expectedOutput: '<item:farmersdelight:cabbage_rolls>',
                    expectedIngredients: '[<tag:item:c:crops/cabbage>, <tag:item:farmersdelight:cabbage_roll_ingredients>]',
                    expectedContainer: '(<item:minecraft:air>).mutable()',
                    expectedExperience: 0.35,
                    expectedCookTime: 100
                }
            ];

            realExamples.forEach((example, index) => {
                const segment = createTestSegment(example.rawText);
                const result = handler.parse(segment);

                expect({
                    recipeId: result.recipeId,
                    output: result.output,
                    ingredients: result.ingredients,
                    container: result.container,
                    experience: result.experience,
                    cookTime: result.cookTime,
                    format: result.format
                }).toEqual({
                    recipeId: example.expectedId,
                    output: example.expectedOutput,
                    ingredients: example.expectedIngredients,
                    container: example.expectedContainer,
                    experience: example.expectedExperience,
                    cookTime: example.expectedCookTime,
                    format: 'addCooking'
                });
            });
        });

        test('handles tag-based ingredients', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cooking>.addRecipe("tag_test", <item:farmersdelight:fish_stew>, [<tag:item:c:foods/raw_cod>, <item:minecraft:potato>, <tag:item:c:crops/tomato>], (<item:minecraft:bowl>).mutable(), 1.0, 200);'
            );

            const result = handler.parse(segment);

            expect(result.ingredients).toBe('[<tag:item:c:foods/raw_cod>, <item:minecraft:potato>, <tag:item:c:crops/tomato>]');
            expect(result.format).toBe('addCooking');
        });

        test('handles OR chains in ingredients', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cooking>.addRecipe("or_chain_test", <item:farmersdelight:bone_broth>, [<tag:item:c:bones>, <item:minecraft:glow_berries> | <item:minecraft:brown_mushroom> | <item:minecraft:red_mushroom>], (<item:minecraft:bowl>).mutable(), 0.35, 200);'
            );

            const result = handler.parse(segment);

            expect(result.ingredients).toBe('[<tag:item:c:bones>, <item:minecraft:glow_berries> | <item:minecraft:brown_mushroom> | <item:minecraft:red_mushroom>]');
        });

        test('handles different container types', () => {
            const containerTypes = [
                '(<item:minecraft:bowl>).mutable()',
                '(<item:minecraft:glass_bottle>).mutable()',
                '(<item:endersdelight:shulker_bowl>).mutable()',
                '(<item:minecraft:air>).mutable()'
            ];

            containerTypes.forEach(container => {
                const segment = createTestSegment(
                    `<recipetype:farmersdelight:cooking>.addRecipe("container_test", <item:minecraft:stew>, [<item:minecraft:beef>], ${container}, 1.0, 200);`
                );

                const result = handler.parse(segment);

                expect(result.container).toBe(container);
            });
        });

        test('handles different cooking times and experiences', () => {
            const testCases = [
                { exp: '1.0', time: '200', expectedExp: 1.0, expectedTime: 200 },
                { exp: '0.35', time: '100', expectedExp: 0.35, expectedTime: 100 },
                { exp: '0.5', time: '150', expectedExp: 0.5, expectedTime: 150 },
                { exp: '2.0', time: '300', expectedExp: 2.0, expectedTime: 300 },
                { exp: '0', time: '50', expectedExp: 0, expectedTime: 50 }
            ];

            testCases.forEach(({ exp, time, expectedExp, expectedTime }, index) => {
                const segment = createTestSegment(
                    `<recipetype:farmersdelight:cooking>.addRecipe("test_${index}", <item:minecraft:stew>, [<item:minecraft:beef>], (<item:minecraft:bowl>).mutable(), ${exp}, ${time});`
                );

                const result = handler.parse(segment);

                expect({ experience: result.experience, cookTime: result.cookTime }).toEqual(
                    { experience: expectedExp, cookTime: expectedTime }
                );
            });
        });

        test('handles complex multi-ingredient recipes', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cooking>.addRecipe("complex_recipe", <item:endersdelight:chicken_curry>, [<item:endersdelight:amberveil>, <item:endersdelight:ethereal_saffron>, <item:endersdelight:voidpepper>, <item:minecraft:chicken>, <item:farmersdelight:chicken_cuts>, <item:farmersdelight:rice>], (<item:endersdelight:shulker_bowl>).mutable(), 1.0, 200);'
            );

            const result = handler.parse(segment);

            expect(result.ingredients).toBe('[<item:endersdelight:amberveil>, <item:endersdelight:ethereal_saffron>, <item:endersdelight:voidpepper>, <item:minecraft:chicken>, <item:farmersdelight:chicken_cuts>, <item:farmersdelight:rice>]');
            expect(result.output).toBe('<item:endersdelight:chicken_curry>');
        });

        test('handles malformed numeric values with fallbacks', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cooking>.addRecipe("fallback_test", <item:minecraft:stew>, [<item:minecraft:beef>], (<item:minecraft:bowl>).mutable(), invalid, notanumber);'
            );

            const result = handler.parse(segment);

            expect(result.experience).toBe(0.0);
            expect(result.cookTime).toBe(200); // Default for cooking
        });

        test('preserves whitespace handling in specifications', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cooking>.addRecipe("whitespace_test",   <item:minecraft:stew>  ,   [<item:minecraft:beef>]   ,   (<item:minecraft:bowl>).mutable()   ,   1.0   ,   200   );'
            );

            const result = handler.parse(segment);

            expect(result.output).toBe('<item:minecraft:stew>');
            expect(result.ingredients).toBe('[<item:minecraft:beef>]');
            expect(result.container).toBe('(<item:minecraft:bowl>).mutable()');
        });

        test('handles modded items and complex namespaces', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cooking>.addRecipe("modded_test", <item:endersdelight:amberveiled_curry>, [<item:endersdelight:amberveil>, <item:endersdelight:voidpepper>, <item:minecraft:chorus_flower>], (<item:endersdelight:shulker_bowl>).mutable(), 1.0, 200);'
            );

            const result = handler.parse(segment);

            expect(result.output).toBe('<item:endersdelight:amberveiled_curry>');
            expect(result.container).toBe('(<item:endersdelight:shulker_bowl>).mutable()');
        });

        test('throws error for invalid recipe patterns', () => {
            const invalidPatterns = [
                '<recipetype:farmersdelight:cooking>.addRecipe();', // no parameters
                '<recipetype:farmersdelight:cooking>.addRecipe("incomplete");', // too few parameters
                '<recipetype:farmersdelight:cooking>.addRecipe("test", <item:test>);', // still too few
                'not a recipe at all', // completely wrong format
                '<recipetype:farmersdelight:cutting>.addRecipe("wrong_type", <item:test>, [], <tool>);' // wrong recipe type
            ];

            invalidPatterns.forEach((rawText) => {
                const segment = createTestSegment(rawText);

                expect(() => handler.parse(segment)).toThrow(/Unable to match farmersdelight cooking recipe pattern/);
            });
        });

        test('handles edge case recipe IDs', () => {
            const testCases = [
                'simple_id',
                'farmersdelight:cooking/complex_recipe_name',
                'endersdelight:cooking/very_complex_curry',
                'modpack:cooking/special-dish_preparation'
            ];

            testCases.forEach((recipeId) => {
                const segment = createTestSegment(
                    `<recipetype:farmersdelight:cooking>.addRecipe("${recipeId}", <item:minecraft:stew>, [<item:minecraft:beef>], (<item:minecraft:bowl>).mutable(), 1.0, 200);`
                );

                const result = handler.parse(segment);

                expect(result.recipeId).toBe(recipeId);
            });
        });

        test('handles different experience and time value formats', () => {
            const testCases = [
                { exp: '1.0', expected: 1.0 },
                { exp: '0.35', expected: 0.35 },
                { exp: '0', expected: 0 },
                { exp: '2', expected: 2 },
                { exp: '0.5', expected: 0.5 }
            ];

            testCases.forEach(({ exp, expected }) => {
                const segment = createTestSegment(
                    `<recipetype:farmersdelight:cooking>.addRecipe("test", <item:minecraft:stew>, [<item:minecraft:beef>], (<item:minecraft:bowl>).mutable(), ${exp}, 200);`
                );

                const result = handler.parse(segment);

                expect(result.experience).toBe(expected);
            });
        });

        test('handles cooking pot specific features', () => {
            const cookingPotFeatures = [
                {
                    name: 'stew_with_vegetables',
                    ingredients: '[<tag:item:c:foods/raw_beef>, <item:minecraft:carrot>, <item:minecraft:potato>]',
                    container: '(<item:minecraft:bowl>).mutable()'
                },
                {
                    name: 'beverage_with_bottle',
                    ingredients: '[<item:minecraft:apple>, <item:minecraft:sugar>]',
                    container: '(<item:minecraft:glass_bottle>).mutable()'
                },
                {
                    name: 'special_bowl_dish',
                    ingredients: '[<item:endersdelight:amberveil>, <item:endersdelight:voidpepper>]',
                    container: '(<item:endersdelight:shulker_bowl>).mutable()'
                }
            ];

            cookingPotFeatures.forEach(feature => {
                const segment = createTestSegment(
                    `<recipetype:farmersdelight:cooking>.addRecipe("farmersdelight:cooking/${feature.name}", <item:test:${feature.name}>, ${feature.ingredients}, ${feature.container}, 1.0, 200);`
                );

                const result = handler.parse(segment);

                expect(result.ingredients).toBe(feature.ingredients);
                expect(result.container).toBe(feature.container);
                expect(result.format).toBe('addCooking');
            });
        });
    });

    describe('integration', () => {
        test('canParse and parse work together for dispatcher integration', () => {
            const validSegment = createTestSegment('<recipetype:farmersdelight:cooking>.addRecipe("test", <item:minecraft:stew>, [<item:minecraft:beef>], (<item:minecraft:bowl>).mutable(), 1.0, 200);');
            const invalidSegment = createTestSegment('<recipetype:create:mixing>.addJsonRecipe("test", {});');

            // Valid segment should be parsed successfully
            expect(handler.canParse(validSegment)).toBe(1);

            const parsedResult = handler.parse(validSegment);
            expect(parsedResult.format).toBe('addCooking');

            // Invalid segment should not be processed by this handler
            expect(handler.canParse(invalidSegment)).toBe(0);
        });

        test('works with different recipe types', () => {
            const segment = createTestSegment(
                '<recipetype:farmersdelight:cooking>.addRecipe("test", <item:minecraft:stew>, [<item:minecraft:beef>], (<item:minecraft:bowl>).mutable(), 1.0, 200);',
                '<recipetype:farmersdelight:cooking>'
            );

            const result = handler.parse(segment);

            expect(result.recipeType).toBe('<recipetype:farmersdelight:cooking>');
        });

        test('maintains consistent format identifier', () => {
            const segment = createTestSegment('<recipetype:farmersdelight:cooking>.addRecipe("test", <item:minecraft:stew>, [<item:minecraft:beef>], (<item:minecraft:bowl>).mutable(), 1.0, 200);');
            const result = handler.parse(segment);

            expect(result.format).toBe('addCooking');
        });

        test('distinguishes from other farmersdelight recipe types', () => {
            const cookingSegment = createTestSegment('<recipetype:farmersdelight:cooking>.addRecipe("test", <item:minecraft:stew>, [<item:minecraft:beef>], (<item:minecraft:bowl>).mutable(), 1.0, 200);');
            const cuttingSegment = createTestSegment('<recipetype:farmersdelight:cutting>.addRecipe("test", <item:test>, [], <tool>, Optional.empty);');
            const vanillaSegment = createTestSegment('furnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 200);');

            // Only cooking segment should be parseable by this handler
            expect(handler.canParse(cookingSegment)).toBe(1);
            expect(handler.canParse(cuttingSegment)).toBe(0);
            expect(handler.canParse(vanillaSegment)).toBe(0);
        });

        test('extracts all required data fields for further processing', () => {
            const segment = createTestSegment('<recipetype:farmersdelight:cooking>.addRecipe("complete_test", <item:farmersdelight:beef_stew>, [<item:minecraft:beef>, <item:minecraft:carrot>], (<item:minecraft:bowl>).mutable(), 1.0, 200);');
            const result = handler.parse(segment);

            // Verify all expected fields are present
            expect(result).toHaveProperty('recipeId');
            expect(result).toHaveProperty('recipeType');
            expect(result).toHaveProperty('format');
            expect(result).toHaveProperty('output');
            expect(result).toHaveProperty('ingredients');
            expect(result).toHaveProperty('container');
            expect(result).toHaveProperty('experience');
            expect(result).toHaveProperty('cookTime');

            // Verify they have expected values
            expect(typeof result.recipeId).toBe('string');
            expect(result.format).toBe('addCooking');
            expect(result.output.includes('item:')).toBe(true);
            expect(result.ingredients.includes('[')).toBe(true);
            expect(result.container.includes('.mutable()')).toBe(true);
            expect(typeof result.experience).toBe('number');
            expect(typeof result.cookTime).toBe('number');
        });
    });
});