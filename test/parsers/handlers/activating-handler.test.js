'use strict';

const activatingHandler = require('../../../src/parsers/handlers/activatingHandler');

describe('Activating Handler', () => {
    describe('canParse', () => {
        test('returns 1 for mekanism activating recipes', () => {
            const segment = {
                rawText: '<recipetype:mekanism:activating>.addRecipe("test", <chemical:mekanism:input>, <chemical:mekanism:output>);'
            };

            expect(activatingHandler.canParse(segment)).toBe(1);
        });

        test('returns 0 for non-activating recipes', () => {
            const segment = {
                rawText: '<recipetype:mekanism:centrifuging>.addRecipe("test", <chemical:input>, <chemical:output>);'
            };

            expect(activatingHandler.canParse(segment)).toBe(0);
        });

        test('returns 0 for null or undefined segments', () => {
            expect(activatingHandler.canParse(null)).toBe(0);
            expect(activatingHandler.canParse(undefined)).toBe(0);
            expect(activatingHandler.canParse({})).toBe(0);
        });
    });

    describe('parse', () => {
        test('handles real-world activating examples', () => {
            const realExamples = [
                {
                    rawText: '<recipetype:mekanism:activating>.addRecipe("processing/lategame/polonium", <chemical:mekanism:nuclear_waste> * 10, <chemical:mekanism:polonium>);',
                    expected: {
                        recipeId: 'processing/lategame/polonium',
                        input: '<chemical:mekanism:nuclear_waste> * 10',
                        output: '<chemical:mekanism:polonium>'
                    }
                }
            ];

            realExamples.forEach(({ rawText, expected }) => {
                const segment = { rawText, recipeType: '<recipetype:mekanism:activating>' };
                const result = activatingHandler.parse(segment);

                expect(result.recipeId).toBe(expected.recipeId);
                expect(result.recipeType).toBe('<recipetype:mekanism:activating>');
                expect(result.format).toBe('addActivating');
                expect(result.input).toBe(expected.input);
                expect(result.output).toBe(expected.output);
            });
        });

        test('throws error for non-activating recipes', () => {
            const segment = {
                rawText: '<recipetype:mekanism:centrifuging>.addRecipe("test", <chemical:input>, <chemical:output>);'
            };

            expect(() => activatingHandler.parse(segment)).toThrow('Unable to match mekanism activating recipe pattern');
        });

        test('throws error for malformed activating recipes', () => {
            const badExamples = [
                '<recipetype:mekanism:activating>.addRecipe();',
                '<recipetype:mekanism:activating>.addRecipe("id");',
                '<recipetype:mekanism:activating>.addRecipe("id", <chemical:input>);',
                '<recipetype:mekanism:activating>.addRecipe(missing_quotes, <chemical:input>, <chemical:output>);'
            ];

            badExamples.forEach(rawText => {
                const segment = { rawText };
                expect(() => activatingHandler.parse(segment)).toThrow('Unable to match mekanism activating recipe pattern');
            });
        });

        test('handles chemicals with quantity multipliers', () => {
            const segment = {
                rawText: '<recipetype:mekanism:activating>.addRecipe("test_recipe", <chemical:mekanism:input> * 15, <chemical:mekanism:output> * 3);',
                recipeType: '<recipetype:mekanism:activating>'
            };

            const result = activatingHandler.parse(segment);

            expect(result.recipeId).toBe('test_recipe');
            expect(result.input).toBe('<chemical:mekanism:input> * 15');
            expect(result.output).toBe('<chemical:mekanism:output> * 3');
            expect(result.format).toBe('addActivating');
        });

        test('handles simple chemical inputs without multipliers', () => {
            const segment = {
                rawText: '<recipetype:mekanism:activating>.addRecipe("simple_activation", <chemical:mekanism:uranium>, <chemical:mekanism:activated_uranium>);',
                recipeType: '<recipetype:mekanism:activating>'
            };

            const result = activatingHandler.parse(segment);

            expect(result.recipeId).toBe('simple_activation');
            expect(result.input).toBe('<chemical:mekanism:uranium>');
            expect(result.output).toBe('<chemical:mekanism:activated_uranium>');
            expect(result.format).toBe('addActivating');
        });

        test('preserves recipe type from segment', () => {
            const segment = {
                rawText: '<recipetype:mekanism:activating>.addRecipe("test", <chemical:input>, <chemical:output>);',
                recipeType: '<recipetype:mekanism:activating>'
            };

            const result = activatingHandler.parse(segment);
            expect(result.recipeType).toBe('<recipetype:mekanism:activating>');
        });

        test('handles null recipe type', () => {
            const segment = {
                rawText: '<recipetype:mekanism:activating>.addRecipe("test", <chemical:input>, <chemical:output>);',
                recipeType: null
            };

            const result = activatingHandler.parse(segment);
            expect(result.recipeType).toBeNull();
        });
    });
});