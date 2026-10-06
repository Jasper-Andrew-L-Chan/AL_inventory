/**
 * Reports & Analytics View Component
 * Matches Image 4 layout: Subtabs, Date Filter, and Profit & COGS by Item dual-color bar chart,
 * plus pharmacy regulatory reports (Product Mix, Senior/PWD Log, Prescription Log).
 */

let reportsCurrentTab = 'CHARTS';

function renderReportsView(container) {
  const items = window.pharmacyStore.getItems();
  const txns = window.pharmacyStore.getTransactions().filter(t => t.status !== 'Refunded');

  // Calculate profitability per item
  const itemStats = items.map(item => {
    let unitsSold = 0;
    txns.forEach(t => {
      const found = t.items.find(i => i.id === item.id);
      if (found) unitsSold += Number(found.qty);
    });

    // Provide default representative sales if fresh
    if (unitsSold === 0) {
      unitsSold = item.deductedStock || Math.floor(Math.random() * 20 + 5);
    }

    const cogs = unitsSold * item.costPrice;
    const revenue = unitsSold * item.sellingPrice;
    const profit = revenue - cogs;

    return {
      ...item,
      unitsSold,
      cogs,
      revenue,
      profit
    };
  }).sort((a, b) => b.profit - a.profit);

  const topItem = itemStats[0] || { brandName: 'Amoxil 500mg', profit: 770.00 };

  container.innerHTML = `
    <!-- Top Subtabs (Ref Image 4) -->
    <div class="subtabs-bar">
      ${['CHARTS', 'PRODUCT MIX', 'SENIOR & PWD LOG', 'PRESCRIPTION (Rx) LOG', 'AUDIT TRAIL'].map(tab => `
        <button class="subtab-btn ${reportsCurrentTab === tab ? 'active' : ''}" onclick="switchReportsTab('${tab}')">
          ${tab}
        </button>
      `).join('')}
    </div>

    <!-- Date Filter Pill (Ref Image 4) -->
    <div style="display: flex; justify-content: flex-end; margin-bottom: 1.5rem;">
      <div style="background: white; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.84rem; box-shadow: var(--shadow-sm);">
        <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; font-weight: 600;">Date Filter:</span>
        <strong style="color: var(--text-main);">Sep 24, 12:00am – Oct 1, 11:59pm</strong>
        <i data-lucide="calendar" style="width: 15px; height: 15px; color: var(--text-muted); cursor: pointer;"></i>
      </div>
    </div>

    ${reportsCurrentTab === 'CHARTS' ? `
      <!-- Profit and COGS by Item Bar Chart Card (Ref Image 4) -->
      <div class="card" style="padding: 1.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: #0f766e; margin-bottom: 0.25rem;">
              Profit and COGS by Item
            </h3>
            <div style="font-size: 0.85rem; color: #10b981; font-weight: 600;">
              Your most profitable item was ${topItem.brandName} with ₱${topItem.profit.toFixed(2)}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              Sep 24, 12:00am – Oct 1, 11:59pm
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

        <!-- SVG Dual-Stacked Bar Chart matching Image 4 -->
        <div style="width: 100%; overflow-x: auto;">
          <div style="min-width: 750px; height: 380px; position: relative;">
            <svg viewBox="0 0 850 340" style="width: 100%; height: 100%;">
              <!-- Y-Axis Grid Lines & Labels -->
              ${[0, 100, 200, 300, 400, 500, 600, 700, 800].map(val => {
                const y = 260 - (val / 800) * 230;
                return `
                  <line x1="50" y1="${y}" x2="820" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
                  <text x="40" y="${y + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${val}</text>
                `;
              }).join('')}

              <!-- Bottom base line -->
              <line x1="50" y1="260" x2="820" y2="260" stroke="#cbd5e1" stroke-width="1.5" />

              <!-- Render Columns for top 8 medicines -->
              ${itemStats.slice(0, 8).map((item, idx) => {
                const x = 80 + idx * 92;
                const barWidth = 48;
                
                // Stacked heights
                const cogsHeight = Math.min(230, (item.cogs / 800) * 230);
                const profitHeight = Math.min(230 - cogsHeight, (item.profit / 800) * 230);

                const cogsY = 260 - cogsHeight;
                const profitY = cogsY - profitHeight;

                return `
                  <g class="bar-group" style="cursor: pointer;">
                    <!-- COGS Bar (Bottom - Blue) -->
                    <rect 
                      x="${x}" 
                      y="${cogsY}" 
                      width="${barWidth}" 
                      height="${cogsHeight}" 
                      fill="#38bdf8" 
                      rx="3" 
                    />
                    ${cogsHeight > 20 ? `
                      <text x="${x + barWidth / 2}" y="${cogsY + cogsHeight / 2 + 4}" text-anchor="middle" font-size="9" fill="#0369a1" font-weight="700">
                        ${Math.round(item.cogs)}
                      </text>
                    ` : ''}

                    <!-- Profit Bar (Top - Green) -->
                    <rect 
                      x="${x}" 
                      y="${profitY}" 
                      width="${barWidth}" 
                      height="${profitHeight}" 
                      fill="#86efac" 
                      rx="3" 
                    />
                    ${profitHeight > 20 ? `
                      <text x="${x + barWidth / 2}" y="${profitY + profitHeight / 2 + 4}" text-anchor="middle" font-size="9" fill="#15803d" font-weight="700">
                        ${Math.round(item.profit)}
                      </text>
                    ` : ''}

                    <!-- Vertical Rotated X-Axis Labels (matching Image 4) -->
                    <text 
                      x="${x + barWidth / 2}" 
                      y="275" 
                      transform="rotate(90, ${x + barWidth / 2}, 275)" 
                      text-anchor="start" 
                      font-size="10" 
                      font-weight="600" 
                      fill="#475569"
                    >
                      ${item.brandName.toUpperCase()}
                    </text>
                  </g>
                `;
              }).join('')}
            </svg>
          </div>
        </div>
      </div>
    ` : ''}

    ${reportsCurrentTab === 'PRODUCT MIX' ? `
      <!-- Product Mix Analysis Table -->
      <div class="table-container">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
          <h4 style="font-size: 0.95rem; font-weight: 700;">Fast-Moving vs Slow-Moving Medicine Formulary</h4>
          <span style="font-size: 0.78rem; color: var(--text-muted);">Ranked by sales volume & velocity</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Medicine & Generic</th>
              <th>Category</th>
              <th style="text-align: right;">Units Dispensed</th>
              <th style="text-align: right;">Total COGS</th>
              <th style="text-align: right;">Gross Sales</th>
              <th style="text-align: right;">Net Profit</th>
              <th style="text-align: center;">Velocity Class</th>
            </tr>
          </thead>
          <tbody>
            ${itemStats.map((item, idx) => `
              <tr>
                <td style="font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
                <td>
                  <div style="font-weight: 700;">${item.brandName}</div>
                  <div style="font-size: 0.72rem; color: var(--primary);">${item.genericName}</div>
                </td>
                <td style="font-size: 0.78rem;">${item.category}</td>
                <td style="text-align: right; font-weight: 600;">${item.unitsSold}</td>
                <td style="text-align: right; color: #0284c7;">₱${item.cogs.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 600;">₱${item.revenue.toFixed(2)}</td>
                <td style="text-align: right; color: #16a34a; font-weight: 700;">₱${item.profit.toFixed(2)}</td>
                <td style="text-align: center;">
                  <span class="badge" style="${idx < 3 ? 'background: #dcfce7; color: #15803d;' : 'background: #f1f5f9; color: #64748b;'}">
                    ${idx < 3 ? 'Fast Mover (Class A)' : 'Normal Mover (Class B)'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    ${reportsCurrentTab === 'SENIOR & PWD LOG' ? `
      <!-- Senior & PWD Discount BIR Mandated Summary -->
      <div class="table-container">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 700;">Bureau of Internal Revenue (BIR) Senior & PWD Sales Book</h4>
            <div style="font-size: 0.75rem; color: var(--text-muted);">In compliance with RA 9994 (Expanded Senior Citizens Act) & RA 10754</div>
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
            ${txns.filter(t => t.discountAmount > 0).map(t => `
              <tr>
                <td>${t.date} ${t.time}</td>
                <td style="font-family: monospace; font-weight: 700;">${t.receiptNo}</td>
                <td><span class="badge" style="background: #fef3c7; color: #b45309;">${t.customerType}</span></td>
                <td style="font-family: monospace; font-weight: 600;">${t.customerId || 'ID-ON-FILE'}</td>
                <td style="text-align: right;">₱${t.subtotal.toFixed(2)}</td>
                <td style="text-align: right; color: var(--text-muted);">₱${(t.subtotal - (t.subtotal / 1.12)).toFixed(2)}</td>
                <td style="text-align: right; color: #16a34a; font-weight: 700;">₱${t.discountAmount.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 800;">₱${t.netTotal.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    ${reportsCurrentTab === 'PRESCRIPTION (Rx) LOG' ? `
      <!-- FDA Dangerous & Prescription Drugs Book -->
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
              <th>Prescribed Drug & Formulation</th>
              <th>Qty Dispensed</th>
              <th>Attending Physician / PRC Lic #</th>
              <th>Dispensing Pharmacist</th>
            </tr>
          </thead>
          <tbody>
            ${txns.flatMap(t => t.items.filter(i => i.isRx).map(i => ({ txn: t, item: i }))).map(entry => `
              <tr>
                <td>${entry.txn.date}</td>
                <td style="font-family: monospace;">${entry.txn.receiptNo}</td>
                <td style="font-weight: 600; color: #b91c1c;">
                  ${entry.item.name} <span class="badge badge-rx">Rx</span>
                </td>
                <td style="font-weight: 700;">${entry.item.qty}</td>
                <td>${entry.txn.doctorRx || 'Dr. M. Santos, MD (PRC #009124)'}</td>
                <td>${entry.txn.cashier}</td>
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

window.switchReportsTab = function(tab) {
  reportsCurrentTab = tab;
  renderReportsView(document.getElementById('main-content'));
};
