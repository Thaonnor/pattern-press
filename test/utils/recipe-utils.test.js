const {
    normalizeRecipeTypeValue,
    getModFromId,
    getMachineTypeFromRecipeType,
    extractInputs,
    extractOutputs,
    extractCraftingInputs,
    extractCraftingOutputs,
    getRecipeStats
} = require('../../src/utils/recipe-utils');

describe('recipe-utils', () => {
    describe('normalizeRecipeTypeValue', () => {
        test('strips CraftTweaker wrappers', () => {
            const value = normalizeRecipeTypeValue('<recipetype:create:pressing>');
            expect(value).toBe('create:pressing');
        });

        test('returns null for invalid values', () => {
            expect(normalizeRecipeTypeValue(null)).toBeNull();
            expect(normalizeRecipeTypeValue('')).toBeNull();
        });
    });

    describe('getModFromId', () => {
        test('parsing and fallbacks', () => {
            expect(getModFromId('create:pressing')).toBe('create');
            expect(getModFromId('pressing')).toBe('minecraft');
            expect(getModFromId(null)).toBe('minecraft');
        });
    });

    describe('getMachineTypeFromRecipeType', () => {
        test('returns suffix segment', () => {
            expect(getMachineTypeFromRecipeType('create:pressing')).toBe('pressing');
            expect(getMachineTypeFromRecipeType('smithing')).toBe('smithing');
            expect(getMachineTypeFromRecipeType(null)).toBe('crafting');
        });
    });

    describe('extractInputs', () => {
        test('normalizes varying handler payloads', () => {
            const payload = {
                item_inputs: [{ item: '<item:create:gear>', amount: 1 }],
                inputs: {
                    item: [{ item: '<item:create:plate>', amount: 2 }],
                    fluid: { fluid: 'minecraft:water', amount: 1000 }
                },
                fluid_inputs: [{ fluid: 'minecraft:lava', amount: 500 }]
            };

            const result = extractInputs(payload);

            expect(result.items).toEqual([{ item: '<item:create:plate>', amount: 2 }]);
            expect(result.fluids).toEqual([{ fluid: 'minecraft:lava', amount: 500 }]);
        });
    });

    describe('extractOutputs', () => {
        test('normalizes multiple output representations', () => {
            const payload = {
                item_outputs: [{ item: '<item:create:press>', amount: 1 }],
                outputs: {
                    item_output: [{ item: '<item:create:extra>', amount: 1 }],
                    fluid_output: { fluid: 'minecraft:lava', amount: 250 }
                },
                fluid_outputs: [{ fluid: 'minecraft:water', amount: 125 }]
            };

            const result = extractOutputs(payload);

            expect(result.items).toEqual([{ item: '<item:create:extra>', amount: 1 }]);
            expect(result.fluids).toEqual([{ fluid: 'minecraft:water', amount: 125 }]);
        });
    });

    describe('extractCraftingInputs', () => {
        test('pulls item references from string patterns', () => {
            const pattern = '<item:create:shaft> <tag:create:plates> <item:minecraft:iron_ingot>';
            const result = extractCraftingInputs(pattern);

            expect(result.items).toEqual([
                { item: '<item:create:shaft>', amount: 1 },
                { item: '<tag:create:plates>', amount: 1 },
                { item: '<item:minecraft:iron_ingot>', amount: 1 }
            ]);
        });

        test('handles malformed values gracefully', () => {
            const result = extractCraftingInputs({ not: 'a string' });
            expect(result.items).toEqual([]);
        });
    });

    describe('extractCraftingOutputs', () => {
        test('extracts item matches when present', () => {
            const output = '<item:create:andesite_alloy>'; // no amount info, default 1
            const result = extractCraftingOutputs(output);

            expect(result.items).toEqual([{ item: '<item:create:andesite_alloy>', amount: 1 }]);
        });

        test('handles strings without matches', () => {
            const result = extractCraftingOutputs('no item tokens here');
            expect(result.items).toEqual([]);
        });
    });

    describe('getRecipeStats', () => {
        test('aggregates totals by type, mod, and format', () => {
            const stats = getRecipeStats([
                { type: 'minecraft:crafting', mod: 'minecraft', format: 'addShaped' },
                { type: 'create:pressing', mod: 'create', format: 'addJsonRecipe' },
                { type: 'create:pressing', mod: 'create', format: 'addJsonRecipe' }
            ]);

            expect(stats.total).toBe(3);
            expect(stats.byType['create:pressing']).toBe(2);
            expect(stats.byMod['create']).toBe(2);
            expect(stats.byFormat['addJsonRecipe']).toBe(2);
        });
    });
});