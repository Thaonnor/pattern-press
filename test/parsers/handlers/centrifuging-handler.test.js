'use strict';

const centrifugingHandler = require('../../../src/parsers/handlers/centrifugingHandler');

describe('Centrifuging Handler', () => {
    describe('canParse', () => {
        test('returns 1 for mekanism centrifuging recipes', () => {
            const segment = {
                rawText: '<recipetype:mekanism:centrifuging>.addRecipe("test", <chemical:mekanism:input>, <chemical:mekanism:output>);'
            };

            expect(centrifugingHandler.canParse(segment)).toBe(1);
        });

        test('returns 0 for non-centrifuging recipes', () => {
            const segment = {
                rawText: '<recipetype:mekanism:chemical_conversion>.addRecipe("test", <item:test>, <chemical:test>);'
            };

            expect(centrifugingHandler.canParse(segment)).toBe(0);
        });

        test('returns 0 for null or undefined segments', () => {
            expect(centrifugingHandler.canParse(null)).toBe(0);
            expect(centrifugingHandler.canParse(undefined)).toBe(0);
            expect(centrifugingHandler.canParse({})).toBe(0);
        });
    });

    describe('parse', () => {
        test('handles real-world centrifuging examples', () => {
            const realExamples = [
                {
                    rawText: '<recipetype:mekanism:centrifuging>.addRecipe("processing/lategame/plutonium", <chemical:mekanism:nuclear_waste> * 10, <chemical:mekanism:plutonium>);',
                    expected: {
                        recipeId: 'processing/lategame/plutonium',
                        input: '<chemical:mekanism:nuclear_waste> * 10',
                        output: '<chemical:mekanism:plutonium>'
                    }
                },
                {
                    rawText: '<recipetype:mekanism:centrifuging>.addRecipe("processing/uranium/fissile_fuel", <chemical:mekanism:uranium_hexafluoride>, <chemical:mekanism:fissile_fuel>);',
                    expected: {
                        recipeId: 'processing/uranium/fissile_fuel',
                        input: '<chemical:mekanism:uranium_hexafluoride>',
                        output: '<chemical:mekanism:fissile_fuel>'
                    }
                }
            ];

            realExamples.forEach(({ rawText, expected }) => {
                const segment = { rawText, recipeType: '<recipetype:mekanism:centrifuging>' };
                const result = centrifugingHandler.parse(segment);

                expect(result.recipeId).toBe(expected.recipeId);
                expect(result.recipeType).toBe('<recipetype:mekanism:centrifuging>');
                expect(result.format).toBe('addCentrifuging');
                expect(result.input).toBe(expected.input);
                expect(result.output).toBe(expected.output);
            });
        });

        test('throws error for non-centrifuging recipes', () => {
            const segment = {
                rawText: '<recipetype:mekanism:chemical_conversion>.addRecipe("test", <item:test>, <chemical:test>);'
            };

            expect(() => centrifugingHandler.parse(segment)).toThrow('Unable to match mekanism centrifuging recipe pattern');
        });

        test('throws error for malformed centrifuging recipes', () => {
            const badExamples = [
                '<recipetype:mekanism:centrifuging>.addRecipe();',
                '<recipetype:mekanism:centrifuging>.addRecipe("id");',
                '<recipetype:mekanism:centrifuging>.addRecipe("id", <chemical:input>);',
                '<recipetype:mekanism:centrifuging>.addRecipe(missing_quotes, <chemical:input>, <chemical:output>);'
            ];

            badExamples.forEach(rawText => {
                const segment = { rawText };
                expect(() => centrifugingHandler.parse(segment)).toThrow('Unable to match mekanism centrifuging recipe pattern');
            });
        });

        test('handles chemicals with quantity multipliers', () => {
            const segment = {
                rawText: '<recipetype:mekanism:centrifuging>.addRecipe("test_recipe", <chemical:mekanism:input> * 5, <chemical:mekanism:output> * 2);',
                recipeType: '<recipetype:mekanism:centrifuging>'
            };

            const result = centrifugingHandler.parse(segment);

            expect(result.recipeId).toBe('test_recipe');
            expect(result.input).toBe('<chemical:mekanism:input> * 5');
            expect(result.output).toBe('<chemical:mekanism:output> * 2');
            expect(result.format).toBe('addCentrifuging');
        });

        test('preserves recipe type from segment', () => {
            const segment = {
                rawText: '<recipetype:mekanism:centrifuging>.addRecipe("test", <chemical:input>, <chemical:output>);',
                recipeType: '<recipetype:mekanism:centrifuging>'
            };

            const result = centrifugingHandler.parse(segment);
            expect(result.recipeType).toBe('<recipetype:mekanism:centrifuging>');
        });

        test('handles null recipe type', () => {
            const segment = {
                rawText: '<recipetype:mekanism:centrifuging>.addRecipe("test", <chemical:input>, <chemical:output>);',
                recipeType: null
            };

            const result = centrifugingHandler.parse(segment);
            expect(result.recipeType).toBeNull();
        });
    });
});