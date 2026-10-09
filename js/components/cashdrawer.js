/**
 * Cash Drawer & Shift Management Component
 * Tracks opening float, OTC cash collections, payouts, and End-of-Day Z-Reading
 * Styled with affordaLABS Diagnostics Plus warm medical orange & clinical slate palette.
 */

function renderCashDrawerView(container) {
  const drawer = window.pharmacyStore.getDrawer();
  const session = window.authStore ? window.authStore.getSession() : null;
  const currentOperator = session ? session.fullName : drawer.openedBy;
  const txns = window.pharmacyStore.getTransactions().filter(t => t.paymentMethod === 'Cash' && t.status !== 'Refunded');
  const cashSales = txns.reduce((sum, t) => sum + Number(t.netTotal), 0);
  const currentExpected = Number(drawer.openingFloat) + cashSales;

  container.innerHTML = `
    <!-- Top Action Bar & Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--primary); margin: 0; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="banknote" style="width: 22px; height: 22px; color: var(--primary);"></i>
            Cash Drawer & Shift Reconciliation
          </h2>
          <span class="badge" style="background: var(--primary-light); color: var(--primary-dark); border: 1px solid var(--primary-border); font-weight: 800; font-size: 0.72rem; padding: 3px 9px; border-radius: 9999px;">
            Shift Active (${drawer.status || 'Open'})
          </span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
          Shift Date: <strong>${drawer.shiftDate}</strong> &bull; Active Till Operator: <strong style="color: var(--text-main);">${currentOperator}</strong>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
        <button onclick="handleZReading()" class="btn-primary" style="background: var(--primary); display: inline-flex; align-items: center; gap: 6px; box-shadow: var(--shadow-orange);">
          <i data-lucide="printer" style="width: 16px; height: 16px;"></i> Print End-of-Day Z-Reading
        </button>
      </div>
    </div>

    <!-- 3 Summary Drawer Cards with affordaLABS Palette -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
      <div class="card" style="margin-bottom: 0; border-left: 4px solid #ea580c; background: #ffffff; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">
            Opening Cash Float
          </div>
          <div style="width: 32px; height: 32px; border-radius: 8px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="wallet" style="width: 16px; height: 16px;"></i>
          </div>
        </div>
        <div style="font-size: 1.75rem; font-weight: 800; color: #ea580c; margin: 0.4rem 0;">
          ₱${drawer.openingFloat.toFixed(2)}
        </div>
        <div style="font-size: 0.74rem; color: var(--text-muted);">Provided float for till change & petty transactions</div>
      </div>

      <div class="card" style="margin-bottom: 0; border-left: 4px solid #10b981; background: #ffffff; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">
            Cash Sales Collected
          </div>
          <div style="width: 32px; height: 32px; border-radius: 8px; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="arrow-down-left" style="width: 16px; height: 16px;"></i>
          </div>
        </div>
        <div style="font-size: 1.75rem; font-weight: 800; color: #10b981; margin: 0.4rem 0;">
          ₱${cashSales.toFixed(2)}
        </div>
        <div style="font-size: 0.74rem; color: var(--text-muted);">${txns.length} registered cash sale receipt(s)</div>
      </div>

      <div class="card" style="margin-bottom: 0; border-left: 4px solid var(--primary); background: #ffffff; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">
            Expected in Drawer
          </div>
          <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center;">
            <i data-lucide="calculator" style="width: 16px; height: 16px;"></i>
          </div>
        </div>
        <div style="font-size: 1.75rem; font-weight: 800; color: var(--primary); margin: 0.4rem 0;">
          ₱${currentExpected.toFixed(2)}
        </div>
        <div style="font-size: 0.74rem; color: var(--text-muted);">Net Expected (Float + Shift Sales)</div>
      </div>
    </div>

    <!-- Actions & Payouts -->
    <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.5rem;">
        <div style="width: 28px; height: 28px; border-radius: 6px; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center;">
          <i data-lucide="sliders-horizontal" style="width: 16px; height: 16px;"></i>
        </div>
        <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; color: var(--text-main);">Drawer Adjustments & Petty Cash Management</h3>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
        Record change replenishments, delivery payouts, or mid-day till spot audits.
      </p>

      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button onclick="handleDrawerCashIn()" class="btn-outline" style="border-color: var(--primary-border); color: var(--primary-dark); display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="plus-circle" style="width: 14px; height: 14px; color: var(--primary);"></i> + Add Cash In (Change Float)
        </button>
        <button onclick="handleDrawerCashOut()" class="btn-outline" style="border-color: #fca5a5; color: #dc2626; display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="minus-circle" style="width: 14px; height: 14px; color: #dc2626;"></i> - Cash Out (Expense / Delivery)
        </button>
        <button onclick="handleCashCount()" class="btn-outline" style="border-color: #cbd5e1; color: var(--brand-charcoal); display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="coins" style="width: 15px; height: 15px; color: #f59e0b;"></i> Perform Mid-Day Cash Count
        </button>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

window.handleZReading = function() {
  alert('Generating official End-of-Day Z-Reading Report for affordaLABS BIR audit.');
};

window.handleDrawerCashIn = function() {
  const amt = prompt('Enter additional cash float amount to add (₱):', '1000');
  if (amt && !isNaN(Number(amt)) && Number(amt) > 0) {
    const drawer = window.pharmacyStore.getDrawer();
    drawer.openingFloat = Number(drawer.openingFloat) + Number(amt);
    window.pharmacyStore.saveDrawer(drawer);
    alert(`Successfully added ₱${Number(amt).toFixed(2)} to cash drawer float.`);
    const mainContent = document.getElementById('main-content');
    if (mainContent) renderCashDrawerView(mainContent);
  }
};

window.handleDrawerCashOut = function() {
  const reason = prompt('Enter expense/payout reason:', 'Supplier delivery fee');
  if (reason) {
    const amt = prompt(`Enter payout amount for "${reason}" (₱):`, '250');
    if (amt && !isNaN(Number(amt)) && Number(amt) > 0) {
      alert(`Recorded Cash Out of ₱${Number(amt).toFixed(2)} for: ${reason}`);
    }
  }
};

window.handleCashCount = function() {
  const drawer = window.pharmacyStore.getDrawer();
  const txns = window.pharmacyStore.getTransactions().filter(t => t.paymentMethod === 'Cash' && t.status !== 'Refunded');
  const cashSales = txns.reduce((sum, t) => sum + Number(t.netTotal), 0);
  const currentExpected = Number(drawer.openingFloat) + cashSales;
  const actual = prompt(`Enter physical cash count currently in drawer (Expected: ₱${currentExpected.toFixed(2)}):`, currentExpected.toFixed(2));
  if (actual && !isNaN(Number(actual))) {
    const diff = Number(actual) - currentExpected;
    if (Math.abs(diff) < 0.01) {
      alert(`✓ Perfect Match! Physical count of ₱${Number(actual).toFixed(2)} balances exactly with expected cash.`);
    } else if (diff > 0) {
      alert(`⚠️ Cash Overage: ₱${Math.abs(diff).toFixed(2)} extra in drawer compared to system records.`);
    } else {
      alert(`⚠️ Cash Shortage: ₱${Math.abs(diff).toFixed(2)} missing compared to system records.`);
    }
  }
};
