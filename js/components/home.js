/**
 * Home View Component
 * Matches Image 1 layout with pharmacy branding and onboarding
 */

function renderHomeView(container) {
  const settings = window.pharmacyStore.getSettings();
  const metrics = window.pharmacyStore.getDashboardMetrics();

  container.innerHTML = `
    <!-- Top Hero Banner -->
    <div style="background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); border-radius: var(--radius-lg); padding: 2.2rem 2.5rem; color: white; margin-bottom: 1.5rem; position: relative; overflow: hidden; box-shadow: var(--shadow-lg); border: 1px solid rgba(255, 90, 0, 0.25);">
      <!-- Glowing warm brand ambient backlight -->
      <div style="position: absolute; right: -60px; top: -60px; width: 320px; height: 320px; background: radial-gradient(circle, rgba(255, 90, 0, 0.35) 0%, rgba(255, 90, 0, 0) 70%); border-radius: 50%; pointer-events: none;"></div>

      <div style="max-width: 65%; position: relative; z-index: 2;">
        <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255, 90, 0, 0.15); border: 1px solid rgba(255, 90, 0, 0.4); padding: 5px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; color: #FFA066; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.9rem;">
          <span>🩺</span> affordaLABS DIAGNOSTICS PLUS • PHARMACY & CLINIC POS
        </div>
        <h1 style="font-size: 2.1rem; font-weight: 900; line-height: 1.2; margin-bottom: 0.85rem; letter-spacing: -0.02em;">
          Welcome to <span style="color: #FF5A00;">afforda</span><span style="font-weight: 300; -webkit-text-stroke: 1.5px #FF5A00; color: transparent;">LABS</span>
        </h1>
        <p style="font-size: 0.94rem; color: #CBD5E1; line-height: 1.6; margin-bottom: 1.5rem;">
          Unified Pharmacy Point-of-Sale, Drug Formulary, and Clinical Inventory System. Engineered for Philippine regulatory compliance with generic mapping (RA 6675), automated 20% Senior/PWD discounts, batch lot expiry monitoring, and BIR official receipts.
        </p>
        <div style="display: flex; gap: 0.85rem; flex-wrap: wrap;">
          <button onclick="window.appRouter.navigate('pos')" style="background: var(--primary-gradient); color: white; border: none; padding: 0.7rem 1.4rem; border-radius: var(--radius-sm); font-weight: 700; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 14px rgba(255, 90, 0, 0.4); transition: transform 0.15s ease;">
            <span>⚡ Open Counter POS (F2)</span>
          </button>
          <button onclick="window.appRouter.navigate('inventory')" style="background: rgba(255,255,255,0.08); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 0.7rem 1.4rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; backdrop-filter: blur(4px);">
            <span>📦 Manage Formulary & Batches</span>
          </button>
        </div>
      </div>

      <!-- Right illustration placeholder / decorative badges -->
      <div style="position: absolute; right: 2.2rem; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 0.9rem; z-index: 2;" class="hide-mobile">
        <div style="background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px); padding: 1rem 1.4rem; border-radius: 14px; border: 1px solid rgba(255, 90, 0, 0.3); text-align: right; box-shadow: var(--shadow-md);">
          <div style="font-size: 0.72rem; color: #94A3B8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Pharmacist on Duty</div>
          <div style="font-size: 1.05rem; font-weight: 800; color: #FFFFFF; margin-top: 2px;">${settings.pharmacistInCharge}</div>
          <div style="font-size: 0.75rem; color: #FFA066; font-weight: 600; margin-top: 2px;">License: ${settings.prcLicense} (Active)</div>
        </div>
        <div style="background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px); padding: 1rem 1.4rem; border-radius: 14px; border: 1px solid rgba(255, 90, 0, 0.3); text-align: right; box-shadow: var(--shadow-md);">
          <div style="font-size: 0.72rem; color: #94A3B8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Today's Net Dispensed Sales</div>
          <div style="font-size: 1.45rem; font-weight: 900; color: #FF7828; margin-top: 2px;">₱${metrics.netSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
    </div>

    <!-- Quick Notification Alerts -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
      <!-- Interactive Pharmacy Tutorial Banner -->
      <div style="background: #ffffff; border-left: 4px solid var(--primary); border-radius: var(--radius-md); padding: 1.1rem 1.25rem; display: flex; align-items: flex-start; justify-content: space-between; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); border-left-width: 4px;">
        <div style="display: flex; gap: 0.85rem;">
          <div style="font-size: 1.3rem; color: var(--primary);">💊</div>
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">
              Pharmacist Quick-Start Tutorial
            </h4>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem;">
              Learn how to dispense prescription drugs (Rx), record lot expiry, and print BIR-compliant receipts.
            </p>
            <button onclick="window.appRouter.navigate('pos')" style="background: var(--primary); color: white; border: none; padding: 0.45rem 1rem; border-radius: var(--radius-sm); font-size: 0.78rem; font-weight: 600; cursor: pointer; box-shadow: 0 2px 5px rgba(255, 90, 0, 0.25);">
              Try POS Practice Mode
            </button>
          </div>
        </div>
      </div>

      <!-- Online Orders & Delivery Integration -->
      <div style="background: #ffffff; border-left: 4px solid #10b981; border-radius: var(--radius-md); padding: 1.1rem 1.25rem; display: flex; align-items: flex-start; justify-content: space-between; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); border-left-width: 4px;">
        <div style="display: flex; gap: 0.85rem;">
          <div style="font-size: 1.3rem; color: #10b981;">🛵</div>
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">
              GrabMart & FoodPanda Pharmacy Delivery
            </h4>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem;">
              Branch online store is connected. Orders will automatically reflect in Transactions and deduct live stock.
            </p>
            <button onclick="window.appRouter.navigate('transactions')" style="background: #10b981; color: white; border: none; padding: 0.45rem 1rem; border-radius: var(--radius-sm); font-size: 0.78rem; font-weight: 600; cursor: pointer;">
              View Online Orders
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Collapsible Accordion Sections -->
    <div style="display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1.5rem;">
      <!-- Section 1: Onboarding -->
      <div class="card" style="margin-bottom: 0; padding: 1.1rem 1.3rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="toggleAccordion('onboarding-panel')">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <span style="background: var(--primary-light); color: var(--primary-dark); width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.82rem; border: 1px solid var(--primary-border);">1</span>
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">Pharmacy Onboarding Checklist</h3>
          </div>
          <span id="onboarding-chevron" style="color: var(--text-muted); font-size: 0.9rem;">▼</span>
        </div>
        <div id="onboarding-panel" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-light); font-size: 0.85rem;">
          <div style="display: flex; flex-direction: column; gap: 0.65rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem; color: #10b981;">
              <span>✓</span> <strong style="color: var(--text-main);">Store & Branch Profile:</strong> Configured (${settings.pharmacyName} - ${settings.branch})
            </div>
            <div style="display: flex; align-items: center; gap: 0.6rem; color: #10b981;">
              <span>✓</span> <strong style="color: var(--text-main);">Medicine Formulary Seeded:</strong> ${metrics.totalSKUs} core medicines loaded with generic names & batch lot numbers
            </div>
            <div style="display: flex; align-items: center; gap: 0.6rem; color: var(--primary);">
              <span>➜</span> <strong style="color: var(--text-main);">Senior Citizen & PWD Discount Rate:</strong> 20% discount + VAT Exemption active
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: Important Compliance Links -->
      <div class="card" style="margin-bottom: 0; padding: 1.1rem 1.3rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="toggleAccordion('links-panel')">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <span style="background: #fef3c7; color: #d97706; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.82rem;">2</span>
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">Important Pharmacy Links & Regulatory Tools</h3>
          </div>
          <span id="links-chevron" style="color: var(--text-muted); font-size: 0.9rem;">▼</span>
        </div>
        <div id="links-panel" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-light); font-size: 0.85rem; display: none;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem;">
            <a href="https://ww2.fda.gov.ph/" target="_blank" style="padding: 0.6rem 0.8rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); text-decoration: none; color: var(--text-main); font-weight: 500; display: flex; align-items: center; gap: 0.5rem; background: #fafafa;">
              <span>🏛️</span> Philippine FDA Portal
            </a>
            <a href="https://www.bir.gov.ph/" target="_blank" style="padding: 0.6rem 0.8rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); text-decoration: none; color: var(--text-main); font-weight: 500; display: flex; align-items: center; gap: 0.5rem; background: #fafafa;">
              <span>📑</span> BIR Official Receipts Guidelines
            </a>
            <div onclick="window.appRouter.navigate('reports')" style="padding: 0.6rem 0.8rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; color: var(--text-main); font-weight: 500; display: flex; align-items: center; gap: 0.5rem; background: #fafafa;">
              <span>📋</span> Senior / PWD Discount Record Log
            </div>
            <div onclick="window.appRouter.navigate('inventory')" style="padding: 0.6rem 0.8rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; color: var(--text-main); font-weight: 500; display: flex; align-items: center; gap: 0.5rem; background: #fafafa;">
              <span>⚠️</span> Drug Expiry Risk Monitoring
            </div>
          </div>
        </div>
      </div>

      <!-- Section 3: Branch & Server Connection -->
      <div class="card" style="margin-bottom: 0; padding: 1.1rem 1.3rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="toggleAccordion('connection-panel')">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <span style="background: #dcfce7; color: #15803d; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.82rem;">3</span>
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">Branch & Cloud Database Sync</h3>
          </div>
          <span id="connection-chevron" style="color: var(--text-muted); font-size: 0.9rem;">▼</span>
        </div>
        <div id="connection-panel" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-light); font-size: 0.85rem; display: none;">
          <p style="color: var(--text-muted); margin-bottom: 0.5rem;">
            Cloud synchronization is active. All terminal sales, stock ins, and batch updates are stored locally and mirrored instantly.
          </p>
          <div style="display: flex; gap: 1rem; font-size: 0.82rem;">
            <div><strong>Terminal:</strong> POS-01 (Counter Main)</div>
            <div><strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">● Online</span></div>
            <div><strong>Local Storage:</strong> Ready</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.toggleAccordion = function(panelId) {
  const panel = document.getElementById(panelId);
  const chevron = document.getElementById(panelId.replace('-panel', '-chevron'));
  if (panel) {
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      if (chevron) chevron.textContent = '▲';
    } else {
      panel.style.display = 'none';
      if (chevron) chevron.textContent = '▼';
    }
  }
};
