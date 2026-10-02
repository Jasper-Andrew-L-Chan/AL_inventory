/**
 * Cash Drawer & Shift Management Component
 * Tracks opening float, OTC cash collections, payouts, and End-of-Day Z-Reading
 */

function renderCashDrawerView(container) {
  const drawer = window.pharmacyStore.getDrawer();
  const session = window.authStore ? window.authStore.getSession() : null;
  const currentOperator = session ? session.fullName : drawer.openedBy;
  const txns = window.pharmacyStore.getTransactions().filter(t => t.paymentMethod === 'Cash' && t.status !== 'Refunded');
  const cashSales = txns.reduce((sum, t) => sum + Number(t.netTotal), 0);
  const currentExpected = Number(drawer.openingFloat) + cashSales;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h2 style="font-size: 1.35rem; font-weight: 700; color: #0d9488;">Cash Drawer & Shift Reconciliation</h2>
        <div style="font-size: 0.8rem; color: var(--text-muted);">Current Shift: ${drawer.shiftDate} (Operator: <strong style="color: var(--text-main);">${currentOperator}</strong>)</div>
      </div>
      <button onclick="handleZReading()" class="btn-primary" style="background: #e11d48;">
        🧾 Print End-of-Day Z-Reading
      </button>
    </div>

    <!-- 3 Summary Drawer Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
      <div class="card" style="margin-bottom: 0; border-left: 4px solid #028090;">
        <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">
          Opening Cash Float
        </div>
        <div style="font-size: 1.6rem; font-weight: 800; color: #028090; margin: 0.3rem 0;">
          ₱${drawer.openingFloat.toFixed(2)}
        </div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">Petty cash provided at shift start</div>
      </div>

      <div class="card" style="margin-bottom: 0; border-left: 4px solid #10b981;">
        <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">
          Cash Sales Collected
        </div>
        <div style="font-size: 1.6rem; font-weight: 800; color: #10b981; margin: 0.3rem 0;">
          ₱${cashSales.toFixed(2)}
        </div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${txns.length} cash transaction(s) today</div>
      </div>

      <div class="card" style="margin-bottom: 0; border-left: 4px solid #f59e0b;">
        <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">
          Expected Total in Drawer
        </div>
        <div style="font-size: 1.6rem; font-weight: 800; color: #d97706; margin: 0.3rem 0;">
          ₱${currentExpected.toFixed(2)}
        </div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">Float + Cash Sales</div>
      </div>
    </div>

    <!-- Actions & Payouts -->
    <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem;">
      <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 1rem;">Drawer Adjustments & Petty Cash Out</h3>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button onclick="alert('Cash In voucher modal')" class="btn-outline">
          + Add Cash In (Additional Float)
        </button>
        <button onclick="alert('Petty Cash Out modal')" class="btn-outline">
          - Cash Out (Store Expense / Delivery)
        </button>
        <button onclick="alert('Cash Count Verification modal')" class="btn-outline">
          🪙 Perform Mid-Day Cash Count
        </button>
      </div>
    </div>
  `;
}

window.handleZReading = function() {
  alert('Generating official End-of-Day Z-Reading Report for BIR store audit.');
};
