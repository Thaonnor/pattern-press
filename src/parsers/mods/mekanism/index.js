'use strict';

/**
 * Mekanism mod recipe handlers module.
 *
 * This module exports all Mekanism-specific recipe handlers for CraftTweaker
 * recipe parsing. Each handler is responsible for parsing a specific Mekanism
 * machine recipe type.
 */

// Core handlers (previously implemented)
const activatingHandler = require('./activatingHandler');
const centrifugingHandler = require('./centrifugingHandler');
const chemicalConversionHandler = require('./chemicalConversionHandler');

// Complete Mekanism coverage - all recipe types
const chemicalInfusingHandler = require('./chemicalInfusingHandler');
const combiningHandler = require('./combiningHandler');
const compressingHandler = require('./compressingHandler');
const crushingHandler = require('./crushingHandler');
const crystallizingHandler = require('./crystallizingHandler');
const dissolutionHandler = require('./dissolutionHandler');
const energyConversionHandler = require('./energyConversionHandler');
const enrichingHandler = require('./enrichingHandler');

// Latest additions from fresh log analysis
const evaporatingHandler = require('./evaporatingHandler');
const injectingHandler = require('./injectingHandler');
const metallurgicInfusingHandler = require('./metallurgicInfusingHandler');
const nucleosynthesizingHandler = require('./nucleosynthesizingHandler');
const oxidizingHandler = require('./oxidizingHandler');
const paintingHandler = require('./paintingHandler');

// Final 5 handlers from latest update - COMPLETE Mekanism coverage!
const pigmentExtractingHandler = require('./pigmentExtractingHandler');
const pigmentMixingHandler = require('./pigmentMixingHandler');
const purifyingHandler = require('./purifyingHandler');
const rotaryHandler = require('./rotaryHandler');
const sawingHandler = require('./sawingHandler');

// Latest 3 handlers - TRUE complete coverage!
const reactionHandler = require('./reactionHandler');
const separatingHandler = require('./separatingHandler');
const washingHandler = require('./washingHandler');

module.exports = {
    // ALL Mekanism handlers - ULTIMATE COMPLETE coverage of 25 recipe types!
    activatingHandler,
    centrifugingHandler,
    chemicalConversionHandler,
    chemicalInfusingHandler,
    combiningHandler,
    compressingHandler,
    crushingHandler,
    crystallizingHandler,
    dissolutionHandler,
    energyConversionHandler,
    enrichingHandler,
    evaporatingHandler,
    injectingHandler,
    metallurgicInfusingHandler,
    nucleosynthesizingHandler,
    oxidizingHandler,
    paintingHandler,
    pigmentExtractingHandler,
    pigmentMixingHandler,
    purifyingHandler,
    reactionHandler,
    rotaryHandler,
    sawingHandler,
    separatingHandler,
    washingHandler,

    // Helper to get all implemented handlers as an array
    getAllHandlers() {
        return [
            activatingHandler,
            centrifugingHandler,
            chemicalConversionHandler,
            chemicalInfusingHandler,
            combiningHandler,
            compressingHandler,
            crushingHandler,
            crystallizingHandler,
            dissolutionHandler,
            energyConversionHandler,
            enrichingHandler,
            evaporatingHandler,
            injectingHandler,
            metallurgicInfusingHandler,
            nucleosynthesizingHandler,
            oxidizingHandler,
            paintingHandler,
            pigmentExtractingHandler,
            pigmentMixingHandler,
            purifyingHandler,
            reactionHandler,
            rotaryHandler,
            sawingHandler,
            separatingHandler,
            washingHandler
        ];
    }
};