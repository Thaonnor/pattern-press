/**
 * Pattern Press - Reusable Alpine.js Components
 * Common UI components used throughout the application
 */

/**
 * Recipe Types that should be handled by the visualization system
 */
const SUPPORTED_RECIPE_TYPES = [
    'minecraft:crafting_shaped',
    'minecraft:crafting_shapeless',
    'minecraft:smelting',
    'minecraft:blasting',
    'minecraft:smoking',
    'minecraft:campfire_cooking',
    'minecraft:stonecutting',
    'minecraft:smithing',
    'minecraft:smithing_transform',
    'minecraft:smithing_trim'
];

/**
 * Check if a recipe type is supported for visualization
 */
function isSupportedRecipeType(recipeType) {
    return SUPPORTED_RECIPE_TYPES.includes(recipeType);
}

/**
 * Get the appropriate parser function for a recipe type
 */
function getRecipeParser(recipeType) {
    switch (recipeType) {
        case 'minecraft:crafting_shaped':
            return 'craftingGrid';
        case 'minecraft:crafting_shapeless':
            return 'shapelessGrid';
        case 'minecraft:smelting':
        case 'minecraft:blasting':
        case 'minecraft:smoking':
        case 'minecraft:campfire_cooking':
        case 'minecraft:stonecutting':
            return 'smeltingGrid';
        case 'minecraft:smithing':
            return 'smithingGrid';
        case 'minecraft:smithing_transform':
            return 'smithingTransformGrid';
        case 'minecraft:smithing_trim':
            return 'smithingTrimGrid';
        default:
            return null;
    }
}

/**
 * Get layout class for different recipe types
 */
function getRecipeLayoutClass(recipeType) {
    const baseClass = 'recipe-layout';

    switch (recipeType) {
        case 'minecraft:crafting_shaped':
            return `${baseClass} crafting-layout`;
        case 'minecraft:crafting_shapeless':
            return `${baseClass} shapeless-layout`;
        case 'minecraft:smithing':
        case 'minecraft:smithing_transform':
        case 'minecraft:smithing_trim':
            return `${baseClass} smithing-layout`;
        default:
            return `${baseClass} simple-layout`;
    }
}

/**
 * Clipboard functionality component
 */
function clipboardComponent() {
    return {
        copied: false,

        copyText(text) {
            copyToClipboard(text);
            this.copied = true;
            setTimeout(() => this.copied = false, 1500);
        }
    }
}

/**
 * JSON toggle functionality component
 */
function jsonToggleComponent() {
    return {
        showJson: false,

        toggleJson() {
            this.showJson = !this.showJson;
        }
    }
}

/**
 * Recipe visualization helper functions
 */
const RecipeVisualization = {
    /**
     * Render a single slot with mod overlay
     */
    renderSlot(slot, classes = '') {
        if (!slot) return '';

        return `
            <div class="slot ${classes} ${slot.type === 'tag' ? 'slot--tag' : 'slot--input'}">
                <span>${slot.text || ''}</span>
                <div class="mod-overlay">${slot.modText || ''}</div>
            </div>
        `;
    },

    /**
     * Render result item
     */
    renderResult(resultText, resultModText) {
        return `
            <div class="result-item slot--output">
                <span>${resultText}</span>
                <div class="mod-overlay">${resultModText}</div>
            </div>
        `;
    },

    /**
     * Render crafting grid (3x3)
     */
    renderCraftingGrid(slots) {
        return `
            <div class="crafting-grid">
                ${slots.map((slot, index) => this.renderSlot(slot)).join('')}
            </div>
        `;
    },

    /**
     * Render ingredient grid (flexible)
     */
    renderIngredientGrid(ingredients) {
        return `
            <div class="ingredient-grid">
                ${ingredients.map(ingredient => this.renderSlot(ingredient)).join('')}
            </div>
        `;
    },

    /**
     * Render smithing inputs
     */
    renderSmithingInputs(templateSlot, baseSlot, additionSlot) {
        return `
            <div class="smithing-inputs">
                ${this.renderSlot(templateSlot)}
                ${this.renderSlot(baseSlot)}
                ${this.renderSlot(additionSlot)}
            </div>
        `;
    }
};

// Make components and helpers available globally
window.isSupportedRecipeType = isSupportedRecipeType;
window.getRecipeParser = getRecipeParser;
window.getRecipeLayoutClass = getRecipeLayoutClass;
window.clipboardComponent = clipboardComponent;
window.jsonToggleComponent = jsonToggleComponent;
window.RecipeVisualization = RecipeVisualization;
window.SUPPORTED_RECIPE_TYPES = SUPPORTED_RECIPE_TYPES;