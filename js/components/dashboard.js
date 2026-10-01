/**
 * Dashboard View Component
 * Matches Image 5 layout: KPI cards, Area Sales chart, Payment Breakdown
 */

function renderDashboardView(container) {
  const settings = window.pharmacyStore.getSettings();
  const metrics = window.pharmacyStore.getDashboardMetrics();
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', weekday: 'long' });

  container.innerHTML = `
    <!-- Top Sync Info Bar (Ref Image 5) -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <h2 style="font-size: 1.4rem; font-weight: 700; color: #0d9488;">Dashboard</h2>
        <span style="cursor: pointer; color: var(--text-muted); font-size: 0.9rem;" title="Pharmacy Real-Time Business Dashboard">ⓘ</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.78rem; color: var(--text-muted);">
        <span>Last synced at ${dateStr}, ${timeStr}</span>
        <button onclick="renderDashboardView(document.getElementById('main-content'))" style="background: none; border: none; cursor: pointer; color: var(--primary); font-weight: 600;">
          ↻ Refresh
        </button>
      </div>
    </div>

    <!-- 8 Rounded Pastel KPI Cards Grid (Ref Image 5) -->
    <div class="kpi-grid">
      <!-- 1. Total Net Sales -->
      <div class="kpi-card coral">
        <div class="kpi-header">
          <span>📊</span> Total Net Sales
        </div>
        <div class="kpi-value">₱${metrics.netSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
        <div class="kpi-sub">↑ 14% vs yesterday</div>
      </div>

      <!-- 2. Total Discounts (Senior/PWD) -->
      <div class="kpi-card teal">
        <div class="kpi-header">
          <span>%</span> Total Discounts
        </div>
        <div class="kpi-value">₱${metrics.discounts.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
        <div class="kpi-sub">Senior & PWD 20% Applied</div>
      </div>

      <!-- 3. No. of Transactions -->
      <div class="kpi-card mint">
        <div class="kpi-header">
          <span>🧾</span> No. of Transactions
        </div>
        <div class="kpi-value">${metrics.transactionCount}</div>
        <div class="kpi-sub">Average basket: ₱${metrics.transactionCount ? (metrics.netSales / metrics.transactionCount).toFixed(2) : '0.00'}</div>
      </div>

      <!-- 4. Cost of Goods (COGS) -->
      <div class="kpi-card orange">
        <div class="kpi-header">
          <span>🏷️</span> Cost of Goods
        </div>
        <div class="kpi-value">₱${metrics.costOfGoods.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
        <div class="kpi-sub">Direct inventory cost</div>
      </div>

      <!-- 5. No. of Items Dispensed -->
      <div class="kpi-card cyan">
        <div class="kpi-header">
          <span>💊</span> Dispensed Items
        </div>
        <div class="kpi-value">${metrics.itemsDispensed}</div>
        <div class="kpi-sub">Tablets, bottles, packs</div>
      </div>

      <!-- 6. Gross Profit -->
      <div class="kpi-card coral">
        <div class="kpi-header">
          <span>💵</span> Gross Profit
        </div>
        <div class="kpi-value">₱${metrics.grossProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
        <div class="kpi-sub">${metrics.netSales ? ((metrics.grossProfit / metrics.netSales) * 100).toFixed(1) : 0}% Margin</div>
      </div>

      <!-- 7. Total Refunds -->
      <div class="kpi-card orange">
        <div class="kpi-header">
          <span>↩</span> Total Refunds
        </div>
        <div class="kpi-value">₱${metrics.totalRefunds.toFixed(2)}</div>
        <div class="kpi-sub">Zero return issues today</div>
      </div>

      <!-- 8. Expiring Soon / Low Stock -->
      <div class="kpi-card mint">
        <div class="kpi-header">
          <span>⚠️</span> Batch Alerts
        </div>
        <div class="kpi-value">${metrics.expiringSoonCount + metrics.lowStockCount}</div>
        <div class="kpi-sub">${metrics.expiringSoonCount} Expiring / ${metrics.lowStockCount} Low Stock</div>
      </div>
    </div>

    <!-- Branch Subheader & Date Picker -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
      <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main);">
        Good afternoon, <span style="color: var(--primary);">${settings.pharmacyName.toUpperCase()}</span> - ${settings.branch.toUpperCase()}!
      </h3>
      <div style="background: white; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.4rem 0.85rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: var(--text-muted); box-shadow: var(--shadow-sm);">
        <span>Date Filter:</span>
        <strong style="color: var(--text-main);">Today (12:00am - 11:59pm)</strong>
        <span>📅</span>
      </div>
    </div>

    <!-- Bottom Section: Sales by Date Area Chart + Payment Types Breakdown -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.25rem; align-items: start;">
      <!-- Left Chart Card -->
      <div class="card" style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <div>
            <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main);">Sales by Date</h4>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Hourly Pharmacy POS Volume</div>
          </div>
          <!-- Time Interval Toggles -->
          <div style="display: flex; gap: 0.5rem; font-size: 0.78rem;">
            <button class="chart-tab active" onclick="setChartPeriod(this, 'hourly')" style="padding: 4px 10px; border-radius: 4px; border: 1px solid var(--primary); background: var(--primary-light); color: var(--primary); font-weight: 700; cursor: pointer;">Hourly</button>
            <button class="chart-tab" onclick="setChartPeriod(this, 'daily')" style="padding: 4px 10px; border-radius: 4px; border: 1px solid #cbd5e1; background: white; color: var(--text-muted); font-weight: 500; cursor: pointer;">Daily</button>
            <button class="chart-tab" onclick="setChartPeriod(this, 'monthly')" style="padding: 4px 10px; border-radius: 4px; border: 1px solid #cbd5e1; background: white; color: var(--text-muted); font-weight: 500; cursor: pointer;">Monthly</button>
          </div>
        </div>

        <!-- Smooth SVG Area Chart matching affordaLABS vibrant curve -->
        <div style="width: 100%; height: 260px; position: relative;">
          <svg viewBox="0 0 700 240" style="width: 100%; height: 100%; overflow: visible;">
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#FF5A00" stop-opacity="0.45" />
                <stop offset="100%" stop-color="#FF5A00" stop-opacity="0.03" />
              </linearGradient>
            </defs>

            <!-- Grid horizontal lines -->
            <line x1="40" y1="30" x2="680" y2="30" stroke="#f1f5f9" stroke-width="1" />
            <line x1="40" y1="80" x2="680" y2="80" stroke="#f1f5f9" stroke-width="1" />
            <line x1="40" y1="130" x2="680" y2="130" stroke="#f1f5f9" stroke-width="1" />
            <line x1="40" y1="180" x2="680" y2="180" stroke="#f1f5f9" stroke-width="1" />
            <line x1="40" y1="210" x2="680" y2="210" stroke="#e2e8f0" stroke-width="1" />

            <!-- Y Axis Labels (₱) -->
            <text x="30" y="35" text-anchor="end" font-size="10" fill="#94a3b8">900</text>
            <text x="30" y="85" text-anchor="end" font-size="10" fill="#94a3b8">700</text>
            <text x="30" y="135" text-anchor="end" font-size="10" fill="#94a3b8">500</text>
            <text x="30" y="185" text-anchor="end" font-size="10" fill="#94a3b8">200</text>
            <text x="30" y="215" text-anchor="end" font-size="10" fill="#94a3b8">0</text>

            <!-- Area Path with smooth bezier curve -->
            <path d="M 60 210 
                     C 140 210, 160 200, 200 195 
                     C 250 190, 280 140, 340 70 
                     C 400 35, 430 40, 480 50 
                     C 530 65, 560 70, 620 75 
                     L 620 210 Z" 
                  fill="url(#salesGrad)" />

            <!-- Line Path -->
            <path d="M 60 210 
                     C 140 210, 160 200, 200 195 
                     C 250 190, 280 140, 340 70 
                     C 400 35, 430 40, 480 50 
                     C 530 65, 560 70, 620 75" 
                  fill="none" stroke="#FF5A00" stroke-width="3" stroke-linecap="round" />

            <!-- Data Point Circles -->
            <circle cx="200" cy="195" r="4.5" fill="#FF5A00" stroke="#ffffff" stroke-width="2" />
            <circle cx="340" cy="70" r="4.5" fill="#FF5A00" stroke="#ffffff" stroke-width="2" />
            <circle cx="480" cy="50" r="4.5" fill="#FF5A00" stroke="#ffffff" stroke-width="2" />
            <circle cx="620" cy="75" r="4.5" fill="#FF5A00" stroke="#ffffff" stroke-width="2" />

            <!-- X Axis Time Labels -->
            <text x="60" y="230" text-anchor="middle" font-size="10" fill="#94a3b8">8:00 AM</text>
            <text x="200" y="230" text-anchor="middle" font-size="10" fill="#94a3b8">10:00 AM</text>
            <text x="340" y="230" text-anchor="middle" font-size="10" fill="#94a3b8">12:00 PM</text>
            <text x="480" y="230" text-anchor="middle" font-size="10" fill="#94a3b8">2:00 PM</text>
            <text x="620" y="230" text-anchor="middle" font-size="10" fill="#94a3b8">4:00 PM</text>
          </svg>
        </div>
      </div>

      <!-- Right Payment Types Breakdown Card (Ref Image 5) -->
      <div class="card" style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main);">Payment Types</h4>
          <span style="color: var(--text-muted); font-size: 0.9rem; cursor: pointer;">•••</span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1.2rem;">
          Breakdown of collected methods today
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.9rem;">
          <!-- Cash -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700;">
                💵
              </div>
              <div>
                <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-main);">Cash</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Drawer register</div>
              </div>
            </div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">
              ₱${metrics.paymentTotals.Cash.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <!-- GrabMart / Grab Delivery -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700;">
                🛵
              </div>
              <div>
                <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-main);">GrabMart</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Online Delivery</div>
              </div>
            </div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">
              ₱${metrics.paymentTotals.Grab.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <!-- Maya (PayMaya) -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: #f7fee7; color: #65a30d; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700;">
                💳
              </div>
              <div>
                <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-main);">Maya QR</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Digital Wallet</div>
              </div>
            </div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">
              ₱${metrics.paymentTotals.Maya.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <!-- GCash -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700;">
                📱
              </div>
              <div>
                <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-main);">GCash QR</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Merchant Code</div>
              </div>
            </div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">
              ₱${metrics.paymentTotals.GCash.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <!-- Card / FoodPanda -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 32px; height: 32px; border-radius: 6px; background: #fdf2f8; color: #db2777; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700;">
                🛍️
              </div>
              <div>
                <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-main);">FoodPanda / Card</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Delivery / Terminal</div>
              </div>
            </div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">
              ₱${(metrics.paymentTotals.Card + metrics.paymentTotals.FoodPanda).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

window.setChartPeriod = function(btn, period) {
  document.querySelectorAll('.chart-tab').forEach(b => {
    b.classList.remove('active');
    b.style.borderColor = '#cbd5e1';
    b.style.background = 'white';
    b.style.color = '#64748b';
    b.style.fontWeight = '500';
  });
  btn.classList.add('active');
  btn.style.borderColor = 'var(--primary)';
  btn.style.background = 'var(--primary-light)';
  btn.style.color = 'var(--primary)';
  btn.style.fontWeight = '700';
};
