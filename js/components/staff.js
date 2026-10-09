/**
 * Staff View Component
 * Manages pharmacists, pharmacy assistants, and cashiers
 * Supports Owner and Admin role-based access control, user creation,
 * granular tab permissions assignment, and account status management.
 * Styled with affordaLABS Diagnostics Plus warm medical orange & clinical slate palette.
 */

function renderStaffView(container) {
  const staff = window.pharmacyStore.getStaff();
  const isOwnerOrAdmin = window.authStore && typeof window.authStore.isOwnerOrAdmin === 'function' 
    ? window.authStore.isOwnerOrAdmin() 
    : false;
  const currentSession = window.authStore ? window.authStore.getSession() : null;

  const allPerms = window.authStore && typeof window.authStore.getAllPermissionsList === 'function'
    ? window.authStore.getAllPermissionsList()
    : [
        { id: 'home', label: 'Home' },
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'transactions', label: 'In - Out' },
        { id: 'inventory', label: 'Inventory' },
        { id: 'reports', label: 'Reports' },
        { id: 'cashdrawer', label: 'Cash Drawer' },
        { id: 'staff', label: 'Staff Management' },
        { id: 'settings', label: 'Settings' }
      ];

  container.innerHTML = `
    <!-- Top Action Bar & Summary -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--primary); margin: 0; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="users" style="width: 22px; height: 22px; color: var(--primary);"></i>
            Pharmacy Staff & Access Control
          </h2>
          <span class="badge" style="background: var(--primary-light); color: var(--primary-dark); border: 1px solid var(--primary-border); font-weight: 800; font-size: 0.72rem; padding: 3px 9px; border-radius: 9999px;">
            ${staff.length} Active Accounts
          </span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
          affordaLABS Diagnostics Plus credential management, operator authorizations, and view security.
        </div>
      </div>
      
      <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
        ${isOwnerOrAdmin ? `
          <button onclick="openAddStaffModal()" class="btn-primary" style="background: var(--primary); display: inline-flex; align-items: center; gap: 6px; box-shadow: var(--shadow-orange);">
            <i data-lucide="user-plus" style="width: 16px; height: 16px;"></i>
            <span>+ Add Staff Member</span>
          </button>
        ` : `
          <div style="display: inline-flex; align-items: center; gap: 6px; background: #fff7ed; color: #c2410c; padding: 6px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; border: 1px solid #ffedd5;">
            <i data-lucide="shield-alert" style="width: 14px; height: 14px;"></i>
            <span>Staff Management (Owner/Admin Clearance Required)</span>
          </div>
        `}
      </div>
    </div>

    <!-- Access Control Legend / Policy Notice -->
    <div style="background: #ffffff; border: 1px solid var(--primary-border); border-left: 4px solid var(--primary); border-radius: var(--radius-md); padding: 0.9rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; box-shadow: var(--shadow-sm);">
      <div style="display: flex; align-items: center; gap: 10px; font-size: 0.82rem; color: var(--brand-charcoal);">
        <div style="width: 30px; height: 30px; border-radius: 8px; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i data-lucide="shield-check" style="width: 18px; height: 18px;"></i>
        </div>
        <div>
          <strong>Role-Based Access Control:</strong> Owners and Admins hold full system clearances. Staff accounts are strictly restricted to checked tabs.
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; font-size: 0.76rem; background: var(--border-light); padding: 5px 12px; border-radius: 9999px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);"></span>
        <span style="color: var(--text-muted);">Signed in as: <strong style="color: var(--text-main);">${currentSession ? currentSession.fullName : 'Guest'}</strong> (${currentSession ? currentSession.level || currentSession.role : 'Staff'})</span>
      </div>
    </div>

    <!-- Staff Accounts Table -->
    <div class="table-container" style="background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); overflow-x: auto;">
      <table class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #fafaf9; border-bottom: 2px solid var(--border-color); text-align: left;">
            <th style="padding: 12px 16px; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Staff / Username</th>
            <th style="padding: 12px 16px; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Account Level</th>
            <th style="padding: 12px 16px; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Designation / Role</th>
            <th style="padding: 12px 16px; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Authorized Module Access</th>
            <th style="padding: 12px 16px; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">PRC / License</th>
            <th style="padding: 12px 16px; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Status</th>
            <th style="padding: 12px 16px; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${staff.map(s => {
            const isOwner = (s.level === 'Owner' || (s.role || '').toLowerCase().includes('owner'));
            const isAdmin = (s.level === 'Admin' || (s.role || '').toLowerCase().includes('admin') || s.username === 'admin');
            const perms = Array.isArray(s.permissions) ? s.permissions : [];
            const hasAllPerms = isOwner || isAdmin || perms.length === allPerms.length;

            let levelBadgeStyle = 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;';
            if (isOwner) levelBadgeStyle = 'background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5;';
            else if (isAdmin) levelBadgeStyle = 'background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe;';
            else levelBadgeStyle = 'background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;';

            return `
              <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;">
                <td style="padding: 12px 16px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: ${isOwner ? 'var(--primary-gradient)' : (isAdmin ? '#4338ca' : '#ea580c')}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                      ${(s.name || s.username || 'ST').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style="font-weight: 700; color: var(--text-main); font-size: 0.88rem;">${s.name}</div>
                      <div style="font-size: 0.73rem; color: var(--text-muted); font-family: monospace;">@${s.username || s.id}</div>
                    </div>
                  </div>
                </td>
                <td style="padding: 12px 16px;">
                  <span class="badge" style="${levelBadgeStyle} font-weight: 800; font-size: 0.72rem; padding: 3px 8px; border-radius: 6px;">
                    ${isOwner ? '👑 Owner' : (isAdmin ? '⚡ Admin' : '👤 Staff')}
                  </span>
                </td>
                <td style="padding: 12px 16px;">
                  <div style="font-weight: 700; color: var(--brand-charcoal); font-size: 0.84rem;">${s.role}</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">${s.phone}</div>
                </td>
                <td style="padding: 12px 16px; max-width: 320px;">
                  ${hasAllPerms ? `
                    <span style="display: inline-flex; align-items: center; gap: 4px; background: #fff7ed; color: #c2410c; font-weight: 700; font-size: 0.73rem; padding: 3px 8px; border-radius: 6px; border: 1px solid #fed7aa;">
                      <i data-lucide="check-check" style="width: 14px; height: 14px;"></i> Full Access (All 8 Modules)
                    </span>
                  ` : `
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                      ${perms.map(p => {
                        const def = allPerms.find(ap => ap.id === p);
                        const label = def ? def.label.split(' ')[0] : p;
                        return `
                          <span style="font-size: 0.68rem; background: #f8fafc; color: var(--text-main); padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; font-weight: 600;">
                            ✓ ${label}
                          </span>
                        `;
                      }).join('')}
                    </div>
                  `}
                </td>
                <td style="padding: 12px 16px; font-family: monospace; font-size: 0.8rem; color: #475569;">
                  ${s.license || '-'}
                </td>
                <td style="padding: 12px 16px;">
                  <span class="badge" style="background: ${s.status === 'Active' ? '#dcfce7' : '#fee2e2'}; color: ${s.status === 'Active' ? '#15803d' : '#b91c1c'}; font-weight: 800; font-size: 0.72rem; padding: 3px 8px; border-radius: 9999px;">
                    ${s.status || 'Active'}
                  </span>
                </td>
                <td style="padding: 12px 16px; text-align: right;">
                  ${isOwnerOrAdmin ? `
                    <div style="display: inline-flex; align-items: center; gap: 6px;">
                      <button onclick="openEditStaffModal('${s.id}')" class="btn-outline" style="font-size: 0.75rem; padding: 4px 8px; display: inline-flex; align-items: center; gap: 4px; border-color: var(--primary-border); color: var(--primary-dark);" title="Edit Account & Permissions">
                        <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i> Edit
                      </button>
                      ${(!isOwner && s.username !== 'admin' && (currentSession && currentSession.userId !== s.id)) ? `
                        <button onclick="confirmDeleteStaff('${s.id}', '${s.name || s.username}')" class="btn-outline" style="font-size: 0.75rem; padding: 4px 6px; color: #dc2626; border-color: #fca5a5;" title="Remove Account">
                          <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
                        </button>
                      ` : ''}
                    </div>
                  ` : `
                    <span style="font-size: 0.72rem; color: #94a3b8; font-style: italic;">View Only</span>
                  `}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Add / Edit Staff Account Modal -->
    <div id="staffModal" class="modal-overlay">
      <div class="modal-card" style="max-width: 660px; max-height: 92vh; display: flex; flex-direction: column;">
        <div class="modal-header" style="background: var(--primary-light); border-bottom: 1px solid var(--primary-border);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 34px; height: 34px; border-radius: 8px; background: white; color: var(--primary); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm);">
              <i data-lucide="user-cog" style="width: 18px; height: 18px;"></i>
            </div>
            <div>
              <h3 class="modal-title" id="staffModalTitle" style="margin: 0; font-size: 1.15rem; color: var(--primary-dark);">Add New Staff Member</h3>
              <div style="font-size: 0.74rem; color: var(--text-muted);">Set login account credentials and granular module access</div>
            </div>
          </div>
          <button type="button" onclick="closeStaffModal()" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="x" style="width: 18px; height: 18px; color: var(--text-muted);"></i>
          </button>
        </div>

        <form id="staffAccountForm" onsubmit="handleSaveStaffAccount(event)" style="display: flex; flex-direction: column; overflow: hidden; flex: 1;">
          <div class="modal-body" style="overflow-y: auto; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
            <input type="hidden" id="staffUserId" />

            <!-- Account Details Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
              <div class="input-group">
                <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Full Name *</label>
                <input type="text" id="staffFullName" class="form-input" placeholder="e.g. Maria Clara Santos, RPh" required />
              </div>
              
              <div class="input-group">
                <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Username (Login ID) *</label>
                <input type="text" id="staffUsername" class="form-input" placeholder="e.g. maria, cashier1" required autocomplete="off" />
              </div>

              <div class="input-group">
                <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Password *</label>
                <input type="password" id="staffPassword" class="form-input" placeholder="Enter secure password" required autocomplete="new-password" />
              </div>

              <div class="input-group">
                <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Account Level *</label>
                <select id="staffLevel" class="form-input" onchange="handleStaffLevelChange()" required>
                  <option value="Staff">Staff (Restricted by Selected Permissions)</option>
                  <option value="Admin">Admin (Full System Permissions)</option>
                  <option value="Owner">Owner (Superuser & Full Ownership)</option>
                </select>
              </div>

              <div class="input-group">
                <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Designation / Role Preset</label>
                <select id="staffRole" class="form-input" onchange="applyRolePermissionPreset()">
                  <option value="Cashier">Cashier</option>
                  <option value="Pharmacy Assistant">Pharmacy Assistant</option>
                  <option value="Staff Pharmacist">Staff Pharmacist</option>
                  <option value="Inventory Specialist">Inventory Specialist</option>
                  <option value="Pharmacist-in-Charge">Pharmacist-in-Charge</option>
                  <option value="Owner / Administrator">Owner / Administrator</option>
                </select>
              </div>

              <div class="input-group">
                <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">PRC License / Accreditation</label>
                <input type="text" id="staffLicense" class="form-input" placeholder="e.g. PRC-0099881 or TESDA NC-III" />
              </div>

              <div class="input-group">
                <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Contact Phone</label>
                <input type="text" id="staffPhone" class="form-input" placeholder="e.g. 0917-000-0000" />
              </div>

              <div class="input-group">
                <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Account Status</label>
                <select id="staffStatus" class="form-input">
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <!-- Granular Access Control Section -->
            <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div>
                  <div style="font-size: 0.84rem; font-weight: 700; color: var(--text-main);">Module & Tab Access Permissions</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Check the specific views this account is authorized to open</div>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button type="button" onclick="toggleAllPermissions(true)" class="btn-outline" style="font-size: 0.7rem; padding: 2px 8px; border-color: var(--primary-border); color: var(--primary);">Select All</button>
                  <button type="button" onclick="toggleAllPermissions(false)" class="btn-outline" style="font-size: 0.7rem; padding: 2px 8px;">Clear All</button>
                </div>
              </div>

              <div id="permissionsGrid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; background: var(--primary-light); border: 1px solid var(--primary-border); border-radius: 8px; padding: 0.85rem;">
                ${allPerms.map(p => `
                  <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.78rem; color: var(--brand-charcoal); cursor: pointer; user-select: none;">
                    <input type="checkbox" name="staffPerm" value="${p.id}" class="perm-checkbox" style="margin-top: 2px; accent-color: var(--primary);" />
                    <div>
                      <div style="font-weight: 600;">${p.label}</div>
                    </div>
                  </label>
                `).join('')}
              </div>
              <div id="adminNoticePerms" style="display: none; margin-top: 0.5rem; font-size: 0.72rem; color: #c2410c; background: #fff7ed; padding: 6px 10px; border-radius: 6px; border: 1px solid #ffedd5;">
                💡 <strong>affordaLABS Notice:</strong> As an Owner or Admin account, full access to all modules is granted unconditionally.
              </div>
            </div>

          </div>

          <div class="modal-footer" style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" onclick="closeStaffModal()" class="btn-outline">Cancel</button>
            <button type="submit" class="btn-primary" style="background: var(--primary); box-shadow: var(--shadow-orange);">Save Staff Member</button>
          </div>
        </form>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// ── Modal Open / Close / Save Handlers ────────────────────────────────────────

window.openAddStaffModal = function() {
  const modal = document.getElementById('staffModal');
  if (!modal) return;

  document.getElementById('staffModalTitle').textContent = 'Add New Staff Member';
  document.getElementById('staffUserId').value = '';
  document.getElementById('staffFullName').value = '';
  document.getElementById('staffUsername').value = '';
  document.getElementById('staffUsername').disabled = false;
  document.getElementById('staffPassword').value = '';
  document.getElementById('staffPassword').placeholder = 'Enter login password';
  document.getElementById('staffPassword').required = true;
  document.getElementById('staffLevel').value = 'Staff';
  document.getElementById('staffRole').value = 'Cashier';
  document.getElementById('staffLicense').value = '';
  document.getElementById('staffPhone').value = '';
  document.getElementById('staffStatus').value = 'Active';

  // Apply default Cashier permissions preset
  applyRolePermissionPreset();
  handleStaffLevelChange();

  modal.classList.add('active');
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.openEditStaffModal = function(id) {
  const user = window.authStore.getUserById(id);
  if (!user) {
    alert('User not found.');
    return;
  }

  const modal = document.getElementById('staffModal');
  if (!modal) return;

  document.getElementById('staffModalTitle').textContent = `Edit Staff: ${user.fullName}`;
  document.getElementById('staffUserId').value = user.id;
  document.getElementById('staffFullName').value = user.fullName || '';
  document.getElementById('staffUsername').value = user.username || '';
  document.getElementById('staffUsername').disabled = false;
  document.getElementById('staffPassword').value = user.password || '';
  document.getElementById('staffPassword').placeholder = 'Enter new password or leave existing';
  document.getElementById('staffPassword').required = false;
  document.getElementById('staffLevel').value = user.level || 'Staff';
  document.getElementById('staffRole').value = user.role || 'Staff Pharmacist';
  document.getElementById('staffLicense').value = user.prcLicense || '';
  document.getElementById('staffPhone').value = user.phone || '';
  document.getElementById('staffStatus').value = user.status || 'Active';

  // Set user permissions
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  document.querySelectorAll('.perm-checkbox').forEach(cb => {
    cb.checked = perms.includes(cb.value);
  });

  handleStaffLevelChange();

  modal.classList.add('active');
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.closeStaffModal = function() {
  const modal = document.getElementById('staffModal');
  if (modal) modal.classList.remove('active');
};

window.handleStaffLevelChange = function() {
  const level = document.getElementById('staffLevel').value;
  const adminNotice = document.getElementById('adminNoticePerms');
  const checkboxes = document.querySelectorAll('.perm-checkbox');

  if (level === 'Owner' || level === 'Admin') {
    checkboxes.forEach(cb => {
      cb.checked = true;
    });
    if (adminNotice) adminNotice.style.display = 'block';
  } else {
    if (adminNotice) adminNotice.style.display = 'none';
  }
};

window.applyRolePermissionPreset = function() {
  const role = document.getElementById('staffRole').value;
  const level = document.getElementById('staffLevel').value;

  if (level === 'Owner' || level === 'Admin') {
    window.toggleAllPermissions(true);
    return;
  }

  const defaultPerms = window.authStore.getDefaultPermissionsForRole(role, level);
  document.querySelectorAll('.perm-checkbox').forEach(cb => {
    cb.checked = defaultPerms.includes(cb.value);
  });
};

window.toggleAllPermissions = function(select) {
  document.querySelectorAll('.perm-checkbox').forEach(cb => {
    cb.checked = !!select;
  });
};

window.handleSaveStaffAccount = function(e) {
  e.preventDefault();

  const id = document.getElementById('staffUserId').value;
  const fullName = document.getElementById('staffFullName').value.trim();
  const username = document.getElementById('staffUsername').value.trim().toLowerCase();
  const password = document.getElementById('staffPassword').value;
  const level = document.getElementById('staffLevel').value;
  const role = document.getElementById('staffRole').value;
  const prcLicense = document.getElementById('staffLicense').value.trim();
  const phone = document.getElementById('staffPhone').value.trim();
  const status = document.getElementById('staffStatus').value;

  // Gather checked permissions
  const selectedPermissions = [];
  document.querySelectorAll('.perm-checkbox:checked').forEach(cb => {
    selectedPermissions.push(cb.value);
  });

  const finalPermissions = (level === 'Owner' || level === 'Admin')
    ? ['home', 'dashboard', 'transactions', 'reports', 'inventory', 'staff', 'cashdrawer', 'settings']
    : selectedPermissions;

  if (!id && !password) {
    alert('Please provide a password for the new staff account.');
    return;
  }

  try {
    if (id) {
      const updates = {
        fullName,
        username,
        level,
        role,
        prcLicense: prcLicense || '-',
        phone: phone || '-',
        status,
        permissions: finalPermissions
      };
      if (password) {
        updates.password = password;
      }
      window.authStore.updateUser(id, updates);
    } else {
      window.authStore.addUser({
        fullName,
        username,
        password,
        level,
        role,
        prcLicense: prcLicense || '-',
        phone: phone || '-',
        status,
        permissions: finalPermissions
      });
    }

    window.closeStaffModal();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      renderStaffView(mainContent);
    }
  } catch (err) {
    alert(err.message || 'Error saving staff account.');
  }
};

window.confirmDeleteStaff = function(id, name) {
  if (confirm(`Are you sure you want to delete the staff account for "${name}"?\nThis action cannot be undone.`)) {
    try {
      window.authStore.deleteUser(id);
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        renderStaffView(mainContent);
      }
    } catch (err) {
      alert(err.message || 'Cannot delete user account.');
    }
  }
};
