const test = require('tape');
const handler = require('../src/parsers/handlers/blastFurnaceHandler');

function createTestSegment(rawText, recipeType = '<recipetype:minecraft:blasting>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 1
    };
}

test('blastFurnaceHandler has required interface', (t) => {
    t.plan(3);

    t.equal(handler.name, 'blast-furnace-handler', 'handler has correct name');
    t.equal(typeof handler.canParse, 'function', 'canParse method exists');
    t.equal(typeof handler.parse, 'function', 'parse method exists');
});

test('canParse returns 1 for segments with blastFurnace.addRecipe calls', (t) => {
    t.plan(1);

    const segment = createTestSegment('blastFurnace.addRecipe("test_recipe", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 100);');
    const score = handler.canParse(segment);

    t.equal(score, 1, 'returns positive score for blastFurnace.addRecipe segments');
});

test('canParse returns 0 for segments without blastFurnace.addRecipe calls', (t) => {
    t.plan(4);

    const testCases = [
        'craftingTable.addShaped("test", <item:minecraft:stick>, []);',
        'campfire.addRecipe("test", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);',
        '<recipetype:create:mixing>.addJsonRecipe("test", {});',
        'some other log content'
    ];

    testCases.forEach((rawText, index) => {
        const segment = createTestSegment(rawText);
        const score = handler.canParse(segment);
        t.equal(score, 0, `returns zero score for non-blastFurnace segment ${index + 1}`);
    });
});

test('canParse handles invalid segment input', (t) => {
    t.plan(3);

    t.equal(handler.canParse(null), 0, 'handles null segment');
    t.equal(handler.canParse({}), 0, 'handles segment without rawText');
    t.equal(handler.canParse({ rawText: '' }), 0, 'handles empty rawText');
});

test('parse extracts basic recipe data correctly', (t) => {
    t.plan(7);

    const segment = createTestSegment(
        'blastFurnace.addRecipe("test:iron_ingot_from_ore", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 100);'
    );

    const result = handler.parse(segment);

    t.equal(result.recipeId, 'test:iron_ingot_from_ore', 'extracts recipe ID correctly');
    t.equal(result.recipeType, '<recipetype:minecraft:blasting>', 'preserves recipe type from segment');
    t.equal(result.format, 'addBlastFurnace', 'sets correct format identifier');
    t.equal(result.output, '<item:minecraft:iron_ingot>', 'extracts output item correctly');
    t.equal(result.input, '<item:minecraft:iron_ore>', 'extracts input item correctly');
    t.equal(result.experience, 0.7, 'extracts experience value correctly');
    t.equal(result.cookTime, 100, 'extracts cook time correctly');
});

test('parse handles tag inputs correctly', (t) => {
    t.plan(2);

    const segment = createTestSegment(
        'blastFurnace.addRecipe("aluminum_from_raw", <item:ftbmaterials:aluminum_ingot>, <tag:item:c:raw_materials/aluminum>, 0.7, 100);'
    );

    const result = handler.parse(segment);

    t.equal(result.output, '<item:ftbmaterials:aluminum_ingot>', 'extracts output item correctly');
    t.equal(result.input, '<tag:item:c:raw_materials/aluminum>', 'extracts tag input correctly');
});

test('parse handles complex item specifications', (t) => {
    t.plan(2);

    const segment = createTestSegment(
        'blastFurnace.addRecipe("complex_recipe", <item:minecraft:gold_nugget>, <item:minecraft:golden_pickaxe> | <item:minecraft:golden_shovel> | <item:minecraft:golden_axe>, 0.1, 100);'
    );

    const result = handler.parse(segment);

    t.equal(result.output, '<item:minecraft:gold_nugget>', 'extracts simple output correctly');
    t.equal(result.input, '<item:minecraft:golden_pickaxe> | <item:minecraft:golden_shovel> | <item:minecraft:golden_axe>', 'extracts complex input with OR operators');
});

test('parse handles different numeric formats', (t) => {
    t.plan(4);

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

        t.deepEqual(
            { experience: result.experience, cookTime: result.cookTime },
            { experience: expectedExp, cookTime: expectedTime },
            `parses numeric values correctly for case ${index + 1}`
        );
    });
});

test('parse handles malformed numeric values with fallbacks', (t) => {
    t.plan(2);

    const segment = createTestSegment(
        'blastFurnace.addRecipe("test_fallback", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, invalid, notanumber);'
    );

    const result = handler.parse(segment);

    t.equal(result.experience, 0.0, 'falls back to 0.0 for invalid experience');
    t.equal(result.cookTime, 100, 'falls back to 100 for invalid cook time');
});

test('parse preserves whitespace handling in item specifications', (t) => {
    t.plan(2);

    const segment = createTestSegment(
        'blastFurnace.addRecipe("whitespace_test",   <item:minecraft:iron_ingot>  ,   <item:minecraft:iron_ore>   , 0.7, 100);'
    );

    const result = handler.parse(segment);

    t.equal(result.output, '<item:minecraft:iron_ingot>', 'trims whitespace from output');
    t.equal(result.input, '<item:minecraft:iron_ore>', 'trims whitespace from input');
});

test('parse throws error for invalid recipe pattern', (t) => {
    t.plan(3);

    const invalidPatterns = [
        'blastFurnace.addRecipe();', // no parameters
        'blastFurnace.addRecipe("incomplete", <item:test>);', // too few parameters
        'not a recipe at all' // completely wrong format
    ];

    invalidPatterns.forEach((rawText, index) => {
        const segment = createTestSegment(rawText);

        t.throws(
            () => handler.parse(segment),
            /Unable to match blastFurnace\.addRecipe pattern/,
            `throws error for invalid pattern ${index + 1}`
        );
    });
});

test('parse handles edge case recipe IDs', (t) => {
    t.plan(3);

    const testCases = [
        'simple_id',
        'mod:complex_recipe_name_with_underscores',
        'namespace:very/complex/recipe/path'
    ];

    testCases.forEach((recipeId, index) => {
        const segment = createTestSegment(
            `blastFurnace.addRecipe("${recipeId}", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 100);`
        );

        const result = handler.parse(segment);

        t.equal(result.recipeId, recipeId, `correctly extracts recipe ID: ${recipeId}`);
    });
});