// Base URL for all API calls — same origin as the page
const API = '/api/patients';

// ── DOM references ────────────────────────────────────────────────────────────
const form          = document.getElementById('registration-form');
const formError     = document.getElementById('form-error');
const formSuccess   = document.getElementById('form-success');
const listContainer = document.getElementById('patient-list-container');
const refreshBtn    = document.getElementById('refresh-btn');
const modalOverlay  = document.getElementById('modal-overlay');
const modalClose    = document.getElementById('modal-close');
const modalContent  = document.getElementById('modal-content');

// ── Utility helpers ───────────────────────────────────────────────────────────

// Format an ISO date string (YYYY-MM-DD) into a human-readable form
function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[+m - 1]} ${y}`;
}

// Show/hide the feedback alerts under the registration form
function showAlert(el, message) {
  el.textContent = message;
  el.classList.remove('hidden');
}
function hideAlerts() {
  formError.classList.add('hidden');
  formSuccess.classList.add('hidden');
}

// ── Patient list ──────────────────────────────────────────────────────────────

async function loadPatients() {
  listContainer.innerHTML = '<p class="loading">Loading patients…</p>';

  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error('Server error');
    const patients = await res.json();
    renderPatientTable(patients);
  } catch (err) {
    listContainer.innerHTML = '<p class="alert alert-error">Could not load patients. Is the server running?</p>';
  }
}

function renderPatientTable(patients) {
  if (patients.length === 0) {
    listContainer.innerHTML = '<p class="no-data">No patients registered yet.</p>';
    return;
  }

  // Build the table — data-label attributes drive the mobile CSS trick
  const rows = patients.map(p => `
    <tr>
      <td data-label="ID">${p.id}</td>
      <td data-label="Name">${escapeHtml(p.name)}</td>
      <td data-label="DOB">${formatDate(p.dob)}</td>
      <td data-label="Gender">${escapeHtml(p.gender)}</td>
      <td data-label="Blood Type">${escapeHtml(p.blood_type)}</td>
      <td data-label="Actions" class="actions">
        <button class="btn btn-view" onclick="viewPatient(${p.id})">View</button>
        <button class="btn btn-danger" onclick="deletePatient(${p.id}, '${escapeHtml(p.name)}')">Delete</button>
      </td>
    </tr>
  `).join('');

  listContainer.innerHTML = `
    <table class="patient-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Date of Birth</th>
          <th>Gender</th>
          <th>Blood Type</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// Prevent XSS when inserting user-supplied text into innerHTML
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── View patient (modal) ──────────────────────────────────────────────────────

async function viewPatient(id) {
  try {
    const res = await fetch(`${API}/${id}`);
    if (!res.ok) throw new Error('Not found');
    const p = await res.json();

    // Build detail rows for the modal
    modalContent.innerHTML = `
      <div class="detail-row"><span class="detail-label">Patient ID</span><span class="detail-value">${p.id}</span></div>
      <div class="detail-row"><span class="detail-label">Full Name</span><span class="detail-value">${escapeHtml(p.name)}</span></div>
      <div class="detail-row"><span class="detail-label">Date of Birth</span><span class="detail-value">${formatDate(p.dob)}</span></div>
      <div class="detail-row"><span class="detail-label">Gender</span><span class="detail-value">${escapeHtml(p.gender)}</span></div>
      <div class="detail-row"><span class="detail-label">Contact</span><span class="detail-value">${escapeHtml(p.contact)}</span></div>
      <div class="detail-row"><span class="detail-label">Blood Type</span><span class="detail-value">${escapeHtml(p.blood_type)}</span></div>
      <div class="detail-row"><span class="detail-label">Registered</span><span class="detail-value">${p.created_at}</span></div>
      <div class="modal-actions">
        <button class="btn btn-danger" onclick="deletePatient(${p.id}, '${escapeHtml(p.name)}', true)">Delete Record</button>
      </div>
    `;

    modalOverlay.classList.remove('hidden');
  } catch (err) {
    alert('Could not fetch patient record.');
  }
}

function closeModal() {
  modalOverlay.classList.add('hidden');
}

// ── Delete patient ────────────────────────────────────────────────────────────

async function deletePatient(id, name, fromModal = false) {
  if (!confirm(`Delete patient "${name}" (ID ${id})? This cannot be undone.`)) return;

  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');

    if (fromModal) closeModal();
    loadPatients(); // refresh list after deletion
  } catch (err) {
    alert('Could not delete patient. Please try again.');
  }
}

// ── Registration form submission ──────────────────────────────────────────────

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlerts();

  const payload = {
    name:       document.getElementById('name').value.trim(),
    dob:        document.getElementById('dob').value,
    gender:     document.getElementById('gender').value,
    contact:    document.getElementById('contact').value.trim(),
    blood_type: document.getElementById('blood_type').value,
  };

  // Basic client-side presence check before hitting the server
  const missing = Object.entries(payload)
    .filter(([, v]) => !v)
    .map(([k]) => k.replace('_', ' '));

  if (missing.length) {
    showAlert(formError, `Please fill in: ${missing.join(', ')}.`);
    return;
  }

  try {
    const res = await fetch(API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      // Server returned validation errors
      showAlert(formError, data.errors ? data.errors.join(', ') : 'Registration failed.');
      return;
    }

    showAlert(formSuccess, `Patient "${data.name}" registered successfully (ID ${data.id}).`);
    form.reset();
    loadPatients(); // refresh the list to show the new patient
  } catch (err) {
    showAlert(formError, 'Network error — please check the server.');
  }
});

// ── Event listeners ───────────────────────────────────────────────────────────

refreshBtn.addEventListener('click', loadPatients);

// Close modal when clicking the X button or the backdrop
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── Initial load ──────────────────────────────────────────────────────────────
loadPatients();
