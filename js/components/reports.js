/**
 * Reports & Analytics View Component
 * Subtabs, Single-Day Date Filter (Asia/Manila), Profit & COGS by Item bar chart,
 * Product Mix, BIR Senior/PWD Log, FDA Prescription (Rx) Log, and Audit Trail.
 */

let reportsCurrentTab = 'CHARTS';
let reportsSelectedDate = ''; // YYYY-MM-DD (Asia/Manila); '' = today
let reportsDateTimer = null;
let reportsProductMixPage = 1;
const REPORTS_MIX_PAGE_SIZE = 50;

function reportsTodayStr() {
  return window.pharmacyStore.getManilaDateStr();
}

function reportsActiveDate() {
  const today = reportsTodayStr();
  if (!reportsSelectedDate || reportsSelectedDate > today) reportsSelectedDate = today;
  return reportsSelectedDate;
}

function reportsShiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function reportsLongDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });
}

window.setReportsDate = function (dateStr) {
  const today = reportsTodayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return;
  reportsSelectedDate = dateStr > today ? today : dateStr;
  reportsProductMixPage = 1;
  renderReportsView(document.getElementById('main-content'));
};

function reportsDateIsComplete(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v || '') && Number(v.slice(0, 4)) >= 2000;
}

window.queueReportsDate = function (v) {
  clearTimeout(reportsDateTimer);
  if (!reportsDateIsComplete(v)) return;
  reportsDateTimer = setTimeout(() => window.applyReportsDate(v), 1800);
};

window.applyReportsDate = function (v) {
  clearTimeout(reportsDateTimer);
  if (!reportsDateIsComplete(v) || v === reportsSelectedDate) return;
  window.setReportsDate(v);
};

window.shiftReportsDate = function (days) {
  window.setReportsDate(reportsShiftDate(reportsActiveDate(), days));
};

function escapeReportHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderReportsView(container) {
  const items = window.pharmacyStore.getItems();
  const selDate = reportsActiveDate();
  const todayStr = reportsTodayStr();
  const isToday = selDate === todayStr;
  const dateLabel = reportsLongDate(selDate);

  const allDayTxns = window.pharmacyStore.getTransactions().filter(t => String(t.date || '').slice(0, 10) === selDate);
  const txns = allDayTxns.filter(t => t.status !== 'Refunded');
  const itemLookup = new Map(items.map(i => [i.id, i]));

  // Aggregate real sales for the selected date by actualInventoryId || id (no fake/random fallback)
  const soldByItemId = new Map();
  txns.forEach(t => {
    (t.items || []).forEach(sold => {
      const targetId = sold.actualInventoryId || sold.id;
      if (!targetId) return;
      const qty = Number(sold.qty || 0);
      const inv = itemLookup.get(targetId);
      const unitCost = Number(sold.unitPrice) > 0
        ? Number(sold.unitPrice)
        : (inv && Number(inv.costPrice) > 0 ? Number(inv.costPrice) : 0);
      const unitSale = (sold.congPrice !== undefined && sold.congPrice !== null && Number(sold.congPrice) > 0)
        ? Number(sold.congPrice)
        : Number(sold.price || sold.sellingPrice || 0);
      const lineRevenue = (sold.subtotal !== undefined && sold.subtotal !== null)
        ? Number(sold.subtotal)
        : qty * unitSale;
      const lineCogs = qty * unitCost;

      const cur = soldByItemId.get(targetId) || { unitsSold: 0, cogs: 0, revenue: 0 };
      cur.unitsSold += qty;
      cur.cogs += lineCogs;
      cur.revenue += lineRevenue;
      soldByItemId.set(targetId, cur);
    });
  });

  const itemStats = items
    .filter(item => soldByItemId.has(item.id))
    .map(item => {
      const agg = soldByItemId.get(item.id);
      const profit = agg.revenue - agg.cogs;
      return {
        ...item,
        unitsSold: agg.unitsSold,
        cogs: agg.cogs,
        revenue: agg.revenue,
        profit
      };
    })
    .sort((a, b) => b.profit - a.profit);

  const topItem = itemStats[0] || null;
  const top8 = itemStats.slice(0, 8);
  const rawMax = Math.max(100, ...top8.map(i => Math.max(0, i.cogs) + Math.max(0, i.profit)));
  const maxAxis = Math.ceil(rawMax / 100) * 100;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxAxis * f));

  // Real Audit Trail entries for the selected date (transactions, edits, refunds, cash drawer adjustments)
  const auditEntries = [];
  allDayTxns.forEach(t => {
    const actor = t.encoderName || t.cashier || 'Staff';
    auditEntries.push({
      sortAt: Number(t._ord || 0),
      time: t.time || '-',
      event: 'Sale Completed',
      badgeBg: '#dcfce7',
      badgeFg: '#15803d',
      ref: t.receiptNo || t.id,
      actor,
      details: `${t.customerName || 'Walk-in'} • ${(t.items || []).length} item(s) • ₱${Number(t.netTotal || 0).toFixed(2)}`
    });
    if (t.editedAt) {
      auditEntries.push({
        sortAt: new Date(t.editedAt).getTime() || Number(t._ord || 0) + 1,
        time: new Date(t.editedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        event: 'Transaction Edited',
        badgeBg: '#fef3c7',
        badgeFg: '#b45309',
        ref: t.receiptNo || t.id,
        actor,
        details: `Updated order for ${t.customerName || 'Walk-in'} • ₱${Number(t.netTotal || 0).toFixed(2)}`
      });
    }
    if (t.status === 'Refunded') {
      auditEntries.push({
        sortAt: (t.refundDate ? new Date(t.refundDate).getTime() : 0) || Number(t._ord || 0) + 2,
        time: t.refundDate ? new Date(t.refundDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (t.time || '-'),
        event: 'Void / Refund',
        badgeBg: '#fee2e2',
        badgeFg: '#b91c1c',
        ref: t.receiptNo || t.id,
        actor,
        details: `${t.refundReason || 'Void / Customer return'} • Restocked ₱${Number(t.netTotal || 0).toFixed(2)}`
      });
    }
  });
  const drawer = window.pharmacyStore.getDrawer();
  if (drawer && String(drawer.shiftDate || '').slice(0, 10) === selDate && Array.isArray(drawer.adjustments)) {
    drawer.adjustments.forEach(adj => {
      auditEntries.push({
        sortAt: Number(String(adj.id || '').replace(/\D/g, '')) || Date.now(),
        time: adj.time || '-',
        event: adj.type === 'in' ? 'Cash Drawer In' : 'Cash Drawer Out',
        badgeBg: adj.type === 'in' ? '#e0f2fe' : '#ffedd5',
        badgeFg: adj.type === 'in' ? '#0369a1' : '#c2410c',
        ref: 'DRAWER',
        actor: adj.by || drawer.openedBy || 'Cashier',
        details: `${adj.reason || 'Adjustment'} • ₱${Number(adj.amount || 0).toFixed(2)}`
      });
    });
  }
  auditEntries.sort((a, b) => b.sortAt - a.sortAt);

  const rxEntries = txns.flatMap(t => (t.items || []).filter(i => i.isRx).map(i => ({ txn: t, item: i })));
  const discTxns = txns.filter(t => Number(t.discountAmount || 0) > 0);
  const totalMixItems = itemStats.length;
  const totalMixPages = Math.ceil(totalMixItems / REPORTS_MIX_PAGE_SIZE) || 1;
  if (reportsProductMixPage > totalMixPages) reportsProductMixPage = totalMixPages;
  if (reportsProductMixPage < 1) reportsProductMixPage = 1;
  const mixStartIdx = (reportsProductMixPage - 1) * REPORTS_MIX_PAGE_SIZE;
  const pagedMixItems = itemStats.slice(mixStartIdx, mixStartIdx + REPORTS_MIX_PAGE_SIZE);

  container.innerHTML = `
    <!-- Top Subtabs -->
    <div class="subtabs-bar">
      ${['CHARTS', 'PRODUCT MIX', 'SENIOR & PWD LOG', 'PRESCRIPTION (Rx) LOG', 'AUDIT TRAIL'].map(tab => `
        <button class="subtab-btn ${reportsCurrentTab === tab ? 'active' : ''}" onclick="switchReportsTab('${tab}')">
          ${tab}
        </button>
      `).join('')}
    </div>

    <!-- Single-Day Date Filter (Asia/Manila) -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
      <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
        Showing report data for <strong style="color: var(--text-main);">${dateLabel}</strong> (12:00am - 11:59pm)
      </div>
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.35rem 0.6rem; display: flex; align-items: center; gap: 0.45rem; font-size: 0.82rem; color: var(--text-muted); box-shadow: var(--shadow-sm);">
        <span style="font-size: 0.74rem; text-transform: uppercase; font-weight: 700;">Date Filter:</span>
        <button type="button" onclick="shiftReportsDate(-1)" class="btn-outline" style="padding: 2px 7px; font-size: 0.9rem; font-weight: 800; line-height: 1;" title="Previous day">‹</button>
        <input type="date" id="reportsDatePicker" value="${selDate}" min="2000-01-01" max="${todayStr}" onchange="queueReportsDate(this.value)" onblur="applyReportsDate(this.value)" onkeydown="if(event.key==='Enter'){applyReportsDate(this.value);}" style="background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px; padding: 3px 6px; font-size: 0.8rem; font-weight: 700; color-scheme: light dark;" title="Pick a date" />
        <button type="button" onclick="shiftReportsDate(1)" class="btn-outline" ${isToday ? 'disabled' : ''} style="padding: 2px 7px; font-size: 0.9rem; font-weight: 800; line-height: 1; ${isToday ? 'opacity: 0.4; cursor: not-allowed;' : ''}" title="Next day">›</button>
        <button type="button" onclick="setReportsDate('${todayStr}')" class="btn-outline" ${isToday ? 'disabled' : ''} style="padding: 3px 9px; font-size: 0.76rem; font-weight: 700; ${isToday ? 'opacity: 0.5; cursor: default;' : 'color: var(--primary); border-color: var(--primary);'}" title="Jump to today">Today</button>
      </div>
    </div>

    ${reportsCurrentTab === 'CHARTS' ? `
      <div class="card" style="padding: 1.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--primary); margin-bottom: 0.25rem;">
              Profit and COGS by Item
            </h3>
            <div style="font-size: 0.85rem; color: #10b981; font-weight: 600;">
              ${topItem ? `Top profit item: ${escapeReportHtml(topItem.brandName || topItem.name)} with ₱${topItem.profit.toFixed(2)}` : `No completed sales recorded for ${dateLabel}`}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              ${dateLabel} (12:00am - 11:59pm)
            </div>
          </div>
          <div style="display: flex; gap: 1rem; font-size: 0.78rem; font-weight: 600;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 12px; height: 12px; background: #86efac; border-radius: 2px;"></span>
              <span>Gross Profit (₱)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 12px; height: 12px; background: #38bdf8; border-radius: 2px;"></span>
              <span>Cost of Goods (COGS ₱)</span>
            </div>
          </div>
        </div>

        ${top8.length === 0 ? `
          <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); font-size: 0.88rem;">
            No transactions for ${dateLabel}. Complete a sale in In - Out to view Profit and COGS by item.
          </div>
        ` : `
          <div style="width: 100%; overflow-x: auto;">
            <div style="min-width: 750px; height: 380px; position: relative;">
              <svg viewBox="0 0 850 360" style="width: 100%; height: 100%;">
                ${yTicks.map(val => {
                  const y = 250 - (val / maxAxis) * 220;
                  return `
                    <line x1="60" y1="${y}" x2="820" y2="${y}" stroke="#e2e8f0" stroke-opacity="0.45" stroke-width="1" />
                    <text x="50" y="${y + 4}" text-anchor="end" font-size="10" fill="#94a3b8">₱${val.toLocaleString()}</text>
                  `;
                }).join('')}
                <line x1="60" y1="250" x2="820" y2="250" stroke="#94a3b8" stroke-width="1.5" />
                ${top8.map((item, idx) => {
                  const x = 85 + idx * 92;
                  const barWidth = 48;
                  const cogsHeight = Math.min(220, (Math.max(0, item.cogs) / maxAxis) * 220);
                  const profitHeight = Math.min(220 - cogsHeight, (Math.max(0, item.profit) / maxAxis) * 220);
                  const cogsY = 250 - cogsHeight;
                  const profitY = cogsY - profitHeight;
                  const label = (item.brandName || item.name || '').slice(0, 14).toUpperCase();
                  return `
                    <g class="bar-group">
                      <rect x="${x}" y="${cogsY}" width="${barWidth}" height="${cogsHeight}" fill="#38bdf8" rx="3" />
                      ${cogsHeight > 18 ? `<text x="${x + barWidth / 2}" y="${cogsY + cogsHeight / 2 + 4}" text-anchor="middle" font-size="9" fill="#0369a1" font-weight="700">${Math.round(item.cogs)}</text>` : ''}
                      <rect x="${x}" y="${profitY}" width="${barWidth}" height="${profitHeight}" fill="#86efac" rx="3" />
                      ${profitHeight > 18 ? `<text x="${x + barWidth / 2}" y="${profitY + profitHeight / 2 + 4}" text-anchor="middle" font-size="9" fill="#15803d" font-weight="700">${Math.round(item.profit)}</text>` : ''}
                      <text x="${x + barWidth / 2}" y="264" transform="rotate(45, ${x + barWidth / 2}, 264)" text-anchor="start" font-size="10" font-weight="600" fill="#64748b">${escapeReportHtml(label)}</text>
                    </g>
                  `;
                }).join('')}
              </svg>
            </div>
          </div>
        `}
      </div>
    ` : ''}

    ${reportsCurrentTab === 'PRODUCT MIX' ? `
      <div class="table-container">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
          <h4 style="font-size: 0.95rem; font-weight: 700;">Fast-Moving vs Slow-Moving Medicine Formulary (${dateLabel})</h4>
          <span style="font-size: 0.78rem; color: var(--text-muted);">${itemStats.length} active SKU(s) sold</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Medicine &amp; Generic</th>
              <th>Category</th>
              <th style="text-align: right;">Units Dispensed</th>
              <th style="text-align: right;">Total COGS</th>
              <th style="text-align: right;">Gross Sales</th>
              <th style="text-align: right;">Net Profit</th>
              <th style="text-align: center;">Velocity Class</th>
            </tr>
          </thead>
          <tbody>
            ${pagedMixItems.length === 0 ? `
              <tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No medicines sold on ${dateLabel}.</td></tr>
            ` : pagedMixItems.map((item, idx) => `
              <tr>
                <td style="font-weight: 700; color: var(--text-muted);">${mixStartIdx + idx + 1}</td>
                <td>
                  <div style="font-weight: 700;">${escapeReportHtml(item.brandName || item.name)}</div>
                  <div style="font-size: 0.72rem; color: var(--primary);">${escapeReportHtml(item.genericName || '')}</div>
                </td>
                <td style="font-size: 0.78rem;">${escapeReportHtml(item.category || '')}</td>
                <td style="text-align: right; font-weight: 600;">${item.unitsSold}</td>
                <td style="text-align: right; color: #0284c7;">₱${item.cogs.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 600;">₱${item.revenue.toFixed(2)}</td>
                <td style="text-align: right; color: #16a34a; font-weight: 700;">₱${item.profit.toFixed(2)}</td>
                <td style="text-align: center;">
                  <span class="badge" style="${(mixStartIdx + idx) < 3 ? 'background: #dcfce7; color: #15803d;' : 'background: #f1f5f9; color: #64748b;'}">
                    ${(mixStartIdx + idx) < 3 ? 'Fast Mover (Class A)' : 'Normal Mover (Class B)'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${totalMixItems > REPORTS_MIX_PAGE_SIZE ? `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; border-top: 1px solid var(--border-light); font-size: 0.78rem; color: var(--text-muted);">
            <span>Showing <strong>${mixStartIdx + 1}</strong> to <strong>${Math.min(mixStartIdx + REPORTS_MIX_PAGE_SIZE, totalMixItems)}</strong> of <strong>${totalMixItems}</strong> SKUs</span>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <button type="button" onclick="handleReportsMixPageChange(${reportsProductMixPage - 1})" class="btn-outline" ${reportsProductMixPage === 1 ? 'disabled' : ''} style="padding: 3px 10px; font-size: 0.75rem;">‹ Prev</button>
              <span style="font-weight: 700; color: var(--text-main);">Page ${reportsProductMixPage} of ${totalMixPages}</span>
              <button type="button" onclick="handleReportsMixPageChange(${reportsProductMixPage + 1})" class="btn-outline" ${reportsProductMixPage === totalMixPages ? 'disabled' : ''} style="padding: 3px 10px; font-size: 0.75rem;">Next ›</button>
            </div>
          </div>
        ` : ''}
      </div>
    ` : ''}

    ${reportsCurrentTab === 'SENIOR & PWD LOG' ? `
      <div class="table-container">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 700;">Bureau of Internal Revenue (BIR) Senior &amp; PWD Sales Book</h4>
            <div style="font-size: 0.75rem; color: var(--text-muted);">In compliance with RA 9994 (Expanded Senior Citizens Act) &amp; RA 10754</div>
          </div>
          <button onclick="window.print()" class="btn-outline" style="font-size: 0.78rem;">Print BIR Log</button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Date / Time</th>
              <th>OR Number</th>
              <th>Discount Classification</th>
              <th>Senior / PWD ID #</th>
              <th style="text-align: right;">Gross Sales</th>
              <th style="text-align: right;">VAT Exemption (12%)</th>
              <th style="text-align: right;">20% Special Discount</th>
              <th style="text-align: right;">Net Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${discTxns.length === 0 ? `
              <tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No Senior Citizen or PWD discounted transactions recorded for ${dateLabel}.</td></tr>
            ` : discTxns.map(t => `
              <tr>
                <td>${escapeReportHtml(t.date)} ${escapeReportHtml(t.time)}</td>
                <td style="font-family: monospace; font-weight: 700;">${escapeReportHtml(t.receiptNo)}</td>
                <td><span class="badge" style="background: #fef3c7; color: #b45309;">${escapeReportHtml(t.customerType)}</span></td>
                <td style="font-family: monospace; font-weight: 600;">${escapeReportHtml(t.customerId || 'ID-ON-FILE')}</td>
                <td style="text-align: right;">₱${Number(t.subtotal || 0).toFixed(2)}</td>
                <td style="text-align: right; color: var(--text-muted);">₱${(Number(t.subtotal || 0) - (Number(t.subtotal || 0) / 1.12)).toFixed(2)}</td>
                <td style="text-align: right; color: #16a34a; font-weight: 700;">₱${Number(t.discountAmount || 0).toFixed(2)}</td>
                <td style="text-align: right; font-weight: 800;">₱${Number(t.netTotal || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    ${reportsCurrentTab === 'PRESCRIPTION (Rx) LOG' ? `
      <div class="table-container">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light);">
          <h4 style="font-size: 0.95rem; font-weight: 700;">FDA Prescription Dispensing Record (Rx Logbook)</h4>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Mandatory tracking of antibiotics and prescription-only medications</div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>OR No.</th>
              <th>Prescribed Drug &amp; Formulation</th>
              <th>Qty Dispensed</th>
              <th>Attending Physician / PRC Lic #</th>
              <th>Dispensing Pharmacist</th>
            </tr>
          </thead>
          <tbody>
            ${rxEntries.length === 0 ? `
              <tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No prescription (Rx) items dispensed on ${dateLabel}.</td></tr>
            ` : rxEntries.map(entry => `
              <tr>
                <td>${escapeReportHtml(entry.txn.date)}</td>
                <td style="font-family: monospace;">${escapeReportHtml(entry.txn.receiptNo)}</td>
                <td style="font-weight: 600; color: #b91c1c;">
                  ${escapeReportHtml(entry.item.actualSuppliedName || entry.item.name)} <span class="badge badge-rx">Rx</span>
                </td>
                <td style="font-weight: 700;">${entry.item.qty}</td>
                <td>${escapeReportHtml(entry.txn.doctorRx || 'Not recorded')}</td>
                <td>
                  <div style="font-weight: 700;">${escapeReportHtml(entry.txn.encoderName || entry.txn.cashier)}</div>
                  ${(entry.txn.encoderLicense || entry.txn.cashierLicense) ? `<div style="font-size: 0.72rem; color: #888888;">PRC Lic: ${escapeReportHtml(entry.txn.encoderLicense || entry.txn.cashierLicense)}</div>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    ${reportsCurrentTab === 'AUDIT TRAIL' ? `
      <div class="table-container">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 700;">Daily Transaction &amp; Cash Drawer Audit Trail (${dateLabel})</h4>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Recorded sales, edits, void/refunds, and drawer adjustments</div>
          </div>
          <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">${auditEntries.length} event(s)</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Event</th>
              <th>Reference</th>
              <th>Staff / Operator</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${auditEntries.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No audit events recorded for ${dateLabel}.</td></tr>
            ` : auditEntries.map(ev => `
              <tr>
                <td style="font-family: monospace; font-size: 0.8rem;">${escapeReportHtml(ev.time)}</td>
                <td><span class="badge" style="background: ${ev.badgeBg}; color: ${ev.badgeFg}; font-weight: 700;">${escapeReportHtml(ev.event)}</span></td>
                <td style="font-family: monospace; font-weight: 700;">${escapeReportHtml(ev.ref)}</td>
                <td style="font-weight: 600;">${escapeReportHtml(ev.actor)}</td>
                <td style="font-size: 0.82rem; color: var(--text-muted);">${escapeReportHtml(ev.details)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
  `;

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

window.switchReportsTab = function (tab) {
  reportsCurrentTab = tab;
  reportsProductMixPage = 1;
  renderReportsView(document.getElementById('main-content'));
};

window.handleReportsMixPageChange = function (newPage) {
  reportsProductMixPage = newPage;
  renderReportsView(document.getElementById('main-content'));
};
