'use strict';

const path = require('path');
const Datastore = require('nedb');

const db = new Datastore({
    filename: path.join(__dirname, '..', 'data', 'recipes-test.db'),
    autoload: true
});

// View all records
db.find({}, (err, docs) => {
    if (err) {
        console.error('Error reading database:', err);
        return;
    }

    console.log(`📦 Found ${docs.length} recipes in database:\n`);

    docs.forEach((doc, index) => {
        console.log(`${index + 1}. ${doc.name} (${doc.type})`);
        console.log(`   Mod: ${doc.mod}`);
        console.log(`   Imported: ${doc.imported_at}`);
        console.log(`   Recipe data preview: ${JSON.stringify(doc.data).substring(0, 100)}...`);
        console.log('');
    });
});