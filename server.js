const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
// Serve the frontend from the /public folder
app.use(express.static(path.join(__dirname, 'public')));

// ── Prepared statements (compiled once, reused on every call) ────────────────
const stmts = {
  listAll:    db.prepare('SELECT * FROM patients ORDER BY created_at DESC'),
  findById:   db.prepare('SELECT * FROM patients WHERE id = ?'),
  insert:     db.prepare(`
    INSERT INTO patients (name, dob, gender, contact, blood_type)
    VALUES (?, ?, ?, ?, ?)
  `),
  deleteById: db.prepare('DELETE FROM patients WHERE id = ?'),
};

// ── Helper ────────────────────────────────────────────────────────────────────
// Validates that all required fields are present and non-empty
function validatePatient({ name, dob, gender, contact, blood_type }) {
  const errors = [];
  if (!name?.trim())       errors.push('name is required');
  if (!dob?.trim())        errors.push('date of birth is required');
  if (!gender?.trim())     errors.push('gender is required');
  if (!contact?.trim())    errors.push('contact is required');
  if (!blood_type?.trim()) errors.push('blood type is required');
  return errors;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/patients  — list all patients
app.get('/api/patients', (req, res) => {
  const patients = stmts.listAll.all();
  res.json(patients);
});

// GET /api/patients/:id  — get a single patient by ID
app.get('/api/patients/:id', (req, res) => {
  const patient = stmts.findById.get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json(patient);
});

// POST /api/patients  — register a new patient
app.post('/api/patients', (req, res) => {
  const { name, dob, gender, contact, blood_type } = req.body;

  const errors = validatePatient({ name, dob, gender, contact, blood_type });
  if (errors.length) return res.status(400).json({ errors });

  const result    = stmts.insert.run(name, dob, gender, contact, blood_type);
  const newPatient = stmts.findById.get(result.lastInsertRowid);
  res.status(201).json(newPatient);
});

// DELETE /api/patients/:id  — delete a patient record
app.delete('/api/patients/:id', (req, res) => {
  const patient = stmts.findById.get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  stmts.deleteById.run(req.params.id);
  res.json({ message: 'Patient deleted successfully' });
});

// Catch-all: serve the frontend for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Hospital Registration server running on http://localhost:${PORT}`);
});
