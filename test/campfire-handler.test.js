const test = require('tape');
const handler = require('../src/parsers/handlers/campfireHandler');

function createTestSegment(rawText, recipeType = '<recipetype:minecraft:campfire_cooking>') {
    return {
        rawText,
        recipeType,
        startLine: 1,
        endLine: 1
    };
}

test('campfireHandler has required interface', (t) => {
    t.plan(3);

    t.equal(handler.name, 'campfire-handler', 'handler has correct name');
    t.equal(typeof handler.canParse, 'function', 'canParse method exists');
    t.equal(typeof handler.parse, 'function', 'parse method exists');
});

test('canParse returns 1 for segments with campfire.addRecipe calls', (t) => {
    t.plan(1);

    const segment = createTestSegment('campfire.addRecipe("test_recipe", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);');
    const score = handler.canParse(segment);

    t.equal(score, 1, 'returns positive score for campfire.addRecipe segments');
});

test('canParse returns 0 for segments without campfire.addRecipe calls', (t) => {
    t.plan(4);

    const testCases = [
        'craftingTable.addShaped("test", <item:minecraft:stick>, []);',
        'blastFurnace.addRecipe("test", <item:minecraft:iron_ingot>, <item:minecraft:iron_ore>, 0.7, 100);',
        '<recipetype:create:mixing>.addJsonRecipe("test", {});',
        'some other log content'
    ];

    testCases.forEach((rawText, index) => {
        const segment = createTestSegment(rawText);
        const score = handler.canParse(segment);
        t.equal(score, 0, `returns zero score for non-campfire segment ${index + 1}`);
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
        'campfire.addRecipe("minecraft:baked_potato_from_campfire_cooking", <item:minecraft:baked_potato>, <item:minecraft:potato>, 0.35, 100);'
    );

    const result = handler.parse(segment);

    t.equal(result.recipeId, 'minecraft:baked_potato_from_campfire_cooking', 'extracts recipe ID correctly');
    t.equal(result.recipeType, '<recipetype:minecraft:campfire_cooking>', 'preserves recipe type from segment');
    t.equal(result.format, 'addCampfire', 'sets correct format identifier');
    t.equal(result.output, '<item:minecraft:baked_potato>', 'extracts output item correctly');
    t.equal(result.input, '<item:minecraft:potato>', 'extracts input item correctly');
    t.equal(result.experience, 0.35, 'extracts experience value correctly');
    t.equal(result.cookTime, 100, 'extracts cook time correctly');
});

test('parse handles different food items correctly', (t) => {
    t.plan(6);

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

        t.equal(result.output, expectedOutput, `extracts correct output for food item ${index + 1}`);
        t.equal(result.input, expectedInput, `extracts correct input for food item ${index + 1}`);
    });
});

test('parse handles different numeric formats', (t) => {
    t.plan(4);

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
        'campfire.addRecipe("test_fallback", <item:minecraft:cooked_beef>, <item:minecraft:beef>, invalid, notanumber);'
    );

    const result = handler.parse(segment);

    t.equal(result.experience, 0.0, 'falls back to 0.0 for invalid experience');
    t.equal(result.cookTime, 100, 'falls back to 100 for invalid cook time');
});

test('parse preserves whitespace handling in item specifications', (t) => {
    t.plan(2);

    const segment = createTestSegment(
        'campfire.addRecipe("whitespace_test",   <item:minecraft:cooked_beef>  ,   <item:minecraft:beef>   , 0.35, 100);'
    );

    const result = handler.parse(segment);

    t.equal(result.output, '<item:minecraft:cooked_beef>', 'trims whitespace from output');
    t.equal(result.input, '<item:minecraft:beef>', 'trims whitespace from input');
});

test('parse handles complex recipe IDs from different mods', (t) => {
    t.plan(4);

    const testCases = [
        'minecraft:baked_potato_from_campfire_cooking',
        'farmersdelight:beef_patty_from_campfire_cooking',
        'create:campfire_cooking/bread',
        'modname:very_complex_recipe_name_with_underscores'
    ];

    testCases.forEach((recipeId, index) => {
        const segment = createTestSegment(
            `campfire.addRecipe("${recipeId}", <item:minecraft:cooked_beef>, <item:minecraft:beef>, 0.35, 100);`
        );

        const result = handler.parse(segment);

        t.equal(result.recipeId, recipeId, `correctly extracts recipe ID: ${recipeId}`);
    });
});

test('parse throws error for invalid recipe pattern', (t) => {
    t.plan(3);

    const invalidPatterns = [
        'campfire.addRecipe();', // no parameters
        'campfire.addRecipe("incomplete", <item:test>);', // too few parameters
        'not a campfire recipe at all' // completely wrong format
    ];

    invalidPatterns.forEach((rawText, index) => {
        const segment = createTestSegment(rawText);

        t.throws(
            () => handler.parse(segment),
            /Unable to match campfire\.addRecipe pattern/,
            `throws error for invalid pattern ${index + 1}`
        );
    });
});

test('parse handles real-world recipe examples', (t) => {
    t.plan(3);

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

    realExamples.forEach(({ input, expectedId, description }, index) => {
        const segment = createTestSegment(input);
        const result = handler.parse(segment);

        t.equal(result.recipeId, expectedId, `correctly parses ${description}`);
    });
});