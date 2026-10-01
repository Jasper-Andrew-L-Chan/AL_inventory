/**
 * Staff View Component
 * Manages pharmacists, pharmacy assistants, and cashiers
 */

function renderStaffView(container) {
  const staff = window.pharmacyStore.getStaff();

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h2 style="font-size: 1.35rem; font-weight: 700; color: #0d9488;">Pharmacy Staff & Pharmacists</h2>
        <div style="font-size: 0.8rem; color: var(--text-muted);">Registered personnel & dispensing authorizations</div>
      </div>
      <button onclick="alert('Staff creation modal')" class="btn-primary" style="background: var(--primary);">
        + Add Staff Member
      </button>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Staff Name</th>
            <th>Designation / Role</th>
            <th>PRC License / Accreditation</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${staff.map(s => `
            <tr>
              <td>
                <div style="font-weight: 700; color: var(--text-main);">${s.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">ID: ${s.id}</div>
              </td>
              <td>
                <span style="font-weight: 600; color: #028090;">${s.role}</span>
              </td>
              <td style="font-family: monospace;">${s.license}</td>
              <td style="font-size: 0.82rem;">${s.phone}</td>
              <td>
                <span class="badge" style="background: #dcfce7; color: #16a34a;">${s.status}</span>
              </td>
              <td>
                <button class="btn-outline" style="font-size: 0.75rem; padding: 2px 8px;">Edit</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
