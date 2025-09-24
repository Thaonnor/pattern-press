/**
 * Pattern Press - Utility Functions
 * Common helper functions used throughout the application
 */

/**
 * Format recipe name by replacing underscores and capitalizing words
 */
function formatName(name) {
    if (!name) return '';

    return name
        .replace(/_/g, ' ')                    // Replace underscores with spaces
        .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
        .trim();                               // Remove any trailing spaces
}

/**
 * Format recipe type for display
 */
function formatRecipeType(type) {
    if (!type) return '';

    return type
        .replace(/:/g, ': ')                   // Add space after colon
        .replace(/_/g, ' ')                    // Replace underscores with spaces
        .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
        .trim();                               // Remove any trailing spaces
}

/**
 * Get canonical name for recipe (mod:id)
 */
function getCanonicalName(recipe) {
    if (!recipe) return '';

    // Return the full namespaced recipe identifier: mod:id
    return `${recipe.mod}:${recipe.id}`;
}

/**
 * Copy text to clipboard with fallback for older browsers
 */
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            // Could add a toast notification here
            console.log('Copied to clipboard:', text);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            console.log('Copied to clipboard:', text);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
        document.body.removeChild(textArea);
    }
}

/**
 * Recipe metadata extraction helper
 */
function recipeMetadata(recipe) {
    return {
        get cookingTime() {
            return recipe.data.cookingtime || null;
        },

        get experience() {
            return recipe.data.experience || null;
        }
    };
}

/**
 * Get CSS classes for recipe slots
 */
function getSlotClasses(slot, isOutput = false) {
    let classes = ['slot'];

    if (isOutput) {
        classes.push('slot--output');
    } else {
        classes.push('slot--input');
    }

    // Check if this is a tag-based slot
    if (slot && slot.type === 'tag') {
        classes.push('slot--tag');
    }

    // Add empty class for empty slots
    if (!slot) {
        classes.push('empty');
    }

    return classes.join(' ');
}

/**
 * Alpine.js component factories
 */
window.clipboardComponent = function() {
    return {
        copied: false,

        copyText(text) {
            copyToClipboard(text);
            this.copied = true;
            setTimeout(() => this.copied = false, 1500);
        }
    }
};

window.jsonToggleComponent = function() {
    return {
        showJson: false,

        toggleJson() {
            this.showJson = !this.showJson;
        }
    }
};

// Recipe type support checking
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
    'minecraft:smithing_trim',
    'actuallyadditions:coffee_ingredient',
    'actuallyadditions:color_change',
    'actuallyadditions:crushing'
];

window.isSupportedRecipeType = function(recipeType) {
    return SUPPORTED_RECIPE_TYPES.includes(recipeType);
};

// Make functions available globally
window.formatName = formatName;
window.formatRecipeType = formatRecipeType;
window.getCanonicalName = getCanonicalName;
window.copyToClipboard = copyToClipboard;
window.recipeMetadata = recipeMetadata;
window.getSlotClasses = getSlotClasses;