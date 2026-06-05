const API = '/api/patients';

const detailContent = document.getElementById('detail-content');

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[+m - 1]} ${y}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label, value) {
  return `<div class="detail-row">
    <span class="detail-label">${label}</span>
    <span class="detail-value">${value}</span>
  </div>`;
}

async function loadPatient(id) {
  try {
    const res = await fetch(`${API}/${id}`);
    if (!res.ok) throw new Error('Not found');
    const p = await res.json();

    document.title = `${p.name} — Hospital Registration`;

    detailContent.innerHTML = `
      ${row('Patient ID',   p.id)}
      ${row('Full Name',    escapeHtml(p.name))}
      ${row('Date of Birth', formatDate(p.dob))}
      ${row('Gender',       escapeHtml(p.gender))}
      ${row('Contact',      escapeHtml(p.contact))}
      ${row('Blood Type',   escapeHtml(p.blood_type))}
      ${row('Registered',   p.created_at)}
      <div class="detail-actions">
        <button class="btn btn-danger" id="delete-btn">Delete Record</button>
      </div>
    `;

    document.getElementById('delete-btn').addEventListener('click', () => deletePatient(p.id, p.name));
  } catch (err) {
    detailContent.innerHTML = '<p class="alert alert-error">Patient not found.</p>';
  }
}

async function deletePatient(id, name) {
  if (!confirm(`Delete patient "${name}" (ID ${id})? This cannot be undone.`)) return;

  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    // Return to the list after deletion
    window.location.href = '/';
  } catch (err) {
    alert('Could not delete patient. Please try again.');
  }
}

// Read the ?id= query param and load that patient
const id = new URLSearchParams(window.location.search).get('id');
if (id) {
  loadPatient(id);
} else {
  detailContent.innerHTML = '<p class="alert alert-error">No patient ID specified.</p>';
}
