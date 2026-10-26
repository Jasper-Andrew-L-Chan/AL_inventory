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

        <!-- Central Cloud Database & Multi-PC Sync (Admin/Owner) -->
        ${isOwnerOrAdmin ? `
          <div class="card" style="padding: 1.5rem; margin-bottom: 0; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); background: #f8fafc;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="cloud" style="width: 17px; height: 17px;"></i>
                </div>
                <div>
                  <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0;">Central Cloud Database & Multi-PC Sync</h3>
                  <div style="font-size: 0.74rem; color: var(--text-muted);">Real-time synchronization across different PCs, branches, and networks</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <button type="button" onclick="handleManualSync()" class="btn-secondary" style="padding: 0.45rem 0.9rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px;">
                  <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Sync Now
                </button>
              </div>
            </div>

            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-main);">Cloud Database Status:</span>
                <span id="cloudStatusBadge" style="font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #ecfdf5; color: #047857;">
                  ● Active & Connected
                </span>
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.5;">
                Every change made on any connected PC (stock adjustments, customer sales, user accounts, and shift updates) automatically synchronizes with the central database.
              </div>
            </div>

            <!-- Migration from Local File -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 1rem;">
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">
                Upload / Migrate Local Database to Cloud
              </div>
              <div style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                Have an existing <code>pharmacy_db.json</code> file from the pharmacy computer? You can upload and merge it into the central cloud database at any time.
              </div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <input type="file" id="migrateFileInput" accept=".json" style="font-size: 0.8rem;" />
                <button type="button" onclick="handleUploadLocalDb()" class="btn-primary" style="background: #2563eb; padding: 0.45rem 1rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px;">
                  <i data-lucide="upload-cloud" style="width: 14px; height: 14px;"></i> Upload to Central Database
                </button>
              </div>
              <div id="migrateStatusMsg" style="display: none; margin-top: 0.65rem; font-size: 0.78rem; padding: 6px 12px; border-radius: 6px;"></div>
            </div>
          </div>
        ` : ''}

        <!-- Device Performance & Low-Spec PC Optimization Card -->
        <div class="card" style="padding: 1.5rem; margin-bottom: 0; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="zap" style="width: 17px; height: 17px;"></i>
              </div>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0;">Device Performance & Low-Spec PC Mode</h3>
                <div style="font-size: 0.74rem; color: var(--text-muted);">Optimize animations, memory usage, and GPU rendering for slower computers</div>
              </div>
            </div>
            <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 700; font-size: 0.82rem; color: var(--text-main);">
              <input type="checkbox" id="perfModeCheckbox" ${document.body.classList.contains('low-spec-mode') ? 'checked' : ''} onchange="window.togglePerformanceMode(this.checked)" style="width: 17px; height: 17px; accent-color: var(--primary); cursor: pointer;" />
              <span>Enable Low-Spec PC Mode</span>
            </label>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.5;">
            When enabled, the system disables GPU-heavy background blurs, animated orbs, and reduces DOM memory footprint. The inventory table also automatically paginates into lightweight batches so typing and scrolling remain lightning fast even on older Intel Celeron, Pentium, or 4GB RAM PCs.
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; padding-top: 0.5rem;">
          ${isOwnerOrAdmin ? `
            <button type="button" onclick="handleResetData()" style="color: #dc2626; background: #fff1f2; border: 1px solid #fecaca; padding: 0.6rem 1rem; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i> Reset Device Cache (Re-download from Cloud)
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

window.handleChangePassword = async function(e) {
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
    await window.authStore.changePassword(session.userId, currentPass, newPass);
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
  if (confirm('Clear this device\'s local copy and re-download everything from the shared database?\n\n(This does NOT delete any shared data.)')) {
    window.pharmacyStore.resetCache();
    window.pharmacyStore.startSync().then(() => window.location.reload());
  }
};

window.handleManualSync = async function() {
  const badge = document.getElementById('cloudStatusBadge');
  if (badge) {
    badge.textContent = '⟳ Syncing with Cloud...';
    badge.style.background = '#eff6ff';
    badge.style.color = '#1d4ed8';
  }
  try {
    await window.pharmacyStore.syncFromServer(true);
    if (badge) {
      badge.textContent = '● Synced just now';
      badge.style.background = '#ecfdf5';
      badge.style.color = '#047857';
    }
  } catch (err) {
    if (badge) {
      badge.textContent = '⚠ Sync Error: ' + err.message;
      badge.style.background = '#fef2f2';
      badge.style.color = '#b91c1c';
    }
  }
};

window.handleUploadLocalDb = async function() {
  const fileInput = document.getElementById('migrateFileInput');
  const msgEl = document.getElementById('migrateStatusMsg');
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert('Please select a pharmacy_db.json file to upload.');
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      if (msgEl) {
        msgEl.style.display = 'block';
        msgEl.style.background = '#eff6ff';
        msgEl.style.color = '#1d4ed8';
        msgEl.textContent = 'Uploading and migrating database to cloud...';
      }
      const rawText = e.target.result.replace(/^\uFEFF/, '');
      const parsed = JSON.parse(rawText);
      const res = await window.alApi('/api/migrate', {
        method: 'POST',
        body: parsed
      });

      if (msgEl) {
        msgEl.style.background = '#ecfdf5';
        msgEl.style.color = '#047857';
        const s = res.summary || {};
        msgEl.textContent = `✓ Successfully imported to Cloud: ${s.items || 0} medicines, ${s.transactions || 0} transactions, ${s.users || 0} staff accounts!`;
      }
      // Re-sync local cache
      await window.pharmacyStore.syncFromServer(true);
      setTimeout(() => {
        window.appRouter.renderCurrent();
      }, 1500);
    } catch (err) {
      if (msgEl) {
        msgEl.style.display = 'block';
        msgEl.style.background = '#fee2e2';
        msgEl.style.color = '#b91c1c';
        msgEl.textContent = '❌ Import failed: ' + (err.message || 'Invalid database JSON file.');
      }
    }
  };
  reader.readAsText(file);
};

