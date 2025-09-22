const {
    filterRecipes,
    paginateResults,
    filterAndPaginateRecipes,
    searchRecipes,
    groupRecipes,
    normalizeFilters,
    normalizePagination
} = require('../../src/utils/recipe-filter-utils');

const sampleRecipes = [
    { recipeId: 'minecraft:iron_sword', type: 'minecraft:crafting', mod: 'minecraft', format: 'addShaped' },
    { recipeId: 'create:brass_ingot', type: 'create:mixing', mod: 'create', format: 'addJsonRecipe' },
    { recipeId: 'create:copper_sheet', type: 'create:pressing', mod: 'create', format: 'addJsonRecipe' },
    { recipeId: 'minecraft:bread', type: 'minecraft:crafting', mod: 'minecraft', format: 'addShaped' }
];

describe('recipe-filter-utils', () => {
    describe('filterRecipes', () => {
        test('applies filters correctly', () => {
            const typeFiltered = filterRecipes(sampleRecipes, { type: 'minecraft:crafting' });
            expect(typeFiltered).toHaveLength(2);

            const modFiltered = filterRecipes(sampleRecipes, { mod: 'create' });
            expect(modFiltered).toHaveLength(2);

            const formatFiltered = filterRecipes(sampleRecipes, { format: 'addJsonRecipe' });
            expect(formatFiltered).toHaveLength(2);

            const searchFiltered = filterRecipes(sampleRecipes, { search: 'brass' });
            expect(searchFiltered).toHaveLength(1);
            expect(searchFiltered[0].recipeId).toBe('create:brass_ingot');
        });
    });

    describe('paginateResults', () => {
        test('works correctly', () => {
            const result = paginateResults(sampleRecipes, { page: 1, limit: 2 });

            expect(result.items).toHaveLength(2);
            expect(result.total).toBe(4);
            expect(result.page).toBe(1);
            expect(result.totalPages).toBe(2);

            const page2 = paginateResults(sampleRecipes, { page: 2, limit: 2 });
            expect(page2.items).toHaveLength(2);
        });
    });

    describe('filterAndPaginateRecipes', () => {
        test('combines filtering and pagination', () => {
            const result = filterAndPaginateRecipes(
                sampleRecipes,
                { mod: 'create' },
                { page: 1, limit: 1 }
            );

            expect(result.items).toHaveLength(1);
            expect(result.total).toBe(2);
            expect(result.totalPages).toBe(2);
        });
    });

    describe('searchRecipes', () => {
        test('provides relevance scoring', () => {
            const results = searchRecipes(sampleRecipes, 'brass');

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].score).toBeGreaterThan(0);
            expect(results[0].recipe.recipeId).toBe('create:brass_ingot');
        });
    });

    describe('groupRecipes', () => {
        test('groups by specified field', () => {
            const grouped = groupRecipes(sampleRecipes, 'mod');

            expect(grouped.minecraft).toBeDefined();
            expect(grouped.create).toBeDefined();
            expect(grouped.minecraft).toHaveLength(2);
            expect(grouped.create).toHaveLength(2);
        });
    });

    describe('normalizeFilters', () => {
        test('sanitizes input', () => {
            const filters = normalizeFilters({
                type: '  minecraft:crafting  ',
                mod: 'create',
                invalid: '',
                search: '  brass  '
            });

            expect(filters.type).toBe('minecraft:crafting');
            expect(filters.search).toBe('brass');
            expect(filters.mod).toBe('create');
            expect(filters.invalid).toBeUndefined();
        });
    });

    describe('normalizePagination', () => {
        test('provides safe defaults', () => {
            const pagination = normalizePagination({
                page: '2',
                limit: '5'
            });

            expect(pagination.page).toBe(2);
            expect(pagination.limit).toBe(5);

            const defaultPagination = normalizePagination({
                page: 'invalid',
                limit: '-1'
            });

            expect(defaultPagination.page).toBe(1);
            expect(defaultPagination.limit).toBe(20);
        });
    });
});