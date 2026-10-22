/**
 * Login Page Component
 * Renders a full-screen login overlay before the app is accessible.
 */

function renderLoginPage() {
  const overlay = document.getElementById('login-overlay');
  if (!overlay) return;

  const users = window.authStore ? window.authStore.getLoginUsers() : [];

  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  overlay.style.transform = 'scale(1)';

  overlay.innerHTML = `
    <div class="login-bg">
      <!-- Animated ambient orbs -->
      <div class="login-orb login-orb-1"></div>
      <div class="login-orb login-orb-2"></div>

      <div class="login-card">
        <!-- Brand -->
        <div class="login-brand">
          <img src="assets/affordameds-logo.png" alt="affordaMEDS" class="login-logo" />
          <div class="login-tagline">PHARMACY INVENTORY SYSTEM</div>
        </div>

        <div class="login-divider"></div>

        <h2 class="login-title">Welcome back</h2>
        <p class="login-subtitle">Sign in to your account to access the system</p>

        <!-- Error message -->
        <div id="loginError" class="login-error" style="display:none;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span id="loginErrorMsg">Invalid username or password.</span>
        </div>

        <!-- Form -->
        <form id="loginForm" onsubmit="handleLogin(event)" autocomplete="off">
          <div class="login-field">
            <label class="login-label" for="loginUsername">Username</label>
            <div class="login-input-wrap">
              <svg class="login-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input id="loginUsername" type="text" class="login-input" placeholder="e.g. andrew, lionel, sarah"
                autocomplete="username" required />
            </div>
          </div>

          <div class="login-field">
            <label class="login-label" for="loginPassword">Password</label>
            <div class="login-input-wrap">
              <svg class="login-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input id="loginPassword" type="password" class="login-input" placeholder="Enter your password"
                autocomplete="current-password" required />
              <button type="button" class="login-eye-btn" onclick="togglePasswordVisibility()" title="Show/hide password">
                <svg id="eyeIcon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" class="login-btn" id="loginBtn">
            <span id="loginBtnText">Sign In</span>
            <svg id="loginBtnIcon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </form>

        <!-- Quick Select Staff Accounts -->
        <div class="login-demo">
          <div class="login-demo-label">Select user account to sign in:</div>
          <div class="login-demo-accounts" id="loginPillsContainer">
            ${renderLoginPills(users)}
          </div>
        </div>

        <div class="login-footer-note">
          affordaLABS Diagnostics Plus &bull; Pampang, Angeles City
        </div>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Auto-focus username field
  setTimeout(() => {
    const el = document.getElementById('loginUsername');
    if (el) el.focus();
  }, 100);

  // Load the account names from the central database so every PC shows the same list
  if (window.authStore) {
    window.authStore.refreshLoginUsers().then(list => {
      const box = document.getElementById('loginPillsContainer');
      if (box) {
        box.innerHTML = renderLoginPills(list);
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    });
  }
}

function renderLoginPills(users) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return (users || []).map(u => `
    <button type="button" class="login-demo-pill" onclick="fillDemo('${esc(u.username)}')" title="${esc(u.fullName)} (${esc(u.role)})" style="display: inline-flex; align-items: center; gap: 4px;">
      <i data-lucide="user" style="width: 14px; height: 14px;"></i> <strong>${esc(u.username)}</strong>
    </button>
  `).join('');
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const btnText = document.getElementById('loginBtnText');
  const error = document.getElementById('loginError');

  // Loading state
  btn.disabled = true;
  btnText.textContent = 'Signing in…';
  error.style.display = 'none';

  // Verify against the central database, then load the shared data before opening the app
  (async () => {
    let session = null;
    let message = 'Invalid username or password.';
    try {
      session = await window.authStore.login(username, password);
    } catch (err) {
      message = err.message || message;
    }

    if (session) {
      btnText.textContent = 'Loading shared data…';
      try {
        await window.pharmacyStore.startSync();
      } catch (e) { /* the app still opens with whatever is cached; sync keeps retrying */ }

      // Success – animate out overlay
      btnText.textContent = `✓ Welcome, ${session.firstName}!`;
      const overlay = document.getElementById('login-overlay');
      overlay.style.opacity = '0';
      overlay.style.transform = 'scale(1.03)';
      overlay.style.transition = 'opacity 0.35s ease, transform 0.35s ease';

      setTimeout(() => {
        overlay.style.display = 'none';
        // Boot / update the main app with current user
        if (window.bootApp) {
          window.bootApp();
        } else if (window.appRouter) {
          window.updateUserProfileUI();
          window.appRouter.renderCurrent();
        }
        if (session.mustChange) {
          setTimeout(() => showDefaultPasswordModal(), 400);
        }
      }, 350);
    } else {
      // Failure
      btn.disabled = false;
      btnText.textContent = 'Sign In';
      document.getElementById('loginErrorMsg').textContent = message;
      error.style.display = 'flex';
      document.getElementById('loginPassword').value = '';
      document.getElementById('loginPassword').focus();

      // Shake animation
      const card = document.querySelector('.login-card');
      if (card) {
        card.classList.add('login-shake');
        setTimeout(() => card.classList.remove('login-shake'), 500);
      }
    }
  })();
}

function handleLogout() {
  if (confirm('Are you sure you want to end your shift and log out?')) {
    window.authStore.logout();
    renderLoginPage();
  }
}

function togglePasswordVisibility() {
  const input = document.getElementById('loginPassword');
  const icon = document.getElementById('eyeIcon');
  if (!input || !icon) return;

  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>`;
  } else {
    input.type = 'password';
    icon.innerHTML = `
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
      <circle cx="12" cy="12" r="3"/>`;
  }
}

function fillDemo(username) {
  const u = document.getElementById('loginUsername');
  const p = document.getElementById('loginPassword');
  if (u && p) {
    u.value = username;
    p.value = '';
    p.focus();
  }
}

function showDefaultPasswordModal() {
  const existing = document.getElementById('securityNoticeOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'securityNoticeOverlay';
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 25000; opacity: 0; transition: opacity 0.25s ease; padding: 1rem;';
  
  overlay.innerHTML = `
    <div style="background: var(--bg-card, #ffffff); width: 100%; max-width: 440px; border-radius: 22px; padding: 2rem 1.8rem 1.6rem; text-align: center; box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color, rgba(226, 232, 240, 0.8)); transform: translateY(16px) scale(0.96); transition: transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.2);">
      
      <div style="width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 1.25rem; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 24px rgba(245, 158, 11, 0.35);">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>

      <div style="display: inline-flex; align-items: center; gap: 6px; padding: 0.3rem 0.75rem; background: #fef3c7; border-radius: 9999px; margin-bottom: 0.85rem;">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: #d97706;"></span>
        <span style="font-size: 0.72rem; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em;">Security Notice</span>
      </div>

      <h3 style="margin: 0 0 0.5rem; font-size: 1.3rem; font-weight: 800; color: var(--brand-charcoal, #1e293b); letter-spacing: -0.02em;">
        Default Password In Use
      </h3>
      
      <p style="margin: 0 0 1.4rem; font-size: 0.88rem; line-height: 1.5; color: var(--text-muted, #64748b);">
        This account is still using its default password. For the security of your pharmacy records and cash register, please update it now.
      </p>

      <div style="background: #f8fafc; border-radius: 12px; padding: 0.85rem 1rem; margin-bottom: 1.5rem; text-align: left; border: 1px solid #e2e8f0; display: flex; gap: 10px; align-items: flex-start;">
        <span style="font-size: 1rem;">💡</span>
        <div style="font-size: 0.78rem; color: #475569; line-height: 1.45;">
          You can change it anytime in <strong style="color: #0f172a;">Settings &gt; Account Security</strong>.
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem;">
        <button id="secNoticeLaterBtn" type="button" style="flex: 1; padding: 0.75rem 1rem; border: 1px solid #cbd5e1; background: transparent; color: var(--text-muted, #64748b); font-weight: 600; border-radius: 12px; font-size: 0.88rem; cursor: pointer; transition: all 0.15s ease;">
          Remind Later
        </button>
        <button id="secNoticeChangeBtn" type="button" style="flex: 1.3; padding: 0.75rem 1rem; border: none; background: linear-gradient(135deg, #ff6b35, #e8590c); color: #ffffff; font-weight: 700; border-radius: 12px; font-size: 0.88rem; cursor: pointer; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.35); transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span>Change Now</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

    </div>`;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.style.opacity = '0';
    const card = overlay.firstElementChild;
    if (card) card.style.transform = 'translateY(16px) scale(0.96)';
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  
  const laterBtn = overlay.querySelector('#secNoticeLaterBtn');
  if (laterBtn) {
    laterBtn.addEventListener('click', close);
    laterBtn.addEventListener('mouseenter', () => laterBtn.style.background = '#f1f5f9');
    laterBtn.addEventListener('mouseleave', () => laterBtn.style.background = 'transparent');
  }

  const changeBtn = overlay.querySelector('#secNoticeChangeBtn');
  if (changeBtn) {
    changeBtn.addEventListener('click', () => {
      close();
      if (window.appRouter) {
        window.appRouter.navigate('settings');
        setTimeout(() => {
          const passCard = document.querySelector('.card:has(#settingsCurrentPassword)');
          if (passCard) {
            passCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const currInput = document.getElementById('settingsCurrentPassword');
            if (currInput) currInput.focus();
          }
        }, 300);
      }
    });
  }

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    const card = overlay.firstElementChild;
    if (card) card.style.transform = 'translateY(0) scale(1)';
  });
}

