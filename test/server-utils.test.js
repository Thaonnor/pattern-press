const test = require('tape');

const {
    normalizeRecipeTypeValue,
    getModFromId,
    getMachineTypeFromRecipeType,
    extractInputs,
    extractOutputs,
    extractCraftingInputs,
    extractCraftingOutputs,
    getRecipeStats
} = require('../src/utils/recipe-utils');
const { normalizeDispatchedRecipe } = require('../src/server');

const sampleJsonRecipe = {
    dispatch: {
        status: 'parsed',
        handler: 'json-crafting-handler',
        result: {
            recipeType: '<recipetype:create:pressing>',
            recipeId: 'create:press_brass',
            data: {
                item_inputs: [{ item: '<item:create:plate>', amount: 2 }],
                item_outputs: [{ item: '<item:create:pressed_plate>', amount: 1 }]
            }
        }
    }
};

test('normalizeRecipeTypeValue strips CraftTweaker wrappers', (t) => {
    const value = normalizeRecipeTypeValue('<recipetype:create:pressing>');
    t.equal(value, 'create:pressing', 'should remove angle brackets and recipetype prefix');
    t.end();
});

test('normalizeRecipeTypeValue returns null for invalid values', (t) => {
    t.equal(normalizeRecipeTypeValue(null), null, 'null inputs return null');
    t.equal(normalizeRecipeTypeValue(''), null, 'empty string returns null');
    t.end();
});

test('getModFromId parsing and fallbacks', (t) => {
    t.equal(getModFromId('create:pressing'), 'create', 'should return namespace when present');
    t.equal(getModFromId('pressing'), 'minecraft', 'should default to minecraft when missing namespace');
    t.equal(getModFromId(null), 'minecraft', 'should fall back to minecraft for null');
    t.end();
});

test('getMachineTypeFromRecipeType returns suffix segment', (t) => {
    t.equal(getMachineTypeFromRecipeType('create:pressing'), 'pressing', 'should drop namespace prefix');
    t.equal(getMachineTypeFromRecipeType('smithing'), 'smithing', 'should return value when no namespace exists');
    t.equal(getMachineTypeFromRecipeType(null), 'crafting', 'should fall back to crafting');
    t.end();
});

test('extractInputs normalizes varying handler payloads', (t) => {
    const payload = {
        item_inputs: [{ item: '<item:create:gear>', amount: 1 }],
        inputs: {
            item: [{ item: '<item:create:plate>', amount: 2 }],
            fluid: { fluid: 'minecraft:water', amount: 1000 }
        },
        fluid_inputs: [{ fluid: 'minecraft:lava', amount: 500 }]
    };

    const result = extractInputs(payload);

    t.deepEqual(result.items, [{ item: '<item:create:plate>', amount: 2 }], 'items prefer nested array when provided');
    t.deepEqual(result.fluids, [{ fluid: 'minecraft:lava', amount: 500 }], 'fluids prefer explicit fluid_inputs array');
    t.end();
});

test('extractOutputs normalizes multiple output representations', (t) => {
    const payload = {
        item_outputs: [{ item: '<item:create:press>', amount: 1 }],
        outputs: {
            item_output: [{ item: '<item:create:extra>', amount: 1 }],
            fluid_output: { fluid: 'minecraft:lava', amount: 250 }
        },
        fluid_outputs: [{ fluid: 'minecraft:water', amount: 125 }]
    };

    const result = extractOutputs(payload);

    t.deepEqual(result.items, [{ item: '<item:create:extra>', amount: 1 }], 'items prefer nested array when provided');
    t.deepEqual(result.fluids, [{ fluid: 'minecraft:water', amount: 125 }], 'fluids prefer explicit fluid_outputs array');
    t.end();
});

test('extractCraftingInputs pulls item references from string patterns', (t) => {
    const pattern = '<item:create:shaft> <tag:create:plates> <item:minecraft:iron_ingot>';
    const result = extractCraftingInputs(pattern);

    t.deepEqual(
        result.items,
        [
            { item: '<item:create:shaft>', amount: 1 },
            { item: '<tag:create:plates>', amount: 1 },
            { item: '<item:minecraft:iron_ingot>', amount: 1 }
        ],
        'should list all extracted entries'
    );
    t.end();
});

test('extractCraftingInputs handles malformed values gracefully', (t) => {
    const result = extractCraftingInputs({ not: 'a string' });
    t.deepEqual(result.items, [], 'should fall back to empty array when regex fails');
    t.end();
});

test('extractCraftingOutputs extracts item matches when present', (t) => {
    const output = '<item:create:andesite_alloy>'; // no amount info, default 1
    const result = extractCraftingOutputs(output);

    t.deepEqual(result.items, [{ item: '<item:create:andesite_alloy>', amount: 1 }], 'should detect output item');
    t.end();
});

test('extractCraftingOutputs handles strings without matches', (t) => {
    const result = extractCraftingOutputs('no item tokens here');
    t.deepEqual(result.items, [], 'should keep outputs empty when regex fails');
    t.end();
});

test('normalizeDispatchedRecipe handles json handler', (t) => {
    const normalized = normalizeDispatchedRecipe(sampleJsonRecipe);
    t.ok(normalized, 'should produce a normalized recipe');
    t.equal(normalized.format, 'addJsonRecipe', 'format should reflect handler');
    t.equal(normalized.mod, 'create', 'mod derived from recipe id');
    t.deepEqual(normalized.inputs.items, [{ item: '<item:create:plate>', amount: 2 }], 'should pass through item inputs');
    t.end();
});

test('normalizeDispatchedRecipe handles shaped and shapeless handlers', (t) => {
    const shaped = normalizeDispatchedRecipe({
        dispatch: {
            status: 'parsed',
            handler: 'shaped-crafting-handler',
            result: {
                pattern: '<item:minecraft:stick> <item:minecraft:stick>',
                output: '<item:create:shaft>'
            }
        },
        recipeType: '<recipetype:create:pressing>'
    });

    const shapeless = normalizeDispatchedRecipe({
        dispatch: {
            status: 'parsed',
            handler: 'shapeless-crafting-handler',
            result: {
                ingredients: '<item:minecraft:stick> <item:minecraft:flint>',
                output: '<item:create:flint_knife>'
            }
        },
        recipeType: '<recipetype:create:pressing>'
    });

    t.equal(shaped.format, 'addShaped', 'shaped format assigned');
    t.equal(shapeless.format, 'addShapeless', 'shapeless format assigned');
    t.deepEqual(shapeless.inputs.items.length, 2, 'shapeless inputs extracted');
    t.end();
});

test('normalizeDispatchedRecipe returns null for unsupported handlers', (t) => {
    const result = normalizeDispatchedRecipe({
        dispatch: { status: 'parsed', handler: 'unknown-handler', result: {} }
    });
    t.equal(result, null, 'unsupported handlers return null');
    t.end();
});

test('getRecipeStats aggregates totals by type, mod, and format', (t) => {
    const stats = getRecipeStats([
        { type: 'minecraft:crafting', mod: 'minecraft', format: 'addShaped' },
        { type: 'create:pressing', mod: 'create', format: 'addJsonRecipe' },
        { type: 'create:pressing', mod: 'create', format: 'addJsonRecipe' }
    ]);

    t.equal(stats.total, 3, 'should report total recipe count');
    t.equal(stats.byType['create:pressing'], 2, 'should count recipes by type');
    t.equal(stats.byMod['create'], 2, 'should count recipes by mod');
    t.equal(stats.byFormat['addJsonRecipe'], 2, 'should count recipes by format');
    t.end();
});
