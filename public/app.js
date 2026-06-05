// Base URL for all API calls — same origin as the page
const API = '/api/patients';

// ── DOM references ────────────────────────────────────────────────────────────
const form          = document.getElementById('registration-form');
const formError     = document.getElementById('form-error');
const formSuccess   = document.getElementById('form-success');
const listContainer = document.getElementById('patient-list-container');
const refreshBtn    = document.getElementById('refresh-btn');
const searchInput   = document.getElementById('search-input');
const searchCount   = document.getElementById('search-count');

// In-memory cache of all patients; filtering never re-fetches from the server
let allPatients = [];

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

// Prevent XSS when inserting user-supplied text into innerHTML
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Patient list ──────────────────────────────────────────────────────────────

async function loadPatients() {
  listContainer.innerHTML = '<p class="loading">Loading patients…</p>';

  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error('Server error');
    allPatients = await res.json();
    // Re-apply whatever the user has typed so the list stays filtered after refresh
    applyFilter();
  } catch (err) {
    listContainer.innerHTML = '<p class="alert alert-error">Could not load patients. Is the server running?</p>';
  }
}

// Filter allPatients by the current search term and re-render
function applyFilter() {
  const term = searchInput.value.trim().toLowerCase();
  const filtered = term
    ? allPatients.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.gender.toLowerCase().includes(term) ||
        p.blood_type.toLowerCase().includes(term)
      )
    : allPatients;

  // Show result count only when a search is active
  if (term) {
    searchCount.textContent = `${filtered.length} of ${allPatients.length} patient${allPatients.length !== 1 ? 's' : ''}`;
    searchCount.classList.remove('hidden');
  } else {
    searchCount.classList.add('hidden');
  }

  renderPatientTable(filtered);
}

function renderPatientTable(patients) {
  if (allPatients.length === 0) {
    listContainer.innerHTML = '<p class="no-data">No patients registered yet.</p>';
    return;
  }

  if (patients.length === 0) {
    listContainer.innerHTML = '<p class="no-data">No patients match your search.</p>';
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
        <a href="/patient.html?id=${p.id}" class="btn btn-view">View</a>
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

// ── Delete patient ────────────────────────────────────────────────────────────

async function deletePatient(id, name) {
  if (!confirm(`Delete patient "${name}" (ID ${id})? This cannot be undone.`)) return;

  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    loadPatients();
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
      showAlert(formError, data.errors ? data.errors.join(', ') : 'Registration failed.');
      return;
    }

    showAlert(formSuccess, `Patient "${data.name}" registered successfully (ID ${data.id}).`);
    form.reset();
    loadPatients();
  } catch (err) {
    showAlert(formError, 'Network error — please check the server.');
  }
});

// ── Event listeners ───────────────────────────────────────────────────────────

refreshBtn.addEventListener('click', loadPatients);
searchInput.addEventListener('input', applyFilter);

// ── Initial load ──────────────────────────────────────────────────────────────
loadPatients();
