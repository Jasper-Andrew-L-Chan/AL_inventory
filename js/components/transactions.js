/**
 * In - Out (Stock Movement & Customer Transactions) Component
 * Features:
 * 1. Customer Transaction Information entry (Customer Name, Budget, Brgy, Date)
 * 2. Multi-medicine item entry with automatic calculation of Unit Totals and Selling Price Totals
 * 3. Automatic inventory deduction upon completing transaction
 * 4. Substitution handling when requested item is out of stock / user picks an alternate inventory item:
 *    - Updates transaction to record actual medicine supplied
 *    - Deducts from actual medicine supplied only
 *    - Validates that stock >= requested quantity (prevents negative inventory)
 * 5. Tabular audit log with search, filters, details, and receipt printing
 */

function formatDateMMDDYY(dateStr) {
  if (!dateStr) return '';
  const cleanStr = String(dateStr).trim();
  const parts = cleanStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${m.padStart(2, '0')}//${d.padStart(2, '0')}//${y.slice(-2)}`;
  }
  const dt = new Date(cleanStr);
  if (!isNaN(dt.getTime())) {
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const yy = String(dt.getFullYear()).slice(-2);
    return `${m}//${d}//${yy}`;
  }
  return cleanStr;
}

let txnSearchFilters = {
  date: '',
  time: '',
  receipt: '',
  cashier: '',
  items: '',
  total: ''
};
let txnCurrentTab = 'DETAILS';
let expandedTxnId = null;
let editingTxnId = null; // Track transaction being edited & restocked
let txnHistoryPage = 1;
const TXN_PAGE_SIZE = 10;

// Local state for the customer transaction entry form
let currentTxnForm = {
  receiptNo: '',
  customerName: '',
  budget: '',
  barangay: '',
  date: new Date().toISOString().split('T')[0],
  items: [
    createEmptyMedRow()
  ]
};

function createEmptyMedRow() {
  return {
    id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    selectedMedId: '',       // original inventory item selected (or 'custom'/'')
    customMedName: '',       // if customer entered a name not in inventory
    actualInventoryId: '',   // actual inventory item supplied (could be substitute)
    isSubstitute: false,
    qty: 1,
    unitPrice: 0,            // cost/unit price
    sellingPrice: 0,         // selling price per unit
    totalUnit: 1,            // total unit
    totalSellingPrice: 0     // qty * sellingPrice
  };
}

function renderTransactionsView(container) {
  const allTxns = window.pharmacyStore.getTransactions();
  const inventoryItems = window.pharmacyStore.getItems();
  const inventoryIdSet = new Set(inventoryItems.map(i => i.id));

  // Ensure active form rows reflect current inventory status (e.g. if an item was deleted or updated)
  currentTxnForm.items.forEach(row => {
    if (row.selectedMedId && row.selectedMedId !== '__CUSTOM__') {
      if (!inventoryIdSet.has(row.selectedMedId)) {
        // Item was deleted from inventory: reset selection
        row.selectedMedId = '';
        row.actualInventoryId = '';
        row.unitPrice = 0;
        row.sellingPrice = 0;
        row.totalSellingPrice = 0;
      } else {
        // Item exists in inventory: keep unit and selling price aligned unless custom edited
        const curItem = inventoryItems.find(i => i.id === row.selectedMedId);
        if (curItem && !row.isSubstitute) {
          if (!row.unitPrice) row.unitPrice = Number(curItem.costPrice || 0);
          if (!row.sellingPrice) row.sellingPrice = Number(curItem.sellingPrice || 0);
          row.totalSellingPrice = (Number(row.qty) || 1) * (Number(row.sellingPrice) || 0);
        }
      }
    }
    if (row.actualInventoryId && !inventoryIdSet.has(row.actualInventoryId)) {
      row.actualInventoryId = '';
    }
  });

  const filteredTxns = allTxns.filter(t => {
    if (txnSearchFilters.date) {
      const q = txnSearchFilters.date.toLowerCase();
      const rawDate = (t.date || '').toLowerCase();
      const formattedDate = formatDateMMDDYY(t.date).toLowerCase();
      if (!rawDate.includes(q) && !formattedDate.includes(q)) return false;
    }
    if (txnSearchFilters.time && !t.time.toLowerCase().includes(txnSearchFilters.time.toLowerCase())) return false;
    if (txnSearchFilters.receipt && !t.receiptNo.toLowerCase().includes(txnSearchFilters.receipt.toLowerCase())) return false;
    if (txnSearchFilters.cashier && !t.cashier.toLowerCase().includes(txnSearchFilters.cashier.toLowerCase())) return false;
    if (txnSearchFilters.total && !t.netTotal.toString().includes(txnSearchFilters.total)) return false;
    if (txnSearchFilters.items) {
      const itemsStr = t.items.map(i => `${i.name} ${i.actualSuppliedName || ''}`).join(' ').toLowerCase();
      if (!itemsStr.includes(txnSearchFilters.items.toLowerCase())) return false;
    }
    return true;
  });

  const totalTxnCount = filteredTxns.length;
  const totalTxnPages = Math.ceil(totalTxnCount / TXN_PAGE_SIZE) || 1;
  if (txnHistoryPage > totalTxnPages) txnHistoryPage = totalTxnPages;
  if (txnHistoryPage < 1) txnHistoryPage = 1;

  const startTxnIdx = (txnHistoryPage - 1) * TXN_PAGE_SIZE;
  const pageTxns = filteredTxns.slice(startTxnIdx, startTxnIdx + TXN_PAGE_SIZE);

  const nowStr = new Date().toISOString().split('T')[0];

  // Calculate live totals for the active customer form
  const formGrandTotalSelling = currentTxnForm.items.reduce((sum, item) => sum + (Number(item.totalSellingPrice) || 0), 0);
  const formGrandTotalQty = currentTxnForm.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const customerBudget = Number(currentTxnForm.budget) || 0;
  const isOverBudget = customerBudget > 0 && formGrandTotalSelling > customerBudget;

  container.innerHTML = `
    <!-- Top Subtabs -->
    <div class="subtabs-bar">
      ${['DETAILS', 'IN - OUT LOGS', 'HOURLY', 'DAILY', 'MONTHLY'].map(tab => `
        <button class="subtab-btn ${txnCurrentTab === tab ? 'active' : ''}" onclick="switchTxnTab('${tab}')">
          ${tab}
        </button>
      `).join('')}
    </div>

    <!-- 1. Customer Transaction & Stock Out Entry Section -->
    <div class="inout-builder-card" style="${editingTxnId ? 'border: 2px solid #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);' : ''}">
      <div class="inout-builder-header" style="${editingTxnId ? 'background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);' : ''}">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: rgba(255,255,255,0.2); border-radius: 8px;">
            <i data-lucide="${editingTxnId ? 'refresh-cw' : 'package-plus'}" style="width: 18px; height: 18px; color: #ffffff;"></i>
          </span>
          <div>
            <h3 style="margin: 0; font-size: 1rem; font-weight: 700; letter-spacing: -0.01em;">
              ${editingTxnId ? 'Edit / Restock Transaction & Item Substitution' : 'Customer Transaction & Stock Out Entry'}
            </h3>
            <p style="margin: 0; font-size: 0.76rem; opacity: 0.95;">
              ${editingTxnId
      ? 'Editing this completed transaction will return previously deducted medicines to inventory and deduct the newly selected substitute medicines.'
      : 'Record customer purchases, handle item substitutions, and automatically deduct from inventory.'}
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          ${editingTxnId ? `
            <button type="button" onclick="cancelEditTxn()" class="btn-outline" style="background: rgba(0,0,0,0.25); color: white; border: 1px solid rgba(255,255,255,0.4); font-size: 0.78rem; padding: 0.35rem 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="x" style="width: 14px; height: 14px;"></i>
              <span>Cancel Edit</span>
            </button>
          ` : ''}
          <button type="button" onclick="resetCustomerForm()" class="btn-outline" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); font-size: 0.78rem; padding: 0.35rem 0.75rem; display: inline-flex; align-items: center; gap: 0.35rem;">
            <i data-lucide="rotate-ccw" style="width: 13px; height: 13px;"></i>
            <span>Clear Form</span>
          </button>
        </div>
      </div>

      <div class="inout-builder-body">
        <!-- Customer Information Inputs -->
        <div class="inout-form-grid">
          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 0.3rem;">
              Receipt No.
            </label>
            <input 
              type="text" 
              id="custReceiptNo" 
              value="${escapeHtml(currentTxnForm.receiptNo)}" 
              placeholder="e.g. IO-${2760 + allTxns.length} (or custom)" 
              class="form-input" 
              style="font-family: monospace; font-weight: 600;"
              oninput="updateCustFormField('receiptNo', this.value)"
            />
          </div>

          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 0.3rem;">
              Customer Name <span style="color: #ef4444;">*</span>
            </label>
            <input 
              type="text" 
              id="custName" 
              value="${escapeHtml(currentTxnForm.customerName)}" 
              placeholder="e.g. Juan Dela Cruz" 
              class="form-input" 
              oninput="updateCustFormField('customerName', this.value)"
            />
          </div>

          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 0.3rem;">
              Budget (₱)
            </label>
            <input 
              type="number" 
              id="custBudget" 
              min="0" 
              step="0.01" 
              value="${currentTxnForm.budget}" 
              placeholder="e.g. 500.00" 
              class="form-input" 
              oninput="updateCustFormField('budget', this.value)"
            />
          </div>

          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 0.3rem;">
              Barangay (Brgy.)
            </label>
            <input 
              type="text" 
              id="custBrgy" 
              value="${escapeHtml(currentTxnForm.barangay)}" 
              placeholder="e.g. Brgy. Poblacion" 
              class="form-input" 
              oninput="updateCustFormField('barangay', this.value)"
            />
          </div>

          <div class="input-group">
            <label style="font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 0.3rem;">
              Date
            </label>
            <input 
              type="date" 
              id="custDate" 
              value="${currentTxnForm.date}" 
              class="form-input" 
              oninput="updateCustFormField('date', this.value)"
            />
          </div>
        </div>

        <!-- Medicines List Entry -->
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
            <div style="font-size: 0.84rem; font-weight: 700; color: #1e293b; display: inline-flex; align-items: center; gap: 0.4rem;">
              <i data-lucide="clipboard-list" style="width: 16px; height: 16px; color: var(--primary);"></i>
              <span>List of Medicines Purchased</span>
            </div>
            <button 
              type="button" 
              onclick="addMedicineRow()" 
              class="btn-primary" 
              style="padding: 0.35rem 0.75rem; font-size: 0.78rem; background: var(--primary); display: flex; align-items: center; gap: 0.35rem;"
            >
              <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
              <span>Add Another Medicine</span>
            </button>
          </div>

          <div style="overflow-x: auto;">
            <table class="med-entry-table">
              <thead>
                <tr>
                  <th style="min-width: 240px;">Medicine Selection</th>
                  <th style="width: 100px; text-align: center;">Quantity (QTY)</th>
                  <th style="width: 120px; text-align: right;">Unit Price (Cost)</th>
                  <th style="width: 120px; text-align: right;">Selling Price</th>
                  <th style="width: 90px; text-align: center;">Total Unit</th>
                  <th style="width: 130px; text-align: right;">Total Selling Price</th>
                  <th style="width: 50px; text-align: center;"></th>
                </tr>
              </thead>
              <tbody>
                ${currentTxnForm.items.map((row, idx) => renderMedRowHtml(row, idx, inventoryItems)).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Summary & Actions Bar -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-sm); padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
            <div>
              <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Total Units:</span>
              <span id="formGrandTotalQty" style="font-size: 1rem; font-weight: 800; color: var(--brand-charcoal); margin-left: 0.35rem;">
                ${formGrandTotalQty}
              </span>
            </div>
            <div>
              <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Total Selling Price:</span>
              <span id="formGrandTotalSelling" style="font-size: 1.15rem; font-weight: 800; color: var(--primary); margin-left: 0.35rem;">
                ₱${formGrandTotalSelling.toFixed(2)}
              </span>
            </div>
            <div id="budgetAlertContainer">
              ${customerBudget > 0 ? `
                <div style="padding: 0.25rem 0.65rem; border-radius: 4px; font-size: 0.76rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; ${isOverBudget ? 'background: #fee2e2; color: #b91c1c;' : 'background: #ecfdf5; color: #047857;'}">
                  <i data-lucide="${isOverBudget ? 'alert-triangle' : 'check'}" style="width: 13px; height: 13px;"></i>
                  <span>${isOverBudget
          ? `Over Budget by ₱${(formGrandTotalSelling - customerBudget).toFixed(2)}`
          : `Within Budget (₱${(customerBudget - formGrandTotalSelling).toFixed(2)} remaining)`}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <button 
              type="button" 
              onclick="saveCustomerTransaction()" 
              class="btn-primary" 
              style="background: ${editingTxnId ? '#d97706' : 'var(--primary)'}; font-size: 0.88rem; padding: 0.6rem 1.5rem; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 3px 8px ${editingTxnId ? 'rgba(217, 119, 6, 0.35)' : 'rgba(255, 90, 0, 0.3)'};"
            >
              <i data-lucide="${editingTxnId ? 'refresh-cw' : 'save'}" style="width: 16px; height: 16px;"></i>
              <span>${editingTxnId ? 'Save Changes & Restock / Deduct' : 'Save & Deduct Inventory'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Date Range & Download Toolbar -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
      <div>
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.35rem;">
          <div style="display: flex; flex-direction: column;">
            <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">From</label>
            <input type="date" id="txnFromDate" value="${nowStr}" class="form-input" style="padding: 0.4rem 0.6rem; font-size: 0.82rem;" />
          </div>
          <div style="display: flex; flex-direction: column;">
            <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">To</label>
            <input type="date" id="txnToDate" value="${nowStr}" class="form-input" style="padding: 0.4rem 0.6rem; font-size: 0.82rem;" />
          </div>
          <button onclick="handleTxnDateFilter()" class="btn-primary" style="margin-top: 1.2rem; background: var(--primary); color: #ffffff; font-weight: 700;">
            Go!
          </button>
        </div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">
          In - Out logs can be viewed for all completed customer stock out transactions.
        </div>
      </div>

      <div>
        <button onclick="exportTransactionsCSV()" class="btn-primary" style="background: var(--brand-charcoal); display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="download" style="width: 15px; height: 15px;"></i>
          <span>Download CSV</span>
        </button>
      </div>
    </div>

    <!-- Data Table of In - Out Transactions -->
    <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); overflow: hidden; margin-bottom: 1.5rem;">
      <div style="max-height: 520px; overflow-y: auto; overflow-x: auto;">
        <table class="data-table" style="margin: 0;">
          <thead style="position: sticky; top: 0; z-index: 2; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <tr style="background: #f8fafc; color: var(--text-main); border-bottom: 2px solid var(--border-color);">
              <th style="width: 30px; background: #f8fafc; color: var(--text-muted);"></th>
              <th style="background: #f8fafc; color: var(--brand-charcoal); font-weight: 700;">Date & Ref</th>
              <th style="background: #f8fafc; color: var(--brand-charcoal); font-weight: 700;">Customer / Brgy</th>
              <th style="background: #f8fafc; color: var(--brand-charcoal); font-weight: 700;">Receipt No.</th>
              <th style="background: #f8fafc; color: var(--brand-charcoal); font-weight: 700;">Cashier</th>
              <th style="background: #f8fafc; color: var(--brand-charcoal); font-weight: 700;">Medicines Supplied</th>
              <th style="background: #f8fafc; color: var(--brand-charcoal); font-weight: 700; text-align: right;">Total Amount</th>
              <th style="background: #f8fafc; color: var(--brand-charcoal); font-weight: 700; text-align: center;">Action</th>
            </tr>
            <!-- Subheader Column Search -->
            <tr style="background: #ffffff;">
              <td></td>
              <td><input type="text" placeholder="Search date..." value="${txnSearchFilters.date}" oninput="updateTxnFilter('date', this.value)" class="table-search-input" style="width: 100px;" /></td>
              <td><input type="text" placeholder="Search customer..." value="${txnSearchFilters.cashier}" oninput="updateTxnFilter('cashier', this.value)" class="table-search-input" style="width: 120px;" /></td>
              <td><input type="text" placeholder="Search ref..." value="${txnSearchFilters.receipt}" oninput="updateTxnFilter('receipt', this.value)" class="table-search-input" style="width: 100px;" /></td>
              <td><input type="text" placeholder="Search staff..." value="" oninput="updateTxnFilter('time', this.value)" class="table-search-input" style="width: 80px;" /></td>
              <td><input type="text" placeholder="Search medicines..." value="${txnSearchFilters.items}" oninput="updateTxnFilter('items', this.value)" class="table-search-input" style="width: 180px;" /></td>
              <td><input type="text" placeholder="Search ₱..." value="${txnSearchFilters.total}" oninput="updateTxnFilter('total', this.value)" class="table-search-input" style="width: 80px; text-align: right;" /></td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            ${totalTxnCount === 0 ? `
              <tr>
                <td colspan="8" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                  <div style="margin-bottom: 0.5rem; display: flex; justify-content: center;">
                    <i data-lucide="refresh-cw" style="width: 36px; height: 36px; color: var(--border-color);"></i>
                  </div>
                  <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-main); margin-bottom: 0.25rem;">
                    No In - Out stock movement logs found
                  </div>
                  <div style="font-size: 0.84rem; max-width: 420px; margin: 0 auto;">
                    Use the Customer Transaction entry form above to record customer purchases. Stock will automatically deduct from inventory.
                  </div>
                </td>
              </tr>
            ` : pageTxns.map(t => {
            const isExpanded = expandedTxnId === t.id;
            const isRefunded = t.status === 'Refunded';

            return `
                <tr style="${isRefunded ? 'opacity: 0.6; background: #fff1f2;' : ''}">
                  <td style="text-align: center; cursor: pointer;" onclick="toggleExpandTxn('${t.id}')">
                    <span style="display: inline-flex; align-items: center; justify-content: center; color: var(--primary);">
                      <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" style="width: 16px; height: 16px;"></i>
                    </span>
                  </td>
                  <td>
                    <div style="font-weight: 600; color: var(--text-main); font-size: 0.85rem;">
                      ${formatDateMMDDYY(t.date)}
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">
                      ${t.time || ''}
                    </div>
                  </td>
                  <td>
                    <div style="font-weight: 700; color: var(--brand-charcoal); font-size: 0.86rem;">
                      ${escapeHtml(t.customerName || 'Walk-in')}
                    </div>
                    ${t.barangay ? `
                      <div style="font-size: 0.73rem; color: #64748b; display: inline-flex; align-items: center; gap: 0.25rem; margin-top: 2px;">
                        <i data-lucide="map-pin" style="width: 12px; height: 12px; color: #94a3b8;"></i>
                        <span>Brgy. ${escapeHtml(t.barangay)}</span>
                      </div>
                    ` : ''}
                    ${t.budget > 0 ? `
                      <div style="font-size: 0.7rem; color: var(--primary); font-weight: 600;">
                        Budget: ₱${Number(t.budget).toFixed(2)}
                      </div>
                    ` : ''}
                  </td>
                  <td style="font-family: monospace; font-weight: 700; color: var(--brand-charcoal);">
                    ${t.receiptNo}
                  </td>
                  <td style="font-size: 0.82rem;">${t.cashier}</td>
                  <td style="font-size: 0.82rem;">
                    <div style="font-weight: 500; color: var(--text-main);">
                      ${t.items.map(i => {
              const wasSubstituted = i.isSubstitute || (i.actualSuppliedName && i.actualSuppliedName !== i.name);
              if (wasSubstituted) {
                return `<span style="display: inline-block; margin-bottom: 2px;">
                            <strong>${escapeHtml(i.actualSuppliedName || i.name)}</strong> (x${i.qty})
                            <span style="font-size: 0.7rem; color: #d97706; background: #fef3c7; padding: 1px 4px; border-radius: 3px;">Substituted for ${escapeHtml(i.requestedName || i.name)}</span>
                          </span>`;
              }
              return `<span>${escapeHtml(i.name)} (x${i.qty})</span>`;
            }).join(', ')}
                    </div>
                  </td>
                  <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: var(--text-main);">
                    ₱${Number(t.netTotal).toFixed(2)}
                    ${isRefunded ? '<div style="font-size: 0.68rem; color: #ef4444;">VOIDED / RESTOCKED</div>' : ''}
                  </td>
                  <td style="text-align: center;">
                    <div style="display: flex; gap: 0.35rem; justify-content: center; align-items: center; flex-wrap: wrap;">
                      ${!isRefunded ? `
                        <button 
                          onclick="handleStartEditTxn('${t.id}')" 
                          style="background: var(--primary-light); border: 1.5px solid var(--primary); color: var(--primary-dark); border-radius: var(--radius-sm); padding: 4px 10px; font-size: 0.76rem; font-weight: 700; cursor: pointer; transition: all 0.15s ease; display: inline-flex; align-items: center; gap: 0.35rem;"
                          onmouseover="this.style.background='var(--primary)'; this.style.color='#ffffff';"
                          onmouseout="this.style.background='var(--primary-light)'; this.style.color='var(--primary-dark)';"
                          title="Edit this transaction and substitute or restock medicines"
                        >
                          <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i>
                          <span>Edit / Restock</span>
                        </button>
                      ` : `
                        <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">Restocked</span>
                      `}
                      <button 
                        onclick="handleDeleteTxn('${t.id}')" 
                        style="background: #fee2e2; border: 1.5px solid #f87171; color: #b91c1c; border-radius: var(--radius-sm); padding: 5px 8px; font-size: 0.76rem; font-weight: 700; cursor: pointer; transition: all 0.15s ease; display: inline-flex; align-items: center;"
                        onmouseover="this.style.background='#ef4444'; this.style.color='#ffffff';"
                        onmouseout="this.style.background='#fee2e2'; this.style.color='#b91c1c';"
                        title="Remove transaction from history"
                      >
                        <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Expanded Details Row -->
                ${isExpanded ? `
                  <tr style="background: #f8fafc;">
                    <td colspan="8" style="padding: 1rem 1.5rem;">
                      <div style="border-left: 3px solid var(--primary); padding-left: 1rem;">
                        <h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-main);">
                          Transaction Breakdown: ${t.receiptNo} (${formatDateMMDDYY(t.date)} ${t.time})
                        </h4>
                        <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.6rem;">
                          <strong>Customer:</strong> ${escapeHtml(t.customerName)} | 
                          <strong>Barangay:</strong> ${escapeHtml(t.barangay || 'N/A')} | 
                          <strong>Budget:</strong> ${t.budget ? '₱' + Number(t.budget).toFixed(2) : 'N/A'} |
                          <strong>Staff:</strong> ${escapeHtml(t.cashier)}
                        </div>

                        <table style="width: 100%; max-width: 720px; font-size: 0.78rem; border-collapse: collapse; margin-bottom: 0.75rem;">
                          <thead>
                            <tr style="border-bottom: 1px solid #cbd5e1; text-align: left; background: #f1f5f9;">
                              <th style="padding: 6px 8px;">Medicine Requested</th>
                              <th style="padding: 6px 8px;">Actual Medicine Supplied (Deducted)</th>
                              <th style="padding: 6px 8px; text-align: center;">Qty</th>
                              <th style="padding: 6px 8px; text-align: right;">Unit Price</th>
                              <th style="padding: 6px 8px; text-align: right;">Selling Price</th>
                              <th style="padding: 6px 8px; text-align: right;">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${t.items.map(item => `
                              <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 6px 8px;">${escapeHtml(item.requestedName || item.name)}</td>
                                <td style="padding: 6px 8px; font-weight: 600; color: var(--primary-dark);">
                                  ${escapeHtml(item.actualSuppliedName || item.name)}
                                  ${item.isSubstitute ? '<span style="color: #b45309; font-size: 0.7rem;"> (Substitute)</span>' : ''}
                                </td>
                                <td style="padding: 6px 8px; text-align: center; font-weight: 700;">${item.qty}</td>
                                <td style="padding: 6px 8px; text-align: right;">₱${Number(item.unitPrice || 0).toFixed(2)}</td>
                                <td style="padding: 6px 8px; text-align: right;">₱${Number(item.sellingPrice || item.price || 0).toFixed(2)}</td>
                                <td style="padding: 6px 8px; text-align: right; font-weight: 700;">₱${((item.sellingPrice || item.price || 0) * item.qty).toFixed(2)}</td>
                              </tr>
                            `).join('')}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colspan="5" style="text-align: right; font-weight: 700; padding: 6px 8px;">Total:</td>
                              <td style="text-align: right; font-weight: 800; font-size: 0.88rem; color: var(--primary); padding: 6px 8px;">
                                ₱${Number(t.netTotal).toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>

                        <div style="display: flex; gap: 0.75rem; align-items: center;">
                          <button onclick="window.renderOfficialReceipt(window.pharmacyStore.getTransactions().find(x => x.id === '${t.id}'))" class="btn-outline" style="font-size: 0.75rem; padding: 4px 10px; display: inline-flex; align-items: center; gap: 0.35rem;">
                            <i data-lucide="receipt" style="width: 13px; height: 13px;"></i>
                            <span>View Full Official Receipt</span>
                          </button>
                          <button onclick="handleDeleteTxn('${t.id}')" class="btn-outline" style="font-size: 0.75rem; padding: 4px 10px; color: #b91c1c; border-color: #fca5a5; display: inline-flex; align-items: center; gap: 0.35rem;">
                            <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                            <span>Delete Log Entry</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ` : ''}
              `;
          }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      ${totalTxnCount > 0 ? `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; border-top: 1px solid var(--border-color); background: #f8fafc; flex-wrap: wrap; gap: 0.75rem;">
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            Showing <strong>${startTxnIdx + 1}</strong> to <strong>${Math.min(startTxnIdx + TXN_PAGE_SIZE, totalTxnCount)}</strong> of <strong>${totalTxnCount}</strong> transactions
          </div>

          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <!-- First Page -->
            <button 
              onclick="handleTxnHistoryPageChange(1)" 
              class="btn-outline" 
              style="padding: 4px 8px; font-size: 0.75rem; font-weight: 700;" 
              ${txnHistoryPage === 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed; padding: 4px 8px; font-size: 0.75rem;"' : ''}
              title="First Page"
            >
              «
            </button>

            <!-- Previous Page -->
            <button 
              onclick="handleTxnHistoryPageChange(${txnHistoryPage - 1})" 
              class="btn-outline" 
              style="padding: 4px 10px; font-size: 0.75rem; font-weight: 700;" 
              ${txnHistoryPage === 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed; padding: 4px 10px; font-size: 0.75rem;"' : ''}
            >
              ‹ Prev
            </button>

            <!-- Page Number Indicator -->
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-main); padding: 0 0.5rem;">
              Page ${txnHistoryPage} of ${totalTxnPages}
            </span>

            <!-- Next Page -->
            <button 
              onclick="handleTxnHistoryPageChange(${txnHistoryPage + 1})" 
              class="btn-outline" 
              style="padding: 4px 10px; font-size: 0.75rem; font-weight: 700;" 
              ${txnHistoryPage === totalTxnPages ? 'disabled style="opacity: 0.4; cursor: not-allowed; padding: 4px 10px; font-size: 0.75rem;"' : ''}
            >
              Next ›
            </button>

            <!-- Last Page -->
            <button 
              onclick="handleTxnHistoryPageChange(${totalTxnPages})" 
              class="btn-outline" 
              style="padding: 4px 8px; font-size: 0.75rem; font-weight: 700;" 
              ${txnHistoryPage === totalTxnPages ? 'disabled style="opacity: 0.4; cursor: not-allowed; padding: 4px 8px; font-size: 0.75rem;"' : ''}
              title="Last Page"
            >
              »
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Helper to format medicine name as: Generic Name (Brand Name)
function getMedicineDisplayName(item) {
  if (!item) return 'Unnamed Medicine';
  const brand = (item.brandName || '').trim();
  const generic = (item.genericName || '').trim();
  const dosage = (item.dosage && item.dosage !== 'Standard') ? item.dosage.trim() : '';

  if (generic && brand) {
    const genericFull = dosage ? `${generic} ${dosage}` : generic;
    return `${genericFull} (${brand})`;
  }

  // If item.name already contains formatted string like "Brand (Generic)" or "Brand (Generic Dosage)"
  if (item.name && item.name.includes('(') && item.name.includes(')')) {
    const match = item.name.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (match) {
      const part1 = match[1].trim(); // previously brand
      const part2 = match[2].trim(); // previously generic
      return `${part2} (${part1})`;
    }
  }

  if (generic) {
    return dosage ? `${generic} ${dosage}` : generic;
  }
  if (brand) {
    return dosage ? `${brand} ${dosage}` : brand;
  }
  return item.name || 'Unnamed Medicine';
}

// Render a single medicine row in the form
function renderMedRowHtml(row, idx, inventoryItems) {
  // Find current selected item if from inventory
  const selectedItem = inventoryItems.find(i => i.id === row.selectedMedId);
  const selectedStock = selectedItem ? Number(selectedItem.currentStock || 0) : 0;
  const isOutOfStock = selectedItem && selectedStock <= 0;

  // Find actual supplied item
  const actualItem = inventoryItems.find(i => i.id === row.actualInventoryId);
  const actualStock = actualItem ? Number(actualItem.currentStock || 0) : 0;

  // Check if substitute selector should be displayed
  const needsSubstitute = row.isSubstitute || isOutOfStock;

  return `
    <tr class="med-entry-row" id="${row.id}">
      <!-- Medicine Selection -->
      <td style="padding: 0.6rem 0.5rem;">
        <div style="display: flex; flex-direction: column; gap: 0.35rem;">
          <!-- Primary Medicine Selection -->
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <select 
              class="form-input" 
              style="flex: 1; padding: 0.48rem 0.65rem; font-size: 0.84rem; font-weight: 600; color: #1e293b;" 
              onchange="onSelectPrimaryMedicine('${row.id}', this.value)"
            >
              <option value="">-- Select Medicine from Inventory --</option>
              ${inventoryItems.map(item => `
                <option value="${item.id}" ${row.selectedMedId === item.id ? 'selected' : ''}>
                  ${escapeHtml(getMedicineDisplayName(item))} — (${item.currentStock} units available)
                </option>
              `).join('')}
              <option value="__CUSTOM__" ${row.selectedMedId === '__CUSTOM__' ? 'selected' : ''}>
                + Custom / Unlisted Medicine...
              </option>
            </select>
          </div>

          <!-- Custom medicine text input if selected -->
          ${row.selectedMedId === '__CUSTOM__' ? `
            <input 
              type="text" 
              placeholder="Type unlisted medicine name..." 
              value="${escapeHtml(row.customMedName || '')}" 
              class="form-input" 
              style="padding: 0.35rem 0.5rem; font-size: 0.8rem;" 
              oninput="updateMedRowField('${row.id}', 'customMedName', this.value)"
            />
          ` : ''}

          <!-- Live Inventory Details Card for Selected Medicine -->
          ${selectedItem ? `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 0.4rem 0.6rem; font-size: 0.73rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                <div>
                  <span style="font-weight: 700; color: #334155;">Inventory Stock:</span>
                  ${selectedStock > 0 ? `
                    <span style="color: #047857; font-weight: 800; background: #ecfdf5; padding: 1px 6px; border-radius: 3px; margin-left: 3px;">
                      ${selectedStock} units
                    </span>
                  ` : `
                    <span style="color: #b91c1c; font-weight: 800; background: #fee2e2; padding: 1px 6px; border-radius: 3px; margin-left: 3px;">
                      0 units (OUT OF STOCK)
                    </span>
                  `}
                </div>
                <button 
                  type="button" 
                  onclick="toggleSubstituteMode('${row.id}')" 
                  style="background: none; border: none; color: #0284c7; text-decoration: underline; cursor: pointer; font-size: 0.72rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;"
                >
                  <i data-lucide="${row.isSubstitute ? 'x' : 'refresh-cw'}" style="width: 11px; height: 11px;"></i>
                  <span>${row.isSubstitute ? 'Close substitute' : 'Choose substitute'}</span>
                </button>
              </div>
              <div style="display: flex; gap: 0.75rem; color: #64748b; font-size: 0.7rem; flex-wrap: wrap;">
                <span><strong>Category:</strong> ${escapeHtml(selectedItem.category || 'General')}</span>
                <span><strong>Unit:</strong> ${escapeHtml(selectedItem.unit || 'unit')}</span>
                <span><strong>Batch:</strong> ${escapeHtml(selectedItem.batchLot || 'N/A')}</span>
                <span><strong>Cost:</strong> ₱${Number(selectedItem.costPrice || 0).toFixed(2)}</span>
                <span><strong>Selling:</strong> ₱${Number(selectedItem.sellingPrice || 0).toFixed(2)}</span>
              </div>
            </div>
          ` : (row.selectedMedId === '__CUSTOM__' ? `
            <div style="font-size: 0.72rem; color: #d97706; font-weight: 600; padding: 2px; display: flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="alert-triangle" style="width: 13px; height: 13px;"></i>
              <span>Custom medicine entered. Select an available inventory substitute below to deduct from stock.</span>
            </div>
          ` : '')}

          <!-- Substitute Dropdown (shown if out of stock, custom, or manually toggled) -->
          ${(needsSubstitute || row.selectedMedId === '__CUSTOM__') ? `
            <div class="substitute-alert">
              <span style="display: inline-flex; align-items: center; justify-content: center; color: #b45309;">
                <i data-lucide="refresh-cw" style="width: 16px; height: 16px;"></i>
              </span>
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 0.72rem; margin-bottom: 2px; color: #92400e;">
                  Actual Medicine Supplied (Deducted from Inventory):
                </div>
                <select 
                  class="form-input" 
                  style="width: 100%; padding: 0.35rem 0.5rem; font-size: 0.78rem; background: #ffffff; border-color: #f59e0b;" 
                  onchange="onSelectActualSubstitute('${row.id}', this.value)"
                >
                  <option value="">-- Select Available Inventory Substitute --</option>
                  ${inventoryItems
        .filter(item => item.id !== row.selectedMedId)
        .map(item => `
                      <option value="${item.id}" ${row.actualInventoryId === item.id ? 'selected' : ''}>
                        ${escapeHtml(getMedicineDisplayName(item))} — (${item.currentStock} in stock, ₱${Number(item.sellingPrice || 0).toFixed(2)})
                      </option>
                    `).join('')}
                </select>
                ${actualItem ? `
                  <div style="font-size: 0.7rem; color: #047857; margin-top: 3px; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <i data-lucide="check" style="width: 12px; height: 12px;"></i>
                    <span>Deducting from inventory: <strong>${escapeHtml(getMedicineDisplayName(actualItem))}</strong> (${actualStock} units available)</span>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </td>

      <!-- Quantity (QTY) -->
      <td style="text-align: center; vertical-align: top; padding-top: 0.9rem;">
        <input 
          type="number" 
          id="row-qty-${row.id}"
          min="1" 
          max="${actualItem ? actualStock : (selectedItem ? selectedStock : 9999)}"
          value="${row.qty}" 
          class="form-input" 
          style="width: 75px; text-align: center; font-weight: 700; font-size: 0.85rem;" 
          oninput="updateMedRowField('${row.id}', 'qty', this.value)"
          onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}"
        />
        ${actualItem || selectedItem ? `
          <div style="font-size: 0.68rem; color: #64748b; margin-top: 3px;">
            Max: ${actualItem ? actualStock : selectedStock}
          </div>
        ` : ''}
      </td>

      <!-- Unit Price (Cost) -->
      <td style="text-align: right; vertical-align: top; padding-top: 0.9rem;">
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 2px;">
          <span style="font-size: 0.75rem; color: #64748b;">₱</span>
          <input 
            type="number" 
            id="row-unitPrice-${row.id}"
            min="0" 
            step="0.01" 
            value="${row.unitPrice}" 
            class="form-input" 
            style="width: 90px; text-align: right; font-size: 0.82rem;" 
            oninput="updateMedRowField('${row.id}', 'unitPrice', this.value)"
            onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}"
          />
        </div>
      </td>

      <!-- Selling Price -->
      <td style="text-align: right; vertical-align: top; padding-top: 0.9rem;">
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 2px;">
          <span style="font-size: 0.75rem; color: #64748b;">₱</span>
          <input 
            type="number" 
            id="row-sellingPrice-${row.id}"
            min="0" 
            step="0.01" 
            value="${row.sellingPrice}" 
            class="form-input" 
            style="width: 90px; text-align: right; font-size: 0.82rem; font-weight: 600;" 
            oninput="updateMedRowField('${row.id}', 'sellingPrice', this.value)"
            onkeydown="if(event.key==='Enter'){event.preventDefault(); this.blur();}"
          />
        </div>
      </td>

      <!-- Total Unit -->
      <td id="row-totalUnit-${row.id}" style="text-align: center; vertical-align: top; padding-top: 1.1rem; font-weight: 700; color: #334155; font-size: 0.85rem;">
        ${row.totalUnit}
      </td>

      <!-- Total Selling Price -->
      <td id="row-totalSellingPrice-${row.id}" style="text-align: right; vertical-align: top; padding-top: 1.1rem; font-weight: 800; color: var(--primary); font-size: 0.92rem;">
        ₱${(Number(row.totalSellingPrice) || 0).toFixed(2)}
      </td>

      <!-- Remove Row Action -->
      <td style="text-align: center; vertical-align: top; padding-top: 0.9rem;">
        ${currentTxnForm.items.length > 1 ? `
          <button 
            type="button" 
            onclick="removeMedicineRow('${row.id}')" 
            style="background: none; border: none; color: #ef4444; font-size: 1.1rem; cursor: pointer; padding: 2px 4px; line-height: 1;" 
            title="Remove item"
          >
            ×
          </button>
        ` : ''}
      </td>
    </tr>
  `;
}

// Helper to escape HTML characters
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Customer Form Event Handlers ---

window.updateCustFormField = function (field, val) {
  currentTxnForm[field] = val;
};

window.addMedicineRow = function () {
  currentTxnForm.items.push(createEmptyMedRow());
  renderTransactionsView(document.getElementById('main-content'));
};

window.removeMedicineRow = function (rowId) {
  if (currentTxnForm.items.length > 1) {
    currentTxnForm.items = currentTxnForm.items.filter(r => r.id !== rowId);
    renderTransactionsView(document.getElementById('main-content'));
  }
};

window.resetCustomerForm = function () {
  editingTxnId = null;
  currentTxnForm = {
    receiptNo: '',
    customerName: '',
    budget: '',
    barangay: '',
    date: new Date().toISOString().split('T')[0],
    items: [createEmptyMedRow()]
  };
  renderTransactionsView(document.getElementById('main-content'));
};

window.onSelectPrimaryMedicine = function (rowId, selectedId) {
  const row = currentTxnForm.items.find(r => r.id === rowId);
  if (!row) return;

  row.selectedMedId = selectedId;
  const items = window.pharmacyStore.getItems();
  const found = items.find(i => i.id === selectedId);

  if (found) {
    row.customMedName = '';
    const stock = Number(found.currentStock || 0);

    // If stock is 0, prompt substitute automatically
    if (stock <= 0) {
      row.isSubstitute = true;
      row.actualInventoryId = '';
      row.unitPrice = Number(found.costPrice || 0);
      row.sellingPrice = Number(found.sellingPrice || 0);
    } else {
      row.isSubstitute = false;
      row.actualInventoryId = found.id;
      row.unitPrice = Number(found.costPrice || 0);
      row.sellingPrice = Number(found.sellingPrice || 0);
    }
  } else if (selectedId === '__CUSTOM__') {
    row.isSubstitute = true;
    row.actualInventoryId = '';
    row.unitPrice = 0;
    row.sellingPrice = 0;
  } else {
    row.actualInventoryId = '';
    row.isSubstitute = false;
    row.unitPrice = 0;
    row.sellingPrice = 0;
  }

  // Recalculate totals
  row.totalUnit = Number(row.qty) || 1;
  row.totalSellingPrice = row.totalUnit * (Number(row.sellingPrice) || 0);

  renderTransactionsView(document.getElementById('main-content'));
};

window.toggleSubstituteMode = function (rowId) {
  const row = currentTxnForm.items.find(r => r.id === rowId);
  if (!row) return;
  row.isSubstitute = !row.isSubstitute;
  if (!row.isSubstitute && row.selectedMedId && row.selectedMedId !== '__CUSTOM__') {
    const items = window.pharmacyStore.getItems();
    const orig = items.find(i => i.id === row.selectedMedId);
    if (orig) {
      row.actualInventoryId = orig.id;
      row.unitPrice = Number(orig.costPrice || 0);
      row.sellingPrice = Number(orig.sellingPrice || 0);
      row.totalSellingPrice = row.totalUnit * row.sellingPrice;
    }
  }
  renderTransactionsView(document.getElementById('main-content'));
};

window.onSelectActualSubstitute = function (rowId, actualInvId) {
  const row = currentTxnForm.items.find(r => r.id === rowId);
  if (!row) return;

  row.actualInventoryId = actualInvId;
  const items = window.pharmacyStore.getItems();
  const subItem = items.find(i => i.id === actualInvId);

  if (subItem) {
    row.unitPrice = Number(subItem.costPrice || 0);
    row.sellingPrice = Number(subItem.sellingPrice || 0);
  }

  row.totalUnit = Number(row.qty) || 1;
  row.totalSellingPrice = row.totalUnit * (Number(row.sellingPrice) || 0);

  renderTransactionsView(document.getElementById('main-content'));
};

window.updateMedRowField = function (rowId, field, val) {
  const row = currentTxnForm.items.find(r => r.id === rowId);
  if (!row) return;

  if (field === 'qty') {
    const parsed = parseInt(val, 10);
    const qty = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    row.qty = qty;
    row.totalUnit = qty;
  } else if (field === 'unitPrice') {
    row.unitPrice = Number(val) || 0;
  } else if (field === 'sellingPrice') {
    row.sellingPrice = Number(val) || 0;
  } else {
    row[field] = val;
  }

  // Recalculate row totals
  row.totalSellingPrice = (Number(row.qty) || 1) * (Number(row.sellingPrice) || 0);

  // Directly update row DOM elements to avoid losing input focus while typing
  const totalUnitEl = document.getElementById(`row-totalUnit-${row.id}`);
  if (totalUnitEl) {
    totalUnitEl.textContent = row.totalUnit;
  }

  const totalSellingEl = document.getElementById(`row-totalSellingPrice-${row.id}`);
  if (totalSellingEl) {
    totalSellingEl.textContent = `₱${(Number(row.totalSellingPrice) || 0).toFixed(2)}`;
  }

  // Update summary bar totals live
  const formGrandTotalSelling = currentTxnForm.items.reduce((sum, item) => sum + (Number(item.totalSellingPrice) || 0), 0);
  const formGrandTotalQty = currentTxnForm.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const customerBudget = Number(currentTxnForm.budget) || 0;
  const isOverBudget = customerBudget > 0 && formGrandTotalSelling > customerBudget;

  const grandQtyEl = document.getElementById('formGrandTotalQty');
  if (grandQtyEl) {
    grandQtyEl.textContent = formGrandTotalQty;
  }

  const grandSellingEl = document.getElementById('formGrandTotalSelling');
  if (grandSellingEl) {
    grandSellingEl.textContent = `₱${formGrandTotalSelling.toFixed(2)}`;
  }

  const budgetContainer = document.getElementById('budgetAlertContainer');
  if (budgetContainer) {
    if (customerBudget > 0) {
      budgetContainer.innerHTML = `
        <div style="padding: 0.25rem 0.65rem; border-radius: 4px; font-size: 0.76rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; ${isOverBudget ? 'background: #fee2e2; color: #b91c1c;' : 'background: #ecfdf5; color: #047857;'}">
          <i data-lucide="${isOverBudget ? 'alert-triangle' : 'check'}" style="width: 13px; height: 13px;"></i>
          <span>${isOverBudget
          ? `Over Budget by ₱${(formGrandTotalSelling - customerBudget).toFixed(2)}`
          : `Within Budget (₱${(customerBudget - formGrandTotalSelling).toFixed(2)} remaining)`}</span>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } else {
      budgetContainer.innerHTML = '';
    }
  }
};

// --- Edit / Restock Completed Transaction Handler ---
window.handleStartEditTxn = function (txnId) {
  const txns = window.pharmacyStore.getTransactions();
  const txn = txns.find(t => t.id === txnId);
  if (!txn) {
    alert('Transaction not found.');
    return;
  }

  const inventoryItems = window.pharmacyStore.getItems();

  // Populate form with existing transaction data
  currentTxnForm = {
    receiptNo: txn.receiptNo || '',
    customerName: txn.customerName || '',
    budget: txn.budget > 0 ? txn.budget : '',
    barangay: txn.barangay || '',
    date: txn.date || new Date().toISOString().split('T')[0],
    items: (txn.items && txn.items.length > 0) ? txn.items.map(item => {
      // Check if item corresponds to an inventory entry
      const actualInv = inventoryItems.find(i => i.id === item.actualInventoryId || i.id === item.id || i.name === item.name);
      const isSub = Boolean(item.isSubstitute || (item.actualSuppliedName && item.actualSuppliedName !== item.requestedName));

      // Determine what was selected originally
      let selectedMedId = '';
      let customMedName = '';
      if (item.requestedName) {
        const foundOrig = inventoryItems.find(i => i.name === item.requestedName);
        if (foundOrig) {
          selectedMedId = foundOrig.id;
        } else {
          selectedMedId = '__CUSTOM__';
          customMedName = item.requestedName;
        }
      } else if (actualInv) {
        selectedMedId = actualInv.id;
      }

      const rowQty = Number(item.qty) || 1;
      const rowUnitPrice = Number(item.unitPrice || 0);
      const rowSellingPrice = Number(item.sellingPrice || item.price || 0);

      return {
        id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        selectedMedId: selectedMedId,
        customMedName: customMedName,
        actualInventoryId: actualInv ? actualInv.id : (item.actualInventoryId || item.id || ''),
        isSubstitute: isSub,
        qty: rowQty,
        unitPrice: rowUnitPrice,
        sellingPrice: rowSellingPrice,
        totalUnit: rowQty,
        totalSellingPrice: rowQty * rowSellingPrice
      };
    }) : [createEmptyMedRow()]
  };

  editingTxnId = txnId;

  // Re-render and scroll smoothly to the In-Out builder
  renderTransactionsView(document.getElementById('main-content'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.cancelEditTxn = function () {
  editingTxnId = null;
  resetCustomerForm();
};

// Validate and save the transaction, then deduct inventory (or update & restock/substitute if editing)
window.saveCustomerTransaction = function () {
  const inventoryItems = window.pharmacyStore.getItems();
  const txns = window.pharmacyStore.getTransactions();
  const editingTxn = editingTxnId ? txns.find(t => t.id === editingTxnId) : null;

  // 1. Validate Customer Name
  if (!currentTxnForm.customerName || !currentTxnForm.customerName.trim()) {
    alert('Please enter a Customer Name before saving the transaction.');
    document.getElementById('custName')?.focus();
    return;
  }

  // 2. Validate Items List
  if (!currentTxnForm.items || currentTxnForm.items.length === 0) {
    alert('Please add at least one medicine item to the transaction.');
    return;
  }

  const transactionItems = [];

  for (let idx = 0; idx < currentTxnForm.items.length; idx++) {
    const row = currentTxnForm.items[idx];
    const rowNum = idx + 1;

    // Determine requested name
    let requestedName = '';
    if (row.selectedMedId === '__CUSTOM__' || row.selectedMedId === '') {
      requestedName = (row.customMedName || '').trim();
      if (!requestedName) {
        alert(`Line ${rowNum}: Please specify or select a medicine name.`);
        return;
      }
    } else if (row.selectedMedId) {
      const orig = inventoryItems.find(i => i.id === row.selectedMedId);
      requestedName = orig ? getMedicineDisplayName(orig) : 'Unknown Medicine';
    }

    // Determine actual inventory item to supply and deduct
    const targetInvId = row.actualInventoryId || (row.selectedMedId && row.selectedMedId !== '__CUSTOM__' ? row.selectedMedId : null);
    if (!targetInvId) {
      alert(`Line ${rowNum}: No inventory item assigned for deduction. If this item was out of stock or custom, please select an available substitute from inventory.`);
      return;
    }

    const actualItem = inventoryItems.find(i => i.id === targetInvId);
    if (!actualItem) {
      alert(`Line ${rowNum}: The selected inventory item could not be found.`);
      return;
    }

    const qty = Number(row.qty) || 1;
    let availableStock = Number(actualItem.currentStock || 0);

    // If editing, account for the fact that the previous units from this transaction will be credited back
    if (editingTxn && Array.isArray(editingTxn.items)) {
      const prevMatchedItem = editingTxn.items.find(pi => (pi.actualInventoryId || pi.id) === actualItem.id);
      if (prevMatchedItem) {
        availableStock += Number(prevMatchedItem.qty || 0);
      }
    }

    // Rule: Prevent deducting more units than available in stock
    const actualDisplayName = getMedicineDisplayName(actualItem);
    if (qty > availableStock) {
      alert(`Line ${rowNum}: Cannot deduct ${qty} units of "${actualDisplayName}". Only ${availableStock} units are currently available (including restocked units).`);
      return;
    }

    const isSub = Boolean(row.isSubstitute || row.actualInventoryId !== row.selectedMedId);

    transactionItems.push({
      id: actualItem.id,                      // ID for receipt / display
      actualInventoryId: actualItem.id,       // Targeted for stock deduction
      name: actualDisplayName,                // Actual medicine supplied name
      actualSuppliedName: actualDisplayName,
      requestedName: requestedName || actualDisplayName, // Original name customer asked for
      isSubstitute: isSub,
      qty: qty,
      unitPrice: Number(row.unitPrice || 0),
      sellingPrice: Number(row.sellingPrice || actualItem.sellingPrice || 0),
      price: Number(row.sellingPrice || actualItem.sellingPrice || 0), // compatibility with receipt
      totalUnit: qty,
      subtotal: qty * (Number(row.sellingPrice) || 0)
    });
  }

  const grandTotal = transactionItems.reduce((sum, i) => sum + i.subtotal, 0);

  // 3. Construct transaction payload
  const txnPayload = {
    receiptNo: currentTxnForm.receiptNo && currentTxnForm.receiptNo.trim() ? currentTxnForm.receiptNo.trim() : undefined,
    customerName: currentTxnForm.customerName.trim(),
    budget: Number(currentTxnForm.budget) || 0,
    barangay: (currentTxnForm.barangay || '').trim(),
    date: currentTxnForm.date || new Date().toISOString().split('T')[0],
    items: transactionItems,
    subtotal: grandTotal,
    discountAmount: 0,
    netTotal: grandTotal,
    paymentMethod: 'Cash'
  };

  if (editingTxnId) {
    // Perform update: restocks original items and deducts new/substituted items
    const updated = window.pharmacyStore.updateTransaction(editingTxnId, txnPayload);
    const receiptName = updated ? updated.receiptNo : (txnPayload.receiptNo || 'Transaction');
    alert(`✓ Transaction ${receiptName} updated successfully!\nOriginal medicines have been restocked into inventory, and new/substituted medicines have been deducted.`);
  } else {
    // Normal new transaction
    const newTxn = window.pharmacyStore.addTransaction(txnPayload);
    alert(`✓ Transaction ${newTxn.receiptNo} completed!\n${transactionItems.length} medicine item(s) deducted from inventory.`);
  }

  // 4. Reset form and refresh view
  resetCustomerForm();
  renderTransactionsView(document.getElementById('main-content'));
};

// --- General Navigation & Filters ---

window.switchTxnTab = function (tab) {
  txnCurrentTab = tab;
  renderTransactionsView(document.getElementById('main-content'));
};

window.updateTxnFilter = function (key, val) {
  txnSearchFilters[key] = val;
  txnHistoryPage = 1;
  renderTransactionsView(document.getElementById('main-content'));
};

window.toggleExpandTxn = function (id) {
  expandedTxnId = (expandedTxnId === id) ? null : id;
  renderTransactionsView(document.getElementById('main-content'));
};

window.handleRefundTxn = function (id) {
  if (confirm('Are you sure you want to void this transaction? All supplied items will be automatically restocked into inventory.')) {
    window.pharmacyStore.refundTransaction(id, 'Void / Customer return');
    renderTransactionsView(document.getElementById('main-content'));
  }
};

window.exportTransactionsCSV = function () {
  const txns = window.pharmacyStore.getTransactions();
  const headers = ['Receipt No,Date,Time,Customer,Barangay,Budget,Items Supplied,Net Total,Status'];
  const rows = txns.map(t => [
    t.receiptNo,
    t.date,
    `"${t.time || ''}"`,
    `"${t.customerName || 'Walk-in'}"`,
    `"${t.barangay || ''}"`,
    t.budget || 0,
    `"${t.items.map(i => `${i.name} (x${i.qty})`).join('; ')}"`,
    t.netTotal,
    t.status
  ].join(','));

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `AffordaLabs_InOut_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.handleTxnHistoryPageChange = function (newPage) {
  txnHistoryPage = newPage;
  renderTransactionsView(document.getElementById('main-content'));
};

window.handleDeleteTxn = function (id) {
  const txn = window.pharmacyStore.getTransactions().find(t => t.id === id);
  const name = txn ? (txn.customerName || txn.receiptNo) : 'this transaction';
  if (confirm(`Are you sure you want to delete the transaction record for "${name}"?`)) {
    window.pharmacyStore.deleteTransaction(id, false);
    renderTransactionsView(document.getElementById('main-content'));
  }
};

window.handleTxnDateFilter = function () {
  alert('Date filter applied to In - Out log records.');
};
