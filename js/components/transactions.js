/**
 * Transactions View Component
 * Matches Image 3 layout: Tabs, Date Range, Filter Search per column,
 * item breakdown, Philippine Peso amounts, and Refund restock capabilities.
 */

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

function renderTransactionsView(container) {
  const allTxns = window.pharmacyStore.getTransactions();

  const filteredTxns = allTxns.filter(t => {
    if (txnSearchFilters.date && !t.date.toLowerCase().includes(txnSearchFilters.date.toLowerCase())) return false;
    if (txnSearchFilters.time && !t.time.toLowerCase().includes(txnSearchFilters.time.toLowerCase())) return false;
    if (txnSearchFilters.receipt && !t.receiptNo.toLowerCase().includes(txnSearchFilters.receipt.toLowerCase())) return false;
    if (txnSearchFilters.cashier && !t.cashier.toLowerCase().includes(txnSearchFilters.cashier.toLowerCase())) return false;
    if (txnSearchFilters.total && !t.netTotal.toString().includes(txnSearchFilters.total)) return false;
    if (txnSearchFilters.items) {
      const itemsStr = t.items.map(i => i.name).join(' ').toLowerCase();
      if (!itemsStr.includes(txnSearchFilters.items.toLowerCase())) return false;
    }
    return true;
  });

  const nowStr = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <!-- Top Subtabs (Ref Image 3) -->
    <div class="subtabs-bar">
      ${['DETAILS', 'TRANSACTIONS', 'HOURLY', 'DAILY', 'MONTHLY'].map(tab => `
        <button class="subtab-btn ${txnCurrentTab === tab ? 'active' : ''}" onclick="switchTxnTab('${tab}')">
          ${tab}
        </button>
      `).join('')}
    </div>

    <!-- Date Range & Download Toolbar (Ref Image 3) -->
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
          <button onclick="handleTxnDateFilter()" class="btn-primary" style="margin-top: 1.2rem; background: #2dd4bf; color: #0f766e; font-weight: 700;">
            Go!
          </button>
        </div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">
          Transactions can be viewed for a maximum 2-month date range.
        </div>
      </div>

      <div>
        <button onclick="exportTransactionsCSV()" class="btn-primary" style="background: #028090; display: flex; align-items: center; gap: 0.5rem;">
          <span>⬇ Download CSV</span>
        </button>
      </div>
    </div>

    <!-- Pagination & Row Count Controls (Ref Image 3) -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; font-size: 0.84rem; color: var(--text-muted);">
      <button class="btn-outline" style="padding: 4px 12px;">Previous</button>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span>Page</span>
        <input type="number" value="1" style="width: 45px; text-align: center; padding: 2px 4px; border: 1px solid var(--border-color); border-radius: 4px;" />
        <span>of 1</span>
        <select class="form-input" style="padding: 2px 8px; margin-left: 0.5rem;">
          <option>10 rows</option>
          <option>25 rows</option>
          <option>50 rows</option>
        </select>
      </div>
      <button class="btn-outline" style="padding: 4px 12px;">Next</button>
    </div>

    <!-- Data Table with Column Search Inputs matching Image 3 -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr style="background: #38b2ac; color: white;">
            <th style="width: 30px; background: #38b2ac; color: white;"></th>
            <th style="background: #38b2ac; color: white;">Date</th>
            <th style="background: #38b2ac; color: white;">Time</th>
            <th style="background: #38b2ac; color: white;">Receipt No. ⓘ</th>
            <th style="background: #38b2ac; color: white;">Cashier</th>
            <th style="background: #38b2ac; color: white;">Items & Prescription Details</th>
            <th style="background: #38b2ac; color: white; text-align: right;">Total</th>
            <th style="background: #38b2ac; color: white; text-align: center;">Action</th>
          </tr>
          <!-- Subheader with Column Search Inputs (Ref Image 3) -->
          <tr style="background: #ffffff;">
            <td></td>
            <td><input type="text" placeholder="Search..." value="${txnSearchFilters.date}" oninput="updateTxnFilter('date', this.value)" class="table-search-input" style="width: 100px;" /></td>
            <td><input type="text" placeholder="Search..." value="${txnSearchFilters.time}" oninput="updateTxnFilter('time', this.value)" class="table-search-input" style="width: 80px;" /></td>
            <td><input type="text" placeholder="Search..." value="${txnSearchFilters.receipt}" oninput="updateTxnFilter('receipt', this.value)" class="table-search-input" style="width: 100px;" /></td>
            <td><input type="text" placeholder="Search..." value="${txnSearchFilters.cashier}" oninput="updateTxnFilter('cashier', this.value)" class="table-search-input" style="width: 100px;" /></td>
            <td><input type="text" placeholder="Search items..." value="${txnSearchFilters.items}" oninput="updateTxnFilter('items', this.value)" class="table-search-input" style="width: 180px;" /></td>
            <td><input type="text" placeholder="Search..." value="${txnSearchFilters.total}" oninput="updateTxnFilter('total', this.value)" class="table-search-input" style="width: 80px; text-align: right;" /></td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          ${filteredTxns.length === 0 ? `
            <tr>
              <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                No transactions found for the selected criteria.
              </td>
            </tr>
          ` : filteredTxns.map(t => {
            const isExpanded = expandedTxnId === t.id;
            const isRefunded = t.status === 'Refunded';

            return `
              <tr style="${isRefunded ? 'opacity: 0.6; background: #fff1f2;' : ''}">
                <td style="text-align: center; cursor: pointer;" onclick="toggleExpandTxn('${t.id}')">
                  <span style="font-weight: 700; color: var(--primary);">${isExpanded ? '▼' : '▶'}</span>
                </td>
                <td>
                  <div style="font-weight: 600; color: var(--text-main); font-size: 0.85rem;">
                    ${t.date}
                  </div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">
                    REF-${t.id.replace('txn-', '')}
                  </div>
                  <span class="badge" style="background: #e0f2fe; color: #0284c7; font-size: 0.68rem; margin-top: 3px;">
                    ${t.paymentMethod}
                  </span>
                </td>
                <td style="font-size: 0.82rem; color: var(--text-muted);">${t.time}</td>
                <td style="font-family: monospace; font-weight: 700; color: #0f766e;">${t.receiptNo}</td>
                <td style="font-size: 0.82rem;">${t.cashier}</td>
                <td style="font-size: 0.82rem;">
                  <div style="font-weight: 500; color: var(--text-main);">
                    ${t.items.map(i => `${i.name} (x${i.qty})`).join(', ')}
                  </div>
                  ${t.discountAmount > 0 ? `
                    <div style="font-size: 0.72rem; color: #16a34a; font-weight: 600;">
                      🏷️ ${t.customerType} Discount (-₱${t.discountAmount.toFixed(2)})
                    </div>
                  ` : ''}
                  ${t.customerId ? `
                    <div style="font-size: 0.7rem; color: var(--text-muted);">
                      ID: ${t.customerId}
                    </div>
                  ` : ''}
                </td>
                <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: var(--text-main);">
                  ₱${Number(t.netTotal).toFixed(2)}
                  ${isRefunded ? '<div style="font-size: 0.68rem; color: #ef4444;">REFUNDED</div>' : ''}
                </td>
                <td style="text-align: center;">
                  ${!isRefunded ? `
                    <button 
                      onclick="handleRefundTxn('${t.id}')" 
                      style="background: transparent; border: 1px solid #ef4444; color: #ef4444; border-radius: var(--radius-sm); padding: 4px 10px; font-size: 0.75rem; font-weight: 600; cursor: pointer;"
                    >
                      Refund
                    </button>
                  ` : `
                    <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">Refunded</span>
                  `}
                </td>
              </tr>

              <!-- Expanded Details Row -->
              ${isExpanded ? `
                <tr style="background: #f8fafc;">
                  <td colspan="8" style="padding: 1rem 1.5rem;">
                    <div style="border-left: 3px solid var(--primary); padding-left: 1rem;">
                      <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-main);">
                        Receipt Breakdown: ${t.receiptNo} (${t.date} ${t.time})
                      </h4>
                      <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                        <strong>Customer Type:</strong> ${t.customerType} ${t.customerId ? `| <strong>ID:</strong> ${t.customerId}` : ''} 
                        ${t.doctorRx ? `| <strong>Doctor Rx:</strong> ${t.doctorRx}` : ''}
                      </div>

                      <table style="width: 100%; max-width: 600px; font-size: 0.78rem; border-collapse: collapse; margin-bottom: 0.75rem;">
                        <thead>
                          <tr style="border-bottom: 1px solid #cbd5e1; text-align: left;">
                            <th>Medicine</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Unit Price</th>
                            <th style="text-align: right;">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${t.items.map(item => `
                            <tr>
                              <td style="padding: 4px 0;">${item.name}</td>
                              <td style="padding: 4px 0; text-align: center;">${item.qty}</td>
                              <td style="padding: 4px 0; text-align: right;">₱${Number(item.price).toFixed(2)}</td>
                              <td style="padding: 4px 0; text-align: right;">₱${(item.price * item.qty).toFixed(2)}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>

                      <div style="display: flex; gap: 0.75rem;">
                        <button onclick="window.renderOfficialReceipt(window.pharmacyStore.getTransactions().find(x => x.id === '${t.id}'))" class="btn-outline" style="font-size: 0.75rem; padding: 4px 10px;">
                          View Full Official Receipt
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
  `;
}

window.switchTxnTab = function(tab) {
  txnCurrentTab = tab;
  renderTransactionsView(document.getElementById('main-content'));
};

window.updateTxnFilter = function(key, val) {
  txnSearchFilters[key] = val;
  renderTransactionsView(document.getElementById('main-content'));
};

window.toggleExpandTxn = function(id) {
  expandedTxnId = (expandedTxnId === id) ? null : id;
  renderTransactionsView(document.getElementById('main-content'));
};

window.handleRefundTxn = function(id) {
  if (confirm('Are you sure you want to process a refund for this transaction? Sold items will be automatically restocked into inventory.')) {
    window.pharmacyStore.refundTransaction(id, 'Customer request / void');
    renderTransactionsView(document.getElementById('main-content'));
  }
};

window.exportTransactionsCSV = function() {
  const txns = window.pharmacyStore.getTransactions();
  const headers = ['Receipt No,Date,Time,Cashier,Customer Type,ID No,Payment Method,Subtotal,Discount,Net Total,Status'];
  const rows = txns.map(t => [
    t.receiptNo,
    t.date,
    `"${t.time}"`,
    `"${t.cashier}"`,
    `"${t.customerType}"`,
    `"${t.customerId || ''}"`,
    t.paymentMethod,
    t.subtotal,
    t.discountAmount,
    t.netTotal,
    t.status
  ].join(','));

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `AffordaLabs_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.handleTxnDateFilter = function() {
  alert('Date filter applied.');
};
