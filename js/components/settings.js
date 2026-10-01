/**
 * Settings View Component
 * Pharmacy store profile, BIR compliance, and discount preferences
 */

function renderSettingsView(container) {
  const settings = window.pharmacyStore.getSettings();

  container.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h2 style="font-size: 1.35rem; font-weight: 700; color: #0d9488;">Pharmacy Store Settings</h2>
      <div style="font-size: 0.8rem; color: var(--text-muted);">Branding, BIR Accreditation, and Regulatory Details</div>
    </div>

    <form id="settingsForm" onsubmit="handleSaveSettings(event)" style="max-width: 800px;">
      <div class="card" style="padding: 1.5rem; margin-bottom: 1.25rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 1rem;">
          🏥 Pharmacy Identity & Branding
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Store Name</label>
            <input type="text" id="setPharmName" value="${settings.pharmacyName}" class="form-input" required />
          </div>
          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Branch Name</label>
            <input type="text" id="setBranch" value="${settings.branch}" class="form-input" required />
          </div>
          <div class="input-group" style="grid-column: span 2;">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Store Address</label>
            <input type="text" id="setAddress" value="${settings.address}" class="form-input" required />
          </div>
          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Contact Numbers</label>
            <input type="text" id="setPhone" value="${settings.phone}" class="form-input" required />
          </div>
          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Store Slogan</label>
            <input type="text" id="setTagline" value="${settings.tagline}" class="form-input" />
          </div>
        </div>
      </div>

      <div class="card" style="padding: 1.5rem; margin-bottom: 1.25rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 1rem;">
          🇵🇭 Regulatory Compliance (BIR & FDA)
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">BIR Registered TIN</label>
            <input type="text" id="setTin" value="${settings.tin}" class="form-input" required />
          </div>
          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Pharmacist-in-Charge</label>
            <input type="text" id="setPic" value="${settings.pharmacistInCharge}" class="form-input" required />
          </div>
          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">PRC License Number</label>
            <input type="text" id="setPrc" value="${settings.prcLicense}" class="form-input" required />
          </div>
          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Senior / PWD Discount Rate (%)</label>
            <input type="number" id="setDiscountRate" value="${settings.seniorDiscountRate}" class="form-input" required />
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center;">
        <button type="button" onclick="handleResetData()" style="color: #ef4444; background: none; border: 1px solid #fecaca; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size: 0.8rem; cursor: pointer;">
          ↺ Reset All Sample Pharmacy Data
        </button>
        <button type="submit" class="btn-primary" style="padding: 0.65rem 1.8rem;">
          Save Settings
        </button>
      </div>
    </form>
  `;
}

window.handleSaveSettings = function(e) {
  e.preventDefault();
  const updated = {
    pharmacyName: document.getElementById('setPharmName').value.trim(),
    branch: document.getElementById('setBranch').value.trim(),
    address: document.getElementById('setAddress').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    tagline: document.getElementById('setTagline').value.trim(),
    tin: document.getElementById('setTin').value.trim(),
    pharmacistInCharge: document.getElementById('setPic').value.trim(),
    prcLicense: document.getElementById('setPrc').value.trim(),
    seniorDiscountRate: Number(document.getElementById('setDiscountRate').value)
  };

  window.pharmacyStore.saveSettings(updated);
  alert('Settings updated successfully!');
  window.appRouter.renderCurrent();
};

window.handleResetData = function() {
  if (confirm('Are you sure you want to reset all inventory and transactions back to initial state?')) {
    localStorage.clear();
    window.location.reload();
  }
};
