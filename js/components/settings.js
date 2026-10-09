/**
 * Settings View Component
 * Pharmacy store profile, BIR compliance, discount preferences,
 * and User Account Security (Change Password).
 * Styled with affordaLABS Diagnostics Plus warm medical orange & clinical slate palette.
 */

function renderSettingsView(container) {
  const settings = window.pharmacyStore.getSettings();
  const session = window.authStore ? window.authStore.getSession() : null;
  const isOwnerOrAdmin = window.authStore && typeof window.authStore.isOwnerOrAdmin === 'function'
    ? window.authStore.isOwnerOrAdmin()
    : false;

  container.innerHTML = `
    <!-- Top Title Header -->
    <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--primary); margin: 0; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="settings" style="width: 22px; height: 22px; color: var(--primary);"></i>
            Pharmacy Settings & Security
          </h2>
          <span class="badge" style="background: var(--primary-light); color: var(--primary-dark); border: 1px solid var(--primary-border); font-weight: 800; font-size: 0.72rem; padding: 3px 9px; border-radius: 9999px;">
            affordaLABS
          </span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
          Branding, BIR Accreditation, Regulatory Details & Account Security
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; max-width: 860px;">
      
      <!-- Account Security / Change Password Section (Available for currently logged-in user) -->
      <div class="card" style="padding: 1.5rem; margin-bottom: 0; border: 1px solid var(--primary-border); border-left: 4px solid var(--primary); background: #ffffff; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center;">
              <i data-lucide="key-round" style="width: 17px; height: 17px;"></i>
            </div>
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0;">Account Security & Password</h3>
              <div style="font-size: 0.74rem; color: var(--text-muted);">Change your login password for user <strong>@${session ? session.username : 'user'}</strong> (${session ? session.fullName : ''})</div>
            </div>
          </div>
          <span class="badge" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 0.72rem; font-weight: 700;">
            ✓ Active Session
          </span>
        </div>

        <form id="changePasswordForm" onsubmit="handleChangePassword(event)" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; align-items: flex-end;">
          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Current Password *</label>
            <input type="password" id="currentPassInput" class="form-input" placeholder="Enter current password" required autocomplete="current-password" />
          </div>
          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">New Password *</label>
            <input type="password" id="newPassInput" class="form-input" placeholder="Min. 4 characters" required minlength="4" autocomplete="new-password" />
          </div>
          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Confirm New Password *</label>
            <input type="password" id="confirmPassInput" class="form-input" placeholder="Re-type new password" required minlength="4" autocomplete="new-password" />
          </div>
          <div>
            <button type="submit" class="btn-primary" style="background: var(--primary); width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: var(--shadow-orange); padding: 0.62rem 1.25rem;">
              <i data-lucide="lock-keyhole" style="width: 15px; height: 15px;"></i>
              <span>Update Password</span>
            </button>
          </div>
        </form>
        <div id="passwordAlertMsg" style="display: none; margin-top: 0.85rem; font-size: 0.78rem; padding: 8px 12px; border-radius: 6px;"></div>
      </div>

      <!-- Pharmacy Identity Form -->
      <form id="settingsForm" onsubmit="handleSaveSettings(event)" style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="card" style="padding: 1.5rem; margin-bottom: 0; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 1rem;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="building-2" style="width: 17px; height: 17px;"></i>
            </div>
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0;">Pharmacy Identity & Branch Details</h3>
              <div style="font-size: 0.74rem; color: var(--text-muted);">Receipt headers and customer-facing diagnostics profile</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Store / Brand Name</label>
              <input type="text" id="setPharmName" value="${settings.pharmacyName}" class="form-input" required />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Branch Name</label>
              <input type="text" id="setBranch" value="${settings.branch}" class="form-input" required />
            </div>
            <div class="input-group" style="grid-column: span 2;">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Store Physical Address</label>
              <input type="text" id="setAddress" value="${settings.address}" class="form-input" required />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Contact Telephone / Mobile</label>
              <input type="text" id="setPhone" value="${settings.phone}" class="form-input" required />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Store Tagline</label>
              <input type="text" id="setTagline" value="${settings.tagline}" class="form-input" />
            </div>
          </div>
        </div>

        <!-- BIR & FDA Compliance Form -->
        <div class="card" style="padding: 1.5rem; margin-bottom: 0; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 1rem;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="shield-check" style="width: 17px; height: 17px;"></i>
            </div>
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0;">Regulatory Compliance (BIR & FDA)</h3>
              <div style="font-size: 0.74rem; color: var(--text-muted);">Tax identification, pharmacist licensing, and statutory discounts</div>
            </div>
          </div>

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

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; padding-top: 0.5rem;">
          ${isOwnerOrAdmin ? `
            <button type="button" onclick="handleResetData()" style="color: #dc2626; background: #fff1f2; border: 1px solid #fecaca; padding: 0.6rem 1rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i> Reset All Sample Pharmacy Data
            </button>
          ` : `<div></div>`}
          
          <button type="submit" class="btn-primary" style="background: var(--primary); padding: 0.7rem 2rem; box-shadow: var(--shadow-orange); font-size: 0.9rem;">
            Save Settings
          </button>
        </div>
      </form>
    </div>
  `;

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

window.handleChangePassword = function(e) {
  e.preventDefault();
  const currentPass = document.getElementById('currentPassInput').value;
  const newPass = document.getElementById('newPassInput').value;
  const confirmPass = document.getElementById('confirmPassInput').value;
  const alertEl = document.getElementById('passwordAlertMsg');

  if (newPass !== confirmPass) {
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.style.background = '#fee2e2';
      alertEl.style.color = '#b91c1c';
      alertEl.style.border = '1px solid #fca5a5';
      alertEl.textContent = '❌ New password and confirmation do not match.';
    }
    return;
  }

  const session = window.authStore ? window.authStore.getSession() : null;
  if (!session || !session.userId) {
    alert('Please log in first.');
    return;
  }

  try {
    window.authStore.changePassword(session.userId, currentPass, newPass);
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.style.background = '#ecfdf5';
      alertEl.style.color = '#047857';
      alertEl.style.border = '1px solid #a7f3d0';
      alertEl.textContent = '✓ Password changed successfully! Your account now uses your updated password.';
    }
    document.getElementById('changePasswordForm').reset();
  } catch (err) {
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.style.background = '#fee2e2';
      alertEl.style.color = '#b91c1c';
      alertEl.style.border = '1px solid #fca5a5';
      alertEl.textContent = '❌ ' + (err.message || 'Failed to change password.');
    }
  }
};

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
