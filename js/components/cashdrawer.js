/**
 * Cash Drawer & Shift Management Component
 * Tracks opening float, OTC cash collections, payouts, and End-of-Day Z-Reading
 * Styled with affordaLABS Diagnostics Plus warm medical orange & clinical slate palette.
 */

function getTxnTimestamp(t) {
  if (t && Number(t._ord) > 0) return Number(t._ord);
  if (t && typeof t.id === 'string') {
    const m = /^txn-(\d+)/.exec(t.id);
    if (m) return Number(m[1]);
  }
  return 0;
}

function getActiveShiftCashTxns(drawer) {
  const excluded = new Set(Array.isArray(drawer.excludedTxnIds) ? drawer.excludedTxnIds : []);
  const resetAt = Number(drawer.resetAt || 0);
  return window.pharmacyStore.getTransactions().filter(t => {
    if (t.paymentMethod !== 'Cash' || t.status === 'Refunded') return false;
    if (excluded.has(t.id)) return false;
    if (resetAt > 0) {
      const ts = getTxnTimestamp(t);
      if (ts <= resetAt) return false;
    }
    return true;
  });
}

function renderCashDrawerView(container) {
  const drawer = window.pharmacyStore.getDrawer();
  const session = window.authStore ? window.authStore.getSession() : null;
  const currentOperator = session ? session.fullName : drawer.openedBy;

  // One-time automatic clean so old demo/stale numbers (₱3000 / ₱2430.08) start fresh at ₱0.00
  if (!drawer.v2FreshClean) {
    drawer.openingFloat = 0;
    drawer.cashOutTotal = 0;
    drawer.adjustments = [];
    drawer.excludedTxnIds = [];
    drawer.resetAt = Date.now();
    drawer.shiftDate = new Date().toISOString().split('T')[0];
    if (session && session.fullName) drawer.openedBy = session.fullName;
    drawer.v2FreshClean = true;
    window.pharmacyStore.saveDrawer(drawer);
  }

  const txns = getActiveShiftCashTxns(drawer);
  const cashSales = txns.reduce((sum, t) => sum + Number(t.netTotal || 0), 0);
  const openingFloatVal = Number(drawer.openingFloat || 0);
  const adjustments = Array.isArray(drawer.adjustments) ? drawer.adjustments : [];
  const cashOutTotal = adjustments
    .filter(a => a.type === 'out')
    .reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const currentExpected = Math.max(0, openingFloatVal + cashSales - cashOutTotal);

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
        <button onclick="handleResetCashDrawer()" class="btn-outline" style="border-color: #fca5a5; color: #ef4444; background: rgba(239, 68, 68, 0.06); display: inline-flex; align-items: center; gap: 6px; font-weight: 700;" title="Clear all drawer numbers and shift records back to ₱0.00">
          <i data-lucide="rotate-ccw" style="width: 15px; height: 15px; color: #ef4444;"></i> Start Fresh (Clear All)
        </button>
        <button onclick="handleZReading()" class="btn-primary" style="background: var(--primary); display: inline-flex; align-items: center; gap: 6px; box-shadow: var(--shadow-orange);">
          <i data-lucide="printer" style="width: 16px; height: 16px;"></i> Print End-of-Day Z-Reading
        </button>
      </div>
    </div>

    <!-- 3 Summary Drawer Cards with affordaLABS Palette -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
      <div class="card" style="margin-bottom: 0; border-left: 4px solid #ea580c; background: #ffffff; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 6px;">
            <span>Opening Cash Float</span>
            <span id="openingFloatSavedBadge" style="display: none; font-size: 0.68rem; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); padding: 1px 6px; border-radius: 9999px; text-transform: none; letter-spacing: 0;">✓ Updated</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${openingFloatVal > 0 ? `
              <button onclick="handleClearOpeningFloat()" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; border-radius: 6px; padding: 3px 8px; font-size: 0.7rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;" title="Reset Opening Cash Float to ₱0.00">
                <i data-lucide="x" style="width: 12px; height: 12px;"></i> Clear
              </button>
            ` : ''}
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="wallet" style="width: 16px; height: 16px;"></i>
            </div>
          </div>
        </div>
        <div id="openingFloatDisplay" style="font-size: 1.75rem; font-weight: 800; color: #ea580c; margin: 0.35rem 0 0.5rem 0;">
          ₱${openingFloatVal.toFixed(2)}
        </div>
        <form onsubmit="handleSetOpeningFloat(event)" style="display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.45rem;">
          <div class="opening-float-input-wrap" style="position: relative; flex: 1; display: flex; align-items: center;">
            <span style="position: absolute; left: 10px; font-weight: 700; font-size: 0.85rem; color: var(--text-muted); pointer-events: none;">₱</span>
            <input
              type="number"
              id="openingFloatInput"
              step="0.01"
              min="0"
              value="${openingFloatVal > 0 ? openingFloatVal.toFixed(2) : ''}"
              placeholder="0.00"
              aria-label="Opening Cash Float Amount"
              class="opening-float-input"
              style="width: 100%; padding: 0.42rem 0.6rem 0.42rem 1.65rem; font-size: 0.85rem; font-weight: 700; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-app); color: var(--text-main); outline: none; transition: border-color 0.15s ease;"
              onfocus="this.style.borderColor='#ea580c'; this.select();"
              onblur="this.style.borderColor='var(--border-color)';"
            />
          </div>
          <button
            type="submit"
            class="btn-primary"
            style="background: #ea580c; border: none; color: #ffffff; padding: 0.44rem 0.75rem; font-size: 0.78rem; font-weight: 700; border-radius: 6px; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;"
            title="Save opening shift cash float"
          >
            <i data-lucide="check" style="width: 14px; height: 14px;"></i> Set Float
          </button>
        </form>
        <div style="font-size: 0.74rem; color: var(--text-muted);">Input starting cash float for the opening shift</div>
      </div>

      <div class="card" style="margin-bottom: 0; border-left: 4px solid #10b981; background: #ffffff; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">
            Cash Sales Collected
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${txns.length > 0 ? `
              <button onclick="handleClearShiftSales()" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; border-radius: 6px; padding: 3px 8px; font-size: 0.7rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;" title="Clear Cash Sales Collected back to ₱0.00">
                <i data-lucide="x" style="width: 12px; height: 12px;"></i> Clear
              </button>
            ` : ''}
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center;">
              <i data-lucide="arrow-down-left" style="width: 16px; height: 16px;"></i>
            </div>
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
        <div id="expectedInDrawerDisplay" style="font-size: 1.75rem; font-weight: 800; color: var(--primary); margin: 0.4rem 0;">
          ₱${currentExpected.toFixed(2)}
        </div>
        <div style="font-size: 0.74rem; color: var(--text-muted);">
          Net Expected (Float + Shift Sales${cashOutTotal > 0 ? ` - ₱${cashOutTotal.toFixed(2)} Cash Out` : ''})
        </div>
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
        Set your opening shift cash float, record change replenishments, delivery payouts, or clear all numbers to start a fresh shift.
      </p>

      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button onclick="handlePromptOpeningFloat()" class="btn-outline" style="border-color: #fdba74; color: #ea580c; display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="wallet" style="width: 14px; height: 14px; color: #ea580c;"></i> Set Opening Shift Float
        </button>
        <button onclick="handleDrawerCashIn()" class="btn-outline" style="border-color: var(--primary-border); color: var(--primary-dark); display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="plus-circle" style="width: 14px; height: 14px; color: var(--primary);"></i> + Add Cash In (Change Float)
        </button>
        <button onclick="handleDrawerCashOut()" class="btn-outline" style="border-color: #fca5a5; color: #dc2626; display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="minus-circle" style="width: 14px; height: 14px; color: #dc2626;"></i> - Cash Out (Expense / Delivery)
        </button>
        <button onclick="handleCashCount()" class="btn-outline" style="border-color: #cbd5e1; color: var(--brand-charcoal); display: inline-flex; align-items: center; gap: 6px;">
          <i data-lucide="coins" style="width: 15px; height: 15px; color: #f59e0b;"></i> Perform Mid-Day Cash Count
        </button>
        <button onclick="handleResetCashDrawer()" class="btn-outline" style="border-color: #fca5a5; color: #ef4444; display: inline-flex; align-items: center; gap: 6px; margin-left: auto;">
          <i data-lucide="trash-2" style="width: 14px; height: 14px; color: #ef4444;"></i> Clear All Numbers & Records
        </button>
      </div>
    </div>

    <!-- Active Shift Cash Records & Adjustments -->
    <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(16, 185, 129, 0.12); color: #10b981; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="receipt" style="width: 16px; height: 16px;"></i>
          </div>
          <div>
            <h3 style="font-size: 1.02rem; font-weight: 700; margin: 0; color: var(--text-main);">Current Shift Cash Records (${txns.length + adjustments.length})</h3>
            <p style="font-size: 0.76rem; color: var(--text-muted); margin: 0;">Manage or remove individual cash sale receipts and drawer adjustments in this shift.</p>
          </div>
        </div>
        ${(txns.length > 0 || adjustments.length > 0) ? `
          <button onclick="handleClearShiftSales()" class="btn-outline" style="border-color: #fca5a5; color: #ef4444; font-size: 0.76rem; padding: 0.35rem 0.75rem; display: inline-flex; align-items: center; gap: 5px;">
            <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i> Remove All Shift Records
          </button>
        ` : ''}
      </div>

      ${(txns.length === 0 && adjustments.length === 0) ? `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.84rem; border: 1px dashed var(--border-color); border-radius: 8px;">
          No cash sale receipts or adjustments recorded in this shift yet. Drawer is clean and ready.
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${adjustments.map(adj => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.9rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-app); flex-wrap: wrap; gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="badge" style="background: ${adj.type === 'in' ? 'rgba(234, 88, 12, 0.12)' : 'rgba(239, 68, 68, 0.12)'}; color: ${adj.type === 'in' ? '#ea580c' : '#ef4444'}; font-weight: 700; font-size: 0.7rem;">
                  ${adj.type === 'in' ? '+ CASH IN' : '- CASH OUT'}
                </span>
                <div>
                  <div style="font-size: 0.84rem; font-weight: 700; color: var(--text-main);">${adj.reason || 'Drawer Adjustment'}</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">${adj.time || ''}</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 0.9rem; font-weight: 800; color: ${adj.type === 'in' ? '#ea580c' : '#ef4444'};">
                  ${adj.type === 'in' ? '+' : '-'}₱${Number(adj.amount || 0).toFixed(2)}
                </span>
                <button onclick="handleRemoveDrawerAdjustment('${adj.id}')" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; border-radius: 6px; padding: 4px 8px; font-size: 0.72rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Remove this adjustment">
                  <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> Remove
                </button>
              </div>
            </div>
          `).join('')}
          ${txns.map(t => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.9rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-app); flex-wrap: wrap; gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #10b981; font-weight: 700; font-size: 0.7rem;">
                  ${t.receiptNo || 'CASH SALE'}
                </span>
                <div>
                  <div style="font-size: 0.84rem; font-weight: 700; color: var(--text-main);">${t.customerName || 'Walk-in Customer'}</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">${t.date || ''} ${t.time ? '• ' + t.time : ''} (${(t.items || []).length} item${(t.items || []).length === 1 ? '' : 's'})</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 0.9rem; font-weight: 800; color: #10b981;">
                  +₱${Number(t.netTotal || 0).toFixed(2)}
                </span>
                <button onclick="handleRemoveCashReceiptFromShift('${t.id}')" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; border-radius: 6px; padding: 4px 8px; font-size: 0.72rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Remove this cash sale record from the current shift drawer">
                  <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> Remove
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

window.handleSetOpeningFloat = function(event) {
  if (event) event.preventDefault();
  const inputEl = document.getElementById('openingFloatInput');
  if (!inputEl) return;

  const rawVal = inputEl.value.trim();
  const parsed = rawVal === '' ? 0 : Number(rawVal);
  if (isNaN(parsed) || parsed < 0) {
    alert('Please enter a valid non-negative Opening Cash Float amount (₱0.00 or higher).');
    inputEl.focus();
    return;
  }

  const drawer = window.pharmacyStore.getDrawer();
  const session = window.authStore ? window.authStore.getSession() : null;
  drawer.openingFloat = parsed;
  drawer.shiftDate = new Date().toISOString().split('T')[0];
  if (session && session.fullName) {
    drawer.openedBy = session.fullName;
  }
  window.pharmacyStore.saveDrawer(drawer);

  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    renderCashDrawerView(mainContent);
    const badge = document.getElementById('openingFloatSavedBadge');
    if (badge) {
      badge.style.display = 'inline-flex';
      setTimeout(() => {
        if (badge) badge.style.display = 'none';
      }, 2500);
    }
  }
};

window.handleClearOpeningFloat = function() {
  const drawer = window.pharmacyStore.getDrawer();
  drawer.openingFloat = 0;
  // Also remove any 'in' adjustments that had increased openingFloat
  if (Array.isArray(drawer.adjustments)) {
    drawer.adjustments = drawer.adjustments.filter(a => a.type !== 'in');
  }
  window.pharmacyStore.saveDrawer(drawer);
  const mainContent = document.getElementById('main-content');
  if (mainContent) renderCashDrawerView(mainContent);
};

window.handleClearShiftSales = function() {
  const drawer = window.pharmacyStore.getDrawer();
  drawer.resetAt = Date.now();
  drawer.excludedTxnIds = [];
  drawer.adjustments = [];
  drawer.cashOutTotal = 0;
  window.pharmacyStore.saveDrawer(drawer);
  const mainContent = document.getElementById('main-content');
  if (mainContent) renderCashDrawerView(mainContent);
};

window.handleRemoveCashReceiptFromShift = function(txnId) {
  if (!txnId) return;
  const drawer = window.pharmacyStore.getDrawer();
  if (!Array.isArray(drawer.excludedTxnIds)) drawer.excludedTxnIds = [];
  if (!drawer.excludedTxnIds.includes(txnId)) {
    drawer.excludedTxnIds.push(txnId);
  }
  window.pharmacyStore.saveDrawer(drawer);
  const mainContent = document.getElementById('main-content');
  if (mainContent) renderCashDrawerView(mainContent);
};

window.handleRemoveDrawerAdjustment = function(adjId) {
  const drawer = window.pharmacyStore.getDrawer();
  if (!Array.isArray(drawer.adjustments)) return;
  const target = drawer.adjustments.find(a => a.id === adjId);
  if (target && target.type === 'in') {
    drawer.openingFloat = Math.max(0, Number(drawer.openingFloat || 0) - Number(target.amount || 0));
  }
  drawer.adjustments = drawer.adjustments.filter(a => a.id !== adjId);
  window.pharmacyStore.saveDrawer(drawer);
  const mainContent = document.getElementById('main-content');
  if (mainContent) renderCashDrawerView(mainContent);
};

window.handleResetCashDrawer = function() {
  if (!confirm('Start a fresh shift and reset Opening Cash Float, Cash Sales Collected, and Expected in Drawer back to ₱0.00?')) {
    return;
  }
  const drawer = window.pharmacyStore.getDrawer();
  const session = window.authStore ? window.authStore.getSession() : null;
  drawer.openingFloat = 0;
  drawer.cashOutTotal = 0;
  drawer.adjustments = [];
  drawer.excludedTxnIds = [];
  drawer.resetAt = Date.now();
  drawer.shiftDate = new Date().toISOString().split('T')[0];
  if (session && session.fullName) {
    drawer.openedBy = session.fullName;
  }
  drawer.v2FreshClean = true;
  window.pharmacyStore.saveDrawer(drawer);

  const mainContent = document.getElementById('main-content');
  if (mainContent) renderCashDrawerView(mainContent);
};

window.handlePromptOpeningFloat = function() {
  const drawer = window.pharmacyStore.getDrawer();
  const currentFloat = Number(drawer.openingFloat || 0).toFixed(2);
  const amt = prompt('Enter Opening Cash Float amount for the shift (₱):', currentFloat);
  if (amt !== null && amt.trim() !== '') {
    const parsed = Number(amt);
    if (!isNaN(parsed) && parsed >= 0) {
      const session = window.authStore ? window.authStore.getSession() : null;
      drawer.openingFloat = parsed;
      drawer.shiftDate = new Date().toISOString().split('T')[0];
      if (session && session.fullName) {
        drawer.openedBy = session.fullName;
      }
      window.pharmacyStore.saveDrawer(drawer);
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        renderCashDrawerView(mainContent);
        const badge = document.getElementById('openingFloatSavedBadge');
        if (badge) {
          badge.style.display = 'inline-flex';
          setTimeout(() => {
            if (badge) badge.style.display = 'none';
          }, 2500);
        }
      }
    } else {
      alert('Please enter a valid non-negative number for the Opening Cash Float.');
    }
  }
};

window.handleZReading = function() {
  alert('Generating official End-of-Day Z-Reading Report for affordaLABS BIR audit.');
};

window.handleDrawerCashIn = function() {
  const amt = prompt('Enter additional cash float amount to add (₱):', '');
  if (amt && !isNaN(Number(amt)) && Number(amt) > 0) {
    const drawer = window.pharmacyStore.getDrawer();
    drawer.openingFloat = Number(drawer.openingFloat || 0) + Number(amt);
    if (!Array.isArray(drawer.adjustments)) drawer.adjustments = [];
    drawer.adjustments.unshift({
      id: 'adj-' + Date.now(),
      type: 'in',
      amount: Number(amt),
      reason: 'Cash In (Change Float)',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    window.pharmacyStore.saveDrawer(drawer);
    const mainContent = document.getElementById('main-content');
    if (mainContent) renderCashDrawerView(mainContent);
  }
};

window.handleDrawerCashOut = function() {
  const reason = prompt('Enter expense/payout reason:', 'Supplier delivery fee');
  if (reason) {
    const amt = prompt(`Enter payout amount for "${reason}" (₱):`, '');
    if (amt && !isNaN(Number(amt)) && Number(amt) > 0) {
      const drawer = window.pharmacyStore.getDrawer();
      if (!Array.isArray(drawer.adjustments)) drawer.adjustments = [];
      drawer.adjustments.unshift({
        id: 'adj-' + Date.now(),
        type: 'out',
        amount: Number(amt),
        reason: reason.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      window.pharmacyStore.saveDrawer(drawer);
      const mainContent = document.getElementById('main-content');
      if (mainContent) renderCashDrawerView(mainContent);
    }
  }
};

window.handleCashCount = function() {
  const drawer = window.pharmacyStore.getDrawer();
  const txns = getActiveShiftCashTxns(drawer);
  const cashSales = txns.reduce((sum, t) => sum + Number(t.netTotal || 0), 0);
  const adjustments = Array.isArray(drawer.adjustments) ? drawer.adjustments : [];
  const cashOutTotal = adjustments
    .filter(a => a.type === 'out')
    .reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const currentExpected = Math.max(0, Number(drawer.openingFloat || 0) + cashSales - cashOutTotal);
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
