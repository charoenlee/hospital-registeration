// node:sqlite is built into Node.js 22+; no install required
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// Open (or create) the SQLite database file
const db = new DatabaseSync(path.join(__dirname, 'patients.db'));

// Create the patients table if it doesn't already exist
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    dob         TEXT    NOT NULL,   -- stored as ISO date string YYYY-MM-DD
    gender      TEXT    NOT NULL,
    contact     TEXT    NOT NULL,
    blood_type  TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;
