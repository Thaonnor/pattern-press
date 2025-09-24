/**
 * Pattern Press - Recipe Parser Functions
 * Functions to parse and extract data from different recipe types
 */

/**
 * Helper function to parse ingredient/slot data consistently
 */
function parseIngredientSlot(ingredient) {
    if (!ingredient) return null;

    if (ingredient.item) {
        const itemParts = ingredient.item.split(':');
        return {
            text: itemParts.pop(),
            type: 'item',
            modText: itemParts.length > 0 ? itemParts[0] : 'minecraft'
        };
    } else if (ingredient.tag) {
        return {
            text: '#' + ingredient.tag,
            type: 'tag',
            modText: 'tag'
        };
    }
    return null;
}

/**
 * Helper function to parse result data consistently
 */
function parseResult(result) {
    if (!result) return { text: 'Unknown', modText: 'minecraft' };

    let text = result.id ? result.id.split(':').pop() : 'Unknown';
    if (result.count && result.count > 1) {
        text += ` x${result.count}`;
    }

    const itemParts = result.id ? result.id.split(':') : [];
    const modText = itemParts.length > 1 ? itemParts[0] : 'minecraft';

    return { text, modText };
}

/**
 * Crafting Grid Parser - Handles shaped crafting recipes
 */
function craftingGrid(recipe) {
    return {
        get gridSlots() {
            const pattern = recipe.data.pattern || [];
            const key = recipe.data.key || {};
            const slots = new Array(9).fill(null);

            // Process each row of the pattern
            pattern.forEach((row, rowIndex) => {
                for (let colIndex = 0; colIndex < row.length && colIndex < 3; colIndex++) {
                    const symbol = row[colIndex];
                    const slotIndex = rowIndex * 3 + colIndex;

                    if (symbol !== ' ' && key[symbol]) {
                        slots[slotIndex] = parseIngredientSlot(key[symbol]);
                    }
                }
            });

            return slots;
        },

        get resultText() {
            return parseResult(recipe.data.result).text;
        },

        get resultModText() {
            return parseResult(recipe.data.result).modText;
        }
    };
}

/**
 * Smelting Grid Parser - Handles smelting, blasting, smoking, stonecutting, campfire recipes
 */
function smeltingGrid(recipe) {
    return {
        get inputSlot() {
            return parseIngredientSlot(recipe.data.ingredient);
        },

        get resultText() {
            return parseResult(recipe.data.result).text;
        },

        get resultModText() {
            return parseResult(recipe.data.result).modText;
        }
    };
}

/**
 * Coffee Ingredient Parser - Handles actuallyadditions:coffee_ingredient recipes
 */
function coffeeIngredientGrid(recipe) {
    return {
        get inputSlot() {
            return parseIngredientSlot(recipe.data.ingredient);
        },

        get resultText() {
            const effects = recipe.data.effects || [];
            if (effects.length === 0) return 'No Effect';

            const primaryEffect = effects[0];
            let effectName = primaryEffect.effect || 'Unknown Effect';

            // Clean up effect name (remove minecraft: prefix)
            effectName = effectName.replace('minecraft:', '');

            // Add duration info
            const duration = primaryEffect.duration;
            const amplifier = primaryEffect.amplifier;

            let result = effectName;
            if (duration) result += ` (${duration}s)`;
            if (amplifier && amplifier > 0) result += ` +${amplifier}`;

            return result;
        },

        get resultModText() {
            return 'effect';
        },

        get maxAmplifier() {
            return recipe.data.max_amplifier || 0;
        }
    };
}

/**
 * Crushing Parser - Handles actuallyadditions:crushing recipes
 */
function crushingGrid(recipe) {
    return {
        get inputSlot() {
            return parseIngredientSlot(recipe.data.ingredient);
        },

        get primaryResult() {
            const results = recipe.data.result || [];
            if (results.length === 0) return null;

            const primary = results[0];
            if (!primary || !primary.result) return null;

            return parseResult(primary.result);
        },

        get secondaryResult() {
            const results = recipe.data.result || [];
            if (results.length < 2) return null;

            const secondary = results[1];
            if (!secondary || !secondary.result || !secondary.result.id || secondary.chance === 0) return null;

            const parsed = parseResult(secondary.result);
            const chance = Math.round(secondary.chance * 100);

            return {
                text: `${parsed.text} (${chance}%)`,
                modText: parsed.modText
            };
        },

        get resultText() {
            const primary = this.primaryResult;
            return primary ? primary.text : 'Unknown';
        },

        get resultModText() {
            const primary = this.primaryResult;
            return primary ? primary.modText : 'minecraft';
        }
    };
}

/**
 * Shapeless Grid Parser - Handles shapeless crafting recipes
 */
function shapelessGrid(recipe) {
    return {
        get ingredients() {
            const ingredients = recipe.data.ingredients || [];
            return ingredients.map(ingredient => parseIngredientSlot(ingredient)).filter(Boolean);
        },

        get resultText() {
            return parseResult(recipe.data.result).text;
        },

        get resultModText() {
            return parseResult(recipe.data.result).modText;
        }
    };
}

/**
 * Base Smithing Parser - Common logic for smithing recipes
 */
function createSmithingParser(recipe) {
    return {
        get templateSlot() {
            return parseIngredientSlot(recipe.data.template);
        },

        get baseSlot() {
            return parseIngredientSlot(recipe.data.base);
        },

        get additionSlot() {
            return parseIngredientSlot(recipe.data.addition);
        },

        get resultText() {
            return parseResult(recipe.data.result).text;
        },

        get resultModText() {
            return parseResult(recipe.data.result).modText;
        }
    };
}

/**
 * Legacy Smithing Parser - Handles legacy smithing recipes
 */
function smithingGrid(recipe) {
    return createSmithingParser(recipe);
}

/**
 * Smithing Transform Parser - Handles smithing transform recipes
 */
function smithingTransformGrid(recipe) {
    return createSmithingParser(recipe);
}

/**
 * Smithing Trim Parser - Handles smithing trim recipes
 */
function smithingTrimGrid(recipe) {
    // Same base logic as other smithing recipes
    const base = createSmithingParser(recipe);

    // Override result since trim recipes don't have traditional results
    return {
        ...base,
        get resultText() {
            return 'Trimmed Armor';
        },
        get resultModText() {
            return 'minecraft';
        }
    };
}

// Make all parser functions available globally
window.craftingGrid = craftingGrid;
window.smeltingGrid = smeltingGrid;
window.coffeeIngredientGrid = coffeeIngredientGrid;
window.crushingGrid = crushingGrid;
window.shapelessGrid = shapelessGrid;
window.smithingGrid = smithingGrid;
window.smithingTransformGrid = smithingTransformGrid;
window.smithingTrimGrid = smithingTrimGrid;

// Also export helper functions for potential future use
window.parseIngredientSlot = parseIngredientSlot;
window.parseResult = parseResult;