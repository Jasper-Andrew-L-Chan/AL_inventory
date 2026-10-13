/**
 * Dashboard View Component
 * Real-time AffordaLabs Pharmacy Business Dashboard
 * Reflects live customer sales, item deductions, hourly/daily trends, payment breakdowns,
 * and paginated/scrollable recent customer purchases feed.
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

let currentChartPeriod = 'hourly';
let dashboardFeedPage = 1;
const DASHBOARD_FEED_PAGE_SIZE = 10;
let dashboardFeedFilter = '';

function renderDashboardView(container) {
  const settings = window.pharmacyStore.getSettings();
  const metrics = window.pharmacyStore.getDashboardMetrics();
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const session = window.authStore ? window.authStore.getSession() : null;
  const userName = session ? session.firstName : 'Pharmacist';
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : (hour < 18 ? 'Good afternoon' : 'Good evening');

  const txns = metrics.allCompletedTxns || [];
  const chartData = generateDashboardChartData(txns, currentChartPeriod);

  // Filter sold items feed
  const allSoldItems = metrics.recentSold || [];
  const filteredSoldItems = allSoldItems.filter(item => {
    if (!dashboardFeedFilter) return true;
    const q = dashboardFeedFilter.toLowerCase();
    const rawDate = (item.date || '').toLowerCase();
    const formattedDate = formatDateMMDDYY(item.date).toLowerCase();
    return (
      (item.customerName || '').toLowerCase().includes(q) ||
      (item.receiptNo || '').toLowerCase().includes(q) ||
      (item.name || '').toLowerCase().includes(q) ||
      rawDate.includes(q) ||
      formattedDate.includes(q)
    );
  });

  const totalFeedItems = filteredSoldItems.length;
  const totalFeedPages = Math.ceil(totalFeedItems / DASHBOARD_FEED_PAGE_SIZE) || 1;
  if (dashboardFeedPage > totalFeedPages) dashboardFeedPage = totalFeedPages;
  if (dashboardFeedPage < 1) dashboardFeedPage = 1;

  const startIdx = (dashboardFeedPage - 1) * DASHBOARD_FEED_PAGE_SIZE;
  const pageSoldItems = filteredSoldItems.slice(startIdx, startIdx + DASHBOARD_FEED_PAGE_SIZE);

  container.innerHTML = `
    <!-- Top Sync Info Bar with Live Indicator & Quick Actions for PC Desktop -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--brand-charcoal); margin: 0; letter-spacing: -0.02em;">Dashboard</h2>
        <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.72rem; font-weight: 700; color: #16a34a; background: #dcfce7; padding: 3px 9px; border-radius: 9999px; border: 1px solid #bbf7d0;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #16a34a; display: inline-block; box-shadow: 0 0 6px rgba(22, 163, 74, 0.6);"></span>
          LIVE DESKTOP FEED
        </span>
      </div>

      <!-- Quick Action Counter Launchers (Desktop Optimized) -->
      <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
        <button onclick="window.appRouter.navigate('transactions')" class="btn-primary" style="background: var(--primary); font-size: 0.82rem; padding: 6px 14px; display: inline-flex; align-items: center; gap: 6px; box-shadow: var(--shadow-orange);" title="Open In - Out Transactions (POS)">
          <i data-lucide="plus-circle" style="width: 15px; height: 15px;"></i>
          <span>+ New Sale / Dispense</span>
        </button>
        <button onclick="window.appRouter.navigate('inventory')" class="btn-outline" style="font-size: 0.82rem; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px; background: white;" title="Receive or restock medicine batches">
          <i data-lucide="package-plus" style="width: 15px; height: 15px; color: var(--primary);"></i>
          <span>+ Receive Stock</span>
        </button>
        <button onclick="goToAlertsTab()" class="btn-outline" style="font-size: 0.82rem; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px; background: white; color: ${metrics.expiringSoonCount + metrics.lowStockCount > 0 ? '#b45309' : 'var(--text-main)'}; border-color: ${metrics.expiringSoonCount + metrics.lowStockCount > 0 ? '#fde68a' : 'var(--border-color)'};" title="View batch expiries & low stock alerts">
          <i data-lucide="alert-triangle" style="width: 15px; height: 15px; color: #f59e0b;"></i>
          <span>Batch Alerts (${metrics.expiringSoonCount + metrics.lowStockCount})</span>
        </button>
        <button onclick="renderDashboardView(document.getElementById('main-content'))" class="btn-outline" style="padding: 6px 10px; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 4px; background: white;" title="Refresh live counter numbers">
          <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    </div>

    <!-- 2-Tier Desktop Clinical KPI Grid -->
    <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
      <!-- Row 1: Financial & Margin Performance -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
        <!-- 1. Total Net Sales -->
        <div class="kpi-card-desktop" style="border-left: 4px solid #f97316;">
          <div class="kpi-head">
            <span class="kpi-title">Total Net Sales</span>
            <div class="kpi-icon-box" style="background: #fff7ed; color: #ea580c;">
              <i data-lucide="trending-up" style="width: 17px; height: 17px;"></i>
            </div>
          </div>
          <div class="kpi-val" style="color: #c2410c;">₱${metrics.netSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="kpi-footnote">
            <i data-lucide="check-circle-2" style="width: 13px; height: 13px; color: #16a34a;"></i>
            <span>${metrics.transactionCount} completed sales transaction${metrics.transactionCount === 1 ? '' : 's'}</span>
          </div>
        </div>

        <!-- 2. Gross Profit & Margin -->
        <div class="kpi-card-desktop" style="border-left: 4px solid #10b981;">
          <div class="kpi-head">
            <span class="kpi-title">Gross Profit</span>
            <div class="kpi-icon-box" style="background: #ecfdf5; color: #059669;">
              <i data-lucide="banknote" style="width: 17px; height: 17px;"></i>
            </div>
          </div>
          <div class="kpi-val" style="color: #047857;">₱${metrics.grossProfit.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="kpi-footnote">
            <span style="font-weight: 700; color: #059669; background: #d1fae5; padding: 1px 6px; border-radius: 4px;">
              ${metrics.netSales ? ((metrics.grossProfit / metrics.netSales) * 100).toFixed(1) : 0}% Margin
            </span>
            <span>After direct COGS</span>
          </div>
        </div>

        <!-- 3. Cost of Goods (COGS) -->
        <div class="kpi-card-desktop" style="border-left: 4px solid #6366f1;">
          <div class="kpi-head">
            <span class="kpi-title">Cost of Goods (COGS)</span>
            <div class="kpi-icon-box" style="background: #eef2ff; color: #4f46e5;">
              <i data-lucide="receipt" style="width: 17px; height: 17px;"></i>
            </div>
          </div>
          <div class="kpi-val">₱${metrics.costOfGoods.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="kpi-footnote">
            <i data-lucide="boxes" style="width: 13px; height: 13px;"></i>
            <span>Direct inventory supplier cost</span>
          </div>
        </div>

        <!-- 4. Discounts Granted (Senior / PWD) -->
        <div class="kpi-card-desktop" style="border-left: 4px solid #06b6d4;">
          <div class="kpi-head">
            <span class="kpi-title">Discounts Applied</span>
            <div class="kpi-icon-box" style="background: #ecfeff; color: #0891b2;">
              <i data-lucide="percent" style="width: 17px; height: 17px;"></i>
            </div>
          </div>
          <div class="kpi-val">₱${metrics.discounts.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="kpi-footnote">
            <i data-lucide="shield-check" style="width: 13px; height: 13px; color: #0891b2;"></i>
            <span>Senior Citizen & PWD legal deduction</span>
          </div>
        </div>
      </div>

      <!-- Row 2: Operational Volume & Batch Safety -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
        <!-- 5. Items Dispensed -->
        <div class="kpi-card-desktop" style="border-left: 4px solid #0284c7;">
          <div class="kpi-head">
            <span class="kpi-title">Items Dispensed</span>
            <div class="kpi-icon-box" style="background: #f0f9ff; color: #0284c7;">
              <i data-lucide="pill" style="width: 17px; height: 17px;"></i>
            </div>
          </div>
          <div class="kpi-val">${metrics.itemsDispensed} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">units</span></div>
          <div class="kpi-footnote">
            <span>Avg ₱${metrics.transactionCount ? (metrics.netSales / metrics.transactionCount).toFixed(2) : '0.00'} / transaction</span>
          </div>
        </div>

        <!-- 6. In - Out Stock Movements -->
        <div class="kpi-card-desktop" style="border-left: 4px solid #0d9488;">
          <div class="kpi-head">
            <span class="kpi-title">Stock Movements</span>
            <div class="kpi-icon-box" style="background: #f0fdfa; color: #0d9488;">
              <i data-lucide="arrow-left-right" style="width: 17px; height: 17px;"></i>
            </div>
          </div>
          <div class="kpi-val">${metrics.transactionCount} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">logs</span></div>
          <div class="kpi-footnote">
            <i data-lucide="clock" style="width: 13px; height: 13px;"></i>
            <span>Across current shift window</span>
          </div>
        </div>

        <!-- 7. Total Refunds -->
        <div class="kpi-card-desktop" style="border-left: 4px solid #8b5cf6;">
          <div class="kpi-head">
            <span class="kpi-title">Returns / Refunds</span>
            <div class="kpi-icon-box" style="background: #f5f3ff; color: #7c3aed;">
              <i data-lucide="rotate-ccw" style="width: 17px; height: 17px;"></i>
            </div>
          </div>
          <div class="kpi-val">₱${metrics.totalRefunds.toFixed(2)}</div>
          <div class="kpi-footnote">
            <i data-lucide="smile" style="width: 13px; height: 13px; color: #16a34a;"></i>
            <span>Zero customer return issues today</span>
          </div>
        </div>

        <!-- 8. Batch & Expiry Alerts -->
        <div class="kpi-card-desktop" onclick="goToAlertsTab()" style="border-left: 4px solid ${metrics.expiringSoonCount + metrics.lowStockCount > 0 ? '#eab308' : '#10b981'}; cursor: pointer;" title="Click to view Expiring and Low Stock Medicines">
          <div class="kpi-head">
            <span class="kpi-title">Batch & Stock Alerts</span>
            <div class="kpi-icon-box" style="background: ${metrics.expiringSoonCount + metrics.lowStockCount > 0 ? '#fefce8' : '#ecfdf5'}; color: ${metrics.expiringSoonCount + metrics.lowStockCount > 0 ? '#ca8a04' : '#059669'};">
              <i data-lucide="alert-triangle" style="width: 17px; height: 17px;"></i>
            </div>
          </div>
          <div class="kpi-val" style="color: ${metrics.expiringSoonCount + metrics.lowStockCount > 0 ? '#b45309' : '#047857'};">
            ${metrics.expiringSoonCount + metrics.lowStockCount}
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary); margin-left: 6px;">View →</span>
          </div>
          <div class="kpi-footnote">
            <span>${metrics.expiringSoonCount} Expiring Soon • ${metrics.lowStockCount} Needs Restock</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Branch Subheader & Live Desktop Sync Status -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
      <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 6px;">
        <span>${greeting},</span>
        <span style="color: var(--primary);">${userName}!</span>
        <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted);">Counter station ready at ${settings.pharmacyName} (${settings.branch})</span>
      </h3>
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <div style="background: white; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.4rem 0.85rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: var(--text-muted); box-shadow: var(--shadow-sm);">
          <span>Date Filter:</span>
          <strong style="color: var(--text-main);">Today (12:00am - 11:59pm)</strong>
          <i data-lucide="calendar" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
        </div>
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.4rem 0.75rem; font-size: 0.78rem; color: var(--text-muted);">
          Synced at <strong>${timeStr}</strong>
        </div>
      </div>
    </div>

    <!-- Middle Section: Sales Area Chart (Left) + Top Selling Medicines & Payment Breakdown (Right) -->
    <div style="display: grid; grid-template-columns: 1.55fr 1fr; gap: 1.25rem; align-items: start; margin-bottom: 1.5rem;">
      <!-- Left Chart Card -->
      <div class="card" style="padding: 1.5rem; margin-bottom: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="line-chart" style="width: 18px; height: 18px; color: var(--primary);"></i>
              <span>Sales by Date Trend</span>
            </h4>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
              ${currentChartPeriod === 'hourly' ? 'Hourly Pharmacy POS & In-Out Volume Today' : (currentChartPeriod === 'daily' ? 'Past 5 Days Daily Sales Trend' : 'Past 5 Months Sales Volume')}
            </div>
          </div>
          <!-- Time Interval Toggles -->
          <div style="display: flex; gap: 0.4rem; font-size: 0.78rem;">
            <button class="chart-tab ${currentChartPeriod === 'hourly' ? 'active' : ''}" onclick="switchDashboardChartPeriod('hourly')" style="padding: 4px 10px; border-radius: 4px; border: 1px solid ${currentChartPeriod === 'hourly' ? 'var(--primary)' : '#cbd5e1'}; background: ${currentChartPeriod === 'hourly' ? 'var(--primary-light)' : 'white'}; color: ${currentChartPeriod === 'hourly' ? 'var(--primary)' : 'var(--text-muted)'}; font-weight: ${currentChartPeriod === 'hourly' ? '700' : '500'}; cursor: pointer;">Hourly</button>
            <button class="chart-tab ${currentChartPeriod === 'daily' ? 'active' : ''}" onclick="switchDashboardChartPeriod('daily')" style="padding: 4px 10px; border-radius: 4px; border: 1px solid ${currentChartPeriod === 'daily' ? 'var(--primary)' : '#cbd5e1'}; background: ${currentChartPeriod === 'daily' ? 'var(--primary-light)' : 'white'}; color: ${currentChartPeriod === 'daily' ? 'var(--primary)' : 'var(--text-muted)'}; font-weight: ${currentChartPeriod === 'daily' ? '700' : '500'}; cursor: pointer;">Daily</button>
            <button class="chart-tab ${currentChartPeriod === 'monthly' ? 'active' : ''}" onclick="switchDashboardChartPeriod('monthly')" style="padding: 4px 10px; border-radius: 4px; border: 1px solid ${currentChartPeriod === 'monthly' ? 'var(--primary)' : '#cbd5e1'}; background: ${currentChartPeriod === 'monthly' ? 'var(--primary-light)' : 'white'}; color: ${currentChartPeriod === 'monthly' ? 'var(--primary)' : 'var(--text-muted)'}; font-weight: ${currentChartPeriod === 'monthly' ? '700' : '500'}; cursor: pointer;">Monthly</button>
          </div>
        </div>

        <!-- Dynamic SVG Area Chart mapped to actual transaction numbers -->
        ${renderDynamicAreaChartSvg(chartData)}
      </div>

      <!-- Right Column: Top Selling Medicines + Payment Types -->
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <!-- Top Fast-Moving Medicines Widget -->
        <div class="card" style="padding: 1.25rem 1.4rem; margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="flame" style="width: 17px; height: 17px; color: #ea580c;"></i>
                <span>Fast-Moving Medicines</span>
              </h4>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Top dispensing SKUs today</div>
            </div>
            <button onclick="window.appRouter.navigate('inventory')" class="btn-outline" style="font-size: 0.7rem; padding: 2px 8px;" title="View in Inventory">
              Inventory →
            </button>
          </div>

          ${(() => {
            // Group sold items by medicine name
            const medicineTotals = {};
            (metrics.recentSold || []).forEach(s => {
              const name = s.name || 'Medicine';
              if (!medicineTotals[name]) {
                medicineTotals[name] = { qty: 0, revenue: 0 };
              }
              medicineTotals[name].qty += Number(s.qty || 0);
              medicineTotals[name].revenue += Number(s.totalPrice || 0);
            });

            const topList = Object.entries(medicineTotals)
              .sort((a, b) => b[1].qty - a[1].qty)
              .slice(0, 4);

            if (topList.length === 0) {
              return `
                <div style="text-align: center; padding: 1.25rem 0.5rem; color: var(--text-muted); font-size: 0.78rem;">
                  <i data-lucide="package" style="width: 24px; height: 24px; opacity: 0.4; margin-bottom: 4px;"></i>
                  <div>No medicines dispensed yet today</div>
                </div>
              `;
            }

            const maxSoldQty = Math.max(...topList.map(item => item[1].qty), 1);

            return `
              <div style="display: flex; flex-direction: column; gap: 0.7rem;">
                ${topList.map(([name, data], idx) => {
                  const percent = Math.round((data.qty / maxSoldQty) * 100);
                  return `
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 0.8rem; margin-bottom: 3px;">
                        <span style="font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 210px;" title="${escapeHtml(name)}">
                          <span style="color: var(--primary); font-family: monospace; margin-right: 4px;">#${idx + 1}</span>
                          ${escapeHtml(name)}
                        </span>
                        <span style="font-weight: 800; color: var(--brand-charcoal); font-size: 0.82rem;">
                          ${data.qty} <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-muted);">dispensed</span>
                        </span>
                      </div>
                      <div style="width: 100%; height: 5px; background: #f1f5f9; border-radius: 9999px; overflow: hidden;">
                        <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #f97316, #ea580c); border-radius: 9999px;"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          })()}
        </div>

        <!-- Payment Types Breakdown Card -->
        <div class="card" style="padding: 1.25rem 1.4rem; margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="wallet" style="width: 16px; height: 16px; color: var(--primary);"></i>
              <span>Payment Breakdown</span>
            </h4>
            <span style="font-size: 0.75rem; font-weight: 700; color: #16a34a; background: #dcfce7; padding: 2px 7px; border-radius: 4px;">
              ₱${metrics.netSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.9rem;">
            Collected methods across counter registers today
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <!-- Cash -->
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <div style="width: 28px; height: 28px; border-radius: 6px; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="banknote" style="width: 15px; height: 15px;"></i>
                </div>
                <div>
                  <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-main);">Cash Drawer</div>
                </div>
              </div>
              <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main);">
                ₱${(metrics.paymentTotals.Cash || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <!-- GrabMart -->
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <div style="width: 28px; height: 28px; border-radius: 6px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="bike" style="width: 15px; height: 15px;"></i>
                </div>
                <div>
                  <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-main);">GrabMart Delivery</div>
                </div>
              </div>
              <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main);">
                ₱${(metrics.paymentTotals.Grab || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <!-- Maya QR -->
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <div style="width: 28px; height: 28px; border-radius: 6px; background: #f7fee7; color: #65a30d; display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="credit-card" style="width: 15px; height: 15px;"></i>
                </div>
                <div>
                  <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-main);">Maya QR</div>
                </div>
              </div>
              <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main);">
                ₱${(metrics.paymentTotals.Maya || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <!-- GCash QR -->
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <div style="width: 28px; height: 28px; border-radius: 6px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="smartphone" style="width: 15px; height: 15px;"></i>
                </div>
                <div>
                  <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-main);">GCash QR</div>
                </div>
              </div>
              <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main);">
                ₱${(metrics.paymentTotals.GCash || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <!-- Card / FoodPanda -->
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <div style="width: 28px; height: 28px; border-radius: 6px; background: #fdf2f8; color: #db2777; display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="shopping-bag" style="width: 15px; height: 15px;"></i>
                </div>
                <div>
                  <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-main);">FoodPanda / Card</div>
                </div>
              </div>
              <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main);">
                ₱${((metrics.paymentTotals.Card || 0) + (metrics.paymentTotals.FoodPanda || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Live Real-Time Feed: What is Being Sold (Complete with Scroll & Next/Prev Pagination) -->
    <div class="card" style="padding: 1.25rem 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <span style="display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="zap" style="width: 18px; height: 18px; color: var(--primary);"></i> Real-Time Medicines Sold & Deducted</span>
            <span style="font-size: 0.75rem; font-weight: 700; background: var(--primary-light); color: var(--primary-dark); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--primary-border);">
              ${totalFeedItems} Item${totalFeedItems === 1 ? '' : 's'} Total
            </span>
          </h4>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
            Full report of all customer purchases and stock out transactions.
          </div>
        </div>

        <!-- Toolbar: Search filter & direct In-Out button -->
        <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
          <input 
            type="text" 
            placeholder="Search customer, medicine, ref..." 
            value="${escapeHtml(dashboardFeedFilter)}" 
            oninput="handleDashboardFeedSearch(this.value)"
            class="form-input" 
            style="padding: 0.35rem 0.65rem; font-size: 0.78rem; width: 220px;"
          />
          <button onclick="window.appRouter.navigate('transactions')" class="btn-outline" style="font-size: 0.78rem; padding: 5px 12px; font-weight: 600;">
            Open In - Out Logs →
          </button>
        </div>
      </div>

      ${totalFeedItems > 0 ? `
        <!-- Scrollable Table Container -->
        <div style="max-height: 480px; overflow-y: auto; overflow-x: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 0.85rem;">
          <table class="data-table" style="font-size: 0.82rem; margin: 0;">
            <thead style="position: sticky; top: 0; z-index: 2; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              <tr style="background: #f8fafc; color: var(--text-muted); font-size: 0.76rem; text-transform: uppercase;">
                <th style="background: #f8fafc;">Time & Date</th>
                <th style="background: #f8fafc;">Receipt / Ref</th>
                <th style="background: #f8fafc;">Customer</th>
                <th style="background: #f8fafc;">Medicine Dispensed</th>
                <th style="background: #f8fafc; text-align: center;">Qty</th>
                <th style="background: #f8fafc; text-align: right;">Unit Price</th>
                <th style="background: #f8fafc; text-align: right;">Total Sold</th>
              </tr>
            </thead>
            <tbody>
              ${pageSoldItems.map(item => `
                <tr style="transition: background 0.15s ease;">
                  <td>
                    <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(item.time || 'Today')}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${escapeHtml(formatDateMMDDYY(item.date) || '')}</div>
                  </td>
                  <td style="font-family: monospace; font-weight: 700; color: var(--brand-charcoal);">
                    ${escapeHtml(item.receiptNo)}
                  </td>
                  <td>
                    <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(item.customerName)}</span>
                  </td>
                  <td>
                    <div style="font-weight: 700; color: var(--primary-dark);">
                      ${escapeHtml(item.name)}
                    </div>
                    ${item.isSubstitute ? '<span style="font-size: 0.68rem; color: #b45309; background: #fef3c7; padding: 1px 4px; border-radius: 3px;">Inventory Substitute</span>' : ''}
                  </td>
                  <td style="text-align: center; font-weight: 700; color: var(--brand-charcoal);">
                    ${item.qty}
                  </td>
                  <td style="text-align: right; color: var(--text-muted);">
                    ₱${item.sellingPrice.toFixed(2)}
                  </td>
                  <td style="text-align: right; font-weight: 800; color: var(--primary);">
                    ₱${item.totalPrice.toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; padding-top: 0.4rem;">
          <div style="font-size: 0.78rem; color: var(--text-muted);">
            Showing <strong>${startIdx + 1}</strong> to <strong>${Math.min(startIdx + DASHBOARD_FEED_PAGE_SIZE, totalFeedItems)}</strong> of <strong>${totalFeedItems}</strong> sold items
          </div>

          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <!-- First Page -->
            <button 
              onclick="handleDashboardFeedPageChange(1)" 
              class="btn-outline" 
              style="padding: 4px 8px; font-size: 0.75rem; font-weight: 700;" 
              ${dashboardFeedPage === 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed; padding: 4px 8px; font-size: 0.75rem;"' : ''}
              title="First Page"
            >
              «
            </button>

            <!-- Previous Page -->
            <button 
              onclick="handleDashboardFeedPageChange(${dashboardFeedPage - 1})" 
              class="btn-outline" 
              style="padding: 4px 10px; font-size: 0.75rem; font-weight: 700;" 
              ${dashboardFeedPage === 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed; padding: 4px 10px; font-size: 0.75rem;"' : ''}
            >
              ‹ Prev
            </button>

            <!-- Page Number Indicator -->
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-main); padding: 0 0.5rem;">
              Page ${dashboardFeedPage} of ${totalFeedPages}
            </span>

            <!-- Next Page -->
            <button 
              onclick="handleDashboardFeedPageChange(${dashboardFeedPage + 1})" 
              class="btn-outline" 
              style="padding: 4px 10px; font-size: 0.75rem; font-weight: 700;" 
              ${dashboardFeedPage === totalFeedPages ? 'disabled style="opacity: 0.4; cursor: not-allowed; padding: 4px 10px; font-size: 0.75rem;"' : ''}
            >
              Next ›
            </button>

            <!-- Last Page -->
            <button 
              onclick="handleDashboardFeedPageChange(${totalFeedPages})" 
              class="btn-outline" 
              style="padding: 4px 8px; font-size: 0.75rem; font-weight: 700;" 
              ${dashboardFeedPage === totalFeedPages ? 'disabled style="opacity: 0.4; cursor: not-allowed; padding: 4px 8px; font-size: 0.75rem;"' : ''}
              title="Last Page"
            >
              »
            </button>
          </div>
        </div>
      ` : `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.86rem;">
          ${dashboardFeedFilter ? `No purchases found matching "<strong>${escapeHtml(dashboardFeedFilter)}</strong>"` : 'No customer purchases recorded yet. Complete a transaction in In - Out or POS and it will show here immediately!'}
        </div>
      `}
    </div>
  `;

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Handler for pagination change
window.handleDashboardFeedPageChange = function(newPage) {
  dashboardFeedPage = newPage;
  renderDashboardView(document.getElementById('main-content'));
};

// Handler for live search filtering
window.handleDashboardFeedSearch = function(query) {
  dashboardFeedFilter = query;
  dashboardFeedPage = 1; // reset to page 1 on new search
  renderDashboardView(document.getElementById('main-content'));
};

// Generate dynamic chart points based on actual transactions
function generateDashboardChartData(txns, period) {
  if (period === 'hourly') {
    // 5 time buckets: 8:00 AM, 10:00 AM, 12:00 PM, 2:00 PM, 4:00 PM
    const buckets = [
      { label: '8:00 AM', maxHour: 9, total: 0 },
      { label: '10:00 AM', maxHour: 11, total: 0 },
      { label: '12:00 PM', maxHour: 13, total: 0 },
      { label: '2:00 PM', maxHour: 15, total: 0 },
      { label: '4:00 PM', maxHour: 24, total: 0 }
    ];

    txns.forEach(t => {
      const net = Number(t.netTotal || 0);
      let hourNum = 12; // default midday
      if (t.time) {
        const match = t.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
          let h = parseInt(match[1], 10);
          const isPM = (match[3] || '').toUpperCase() === 'PM';
          const isAM = (match[3] || '').toUpperCase() === 'AM';
          if (isPM && h < 12) h += 12;
          if (isAM && h === 12) h = 0;
          hourNum = h;
        }
      }

      if (hourNum < 10) buckets[0].total += net;
      else if (hourNum < 12) buckets[1].total += net;
      else if (hourNum < 14) buckets[2].total += net;
      else if (hourNum < 16) buckets[3].total += net;
      else buckets[4].total += net;
    });

    return buckets;
  } else if (period === 'daily') {
    // Past 5 days
    const days = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      const dayTotal = txns
        .filter(t => t.date === str)
        .reduce((sum, t) => sum + Number(t.netTotal || 0), 0);
      days.push({ label, total: dayTotal });
    }
    return days;
  } else {
    // Past 5 months
    const months = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStr = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const mTotal = txns
        .filter(t => (t.date || '').startsWith(mStr))
        .reduce((sum, t) => sum + Number(t.netTotal || 0), 0);
      months.push({ label, total: mTotal });
    }
    return months;
  }
}

// Render dynamic SVG curve mapped directly to sales numbers
function renderDynamicAreaChartSvg(dataPoints) {
  const values = dataPoints.map(d => d.total);
  const maxVal = Math.max(...values, 500);
  const ceilVal = Math.ceil((maxVal * 1.18) / 100) * 100;

  // Chart coordinates
  const leftX = 60;
  const rightX = 640;
  const stepX = (rightX - leftX) / (dataPoints.length - 1);
  const topY = 48;
  const bottomY = 210;
  const height = bottomY - topY;

  const points = dataPoints.map((d, idx) => {
    const x = leftX + idx * stepX;
    const norm = ceilVal > 0 ? d.total / ceilVal : 0;
    const y = bottomY - (norm * height);
    return { x, y, val: d.total, label: d.label };
  });

  // Build SVG path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    pathD += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;

  // Grid line values
  const ySteps = [ceilVal, Math.round(ceilVal * 0.75), Math.round(ceilVal * 0.5), Math.round(ceilVal * 0.25), 0];

  return `
    <div style="width: 100%; height: 260px; position: relative;">
      <svg viewBox="0 0 700 240" style="width: 100%; height: 100%; overflow: visible;">
        <defs>
          <linearGradient id="salesGradLive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FF5A00" stop-opacity="0.45" />
            <stop offset="100%" stop-color="#FF5A00" stop-opacity="0.03" />
          </linearGradient>
        </defs>

        <!-- Grid lines and Y labels -->
        ${ySteps.map((val, idx) => {
          const y = topY + (idx * (height / 4));
          return `
            <line x1="40" y1="${y}" x2="680" y2="${y}" stroke="${idx === 4 ? '#e2e8f0' : '#f1f5f9'}" stroke-width="1" />
            <text x="32" y="${y + 3}" text-anchor="end" font-size="10" fill="#94a3b8" font-family="sans-serif">₱${val}</text>
          `;
        }).join('')}

        <!-- Filled Area -->
        <path d="${areaD}" fill="url(#salesGradLive)" />

        <!-- Line -->
        <path d="${pathD}" fill="none" stroke="#FF5A00" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Data Points & Tooltip Labels -->
        ${points.map(p => `
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="#FF5A00" stroke="#ffffff" stroke-width="2.5" />
          ${p.val > 0 ? `
            <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="10" font-weight="700" fill="#C2410C" font-family="sans-serif">
              ₱${p.val.toFixed(0)}
            </text>
          ` : ''}
          <text x="${p.x}" y="228" text-anchor="middle" font-size="10" fill="#94a3b8" font-family="sans-serif">
            ${escapeHtml(p.label)}
          </text>
        `).join('')}
      </svg>
    </div>
  `;
}

window.switchDashboardChartPeriod = function (period) {
  currentChartPeriod = period;
  renderDashboardView(document.getElementById('main-content'));
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
