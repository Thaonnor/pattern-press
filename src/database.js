const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Create NeDB database instance
const db = new Datastore({
    filename: path.join(dataDir, 'recipes.db'),
    autoload: true
});

// Create indexes for better query performance
db.ensureIndex({ fieldName: 'mod' });
db.ensureIndex({ fieldName: 'type' });
db.ensureIndex({ fieldName: 'name' });

module.exports = db;