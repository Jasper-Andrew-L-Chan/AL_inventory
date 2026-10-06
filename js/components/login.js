/**
 * Login Page Component
 * Renders a full-screen login overlay before the app is accessible.
 */

function renderLoginPage() {
  const overlay = document.getElementById('login-overlay');
  if (!overlay) return;

  const users = window.authStore ? window.authStore.getUsers() : [];

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
          <div class="login-demo-accounts">
            ${users.map(u => `
              <button type="button" class="login-demo-pill" onclick="fillDemo('${u.username}','${u.password}')" title="${u.fullName} (${u.role})" style="display: inline-flex; align-items: center; gap: 4px;">
                <i data-lucide="user" style="width: 14px; height: 14px;"></i> <strong>${u.username}</strong>
              </button>
            `).join('')}
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

  // Smooth short delay for UX
  setTimeout(() => {
    const session = window.authStore.login(username, password);
    if (session) {
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
      }, 350);
    } else {
      // Failure
      btn.disabled = false;
      btnText.textContent = 'Sign In';
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
  }, 400);
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

function fillDemo(username, password) {
  const u = document.getElementById('loginUsername');
  const p = document.getElementById('loginPassword');
  if (u && p) {
    u.value = username;
    p.value = password;
    p.focus();
  }
}
