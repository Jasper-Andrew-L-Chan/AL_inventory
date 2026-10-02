/**
 * POS Cashier Counter & Dispensing Register
 * Built for Philippine Pharmacy workflows: Generic Substitution, Rx Validation,
 * Senior Citizen (RA 9994) & PWD (RA 10754) 20% Discount + VAT Exempt calculations,
 * and BIR-compliant Official Receipt (OR) generation.
 */

let posCart = [];
let posSearchQuery = '';
let posActiveCategory = 'ALL';
let posCustomerType = 'Regular'; // 'Regular', 'Senior Citizen', 'PWD'
let posSeniorId = '';
let posDoctorRx = '';
let posPaymentMethod = 'Cash';
let posCashTendered = 0;

function renderPOSView(container) {
  const items = window.pharmacyStore.getItems();
  const settings = window.pharmacyStore.getSettings();

  const categories = ['ALL', 'Analgesic & Antipyretic', 'Antibiotics', 'Cough & Cold', 'Cardiovascular', 'Antidiabetic', 'Vitamins & Supplements', 'First Aid & Antiseptics'];

  const filteredItems = items.filter(i => {
    const matchesCat = posActiveCategory === 'ALL' || i.category === posActiveCategory;
    const q = posSearchQuery.toLowerCase();
    const matchesSearch = !posSearchQuery || (
      i.brandName.toLowerCase().includes(q) ||
      i.genericName.toLowerCase().includes(q) ||
      (i.barcode && i.barcode.includes(q))
    );
    return matchesCat && matchesSearch;
  });

  // Calculation for cart
  const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  // Philippine Senior/PWD Discount Calculation:
  // Under RA 9994 & RA 10754: 20% discount on medicines + exemption from 12% VAT
  let discountAmount = 0;
  let vatableSales = 0;
  let vatExemptSales = 0;
  let vatAmount = 0;
  let netTotal = subtotal;

  if (posCustomerType === 'Senior Citizen' || posCustomerType === 'PWD') {
    // Formula: Vatable / 1.12 to get VAT-exempt base, then 20% off
    const vatExemptBase = subtotal / 1.12;
    discountAmount = vatExemptBase * 0.20;
    vatExemptSales = vatExemptBase - discountAmount;
    netTotal = vatExemptSales;
  } else {
    // Regular Vatable 12%
    vatableSales = subtotal / 1.12;
    vatAmount = subtotal - vatableSales;
    netTotal = subtotal;
  }

  const changeDue = Math.max(0, posCashTendered - netTotal);

  container.innerHTML = `
    <div class="pos-layout">
      <!-- Left Column: Medicine Catalog -->
      <div class="pos-catalog">
        <!-- Search & Barcode Scan Bar -->
        <div style="margin-bottom: 0.75rem; display: flex; gap: 0.5rem;">
          <input 
            type="text" 
            placeholder="🔍 Scan barcode or search brand/generic (e.g. Paracetamol, Biogesic)..." 
            value="${posSearchQuery}" 
            oninput="handlePOSSearch(this.value)" 
            class="form-input" 
            style="flex: 1; padding: 0.65rem 0.9rem; font-size: 0.9rem; font-weight: 500;"
            autofocus
          />
          <button onclick="clearPOSSearch()" class="btn-outline">Clear</button>
        </div>

        <!-- Category Filter Pills -->
        <div class="pos-category-pills">
          ${categories.map(cat => `
            <button 
              class="cat-pill ${posActiveCategory === cat ? 'active' : ''}" 
              onclick="setPOSCategory('${cat}')"
            >
              ${cat}
            </button>
          `).join('')}
        </div>

        <!-- Medicine Cards Grid -->
        <div class="medicine-grid">
          ${filteredItems.map(item => `
            <div class="med-card" onclick="addToPOSCart('${item.id}')">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                  <span class="badge ${item.isRx ? 'badge-rx' : 'badge-otc'}" style="font-size: 0.68rem;">
                    ${item.isRx ? 'Rx Required' : 'OTC'}
                  </span>
                  <span style="font-size: 0.72rem; color: ${item.currentStock <= item.reorderLevel ? '#ef4444; font-weight: 700;' : 'var(--text-muted);'}">
                    Stock: ${item.currentStock}
                  </span>
                </div>
                <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-main); margin-bottom: 2px;">
                  ${item.brandName}
                </div>
                <div style="font-size: 0.75rem; color: #0d9488; margin-bottom: 4px; line-height: 1.2;">
                  ${item.genericName}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">
                  ${item.dosage || ''} • [${item.unit}]
                </div>
              </div>
              <div style="margin-top: 0.75rem; display: flex; justify-content: space-between; align-items: baseline; border-top: 1px dashed var(--border-light); padding-top: 0.4rem;">
                <span style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">${item.batchLot}</span>
                <span style="font-size: 1.05rem; font-weight: 800; color: #0f766e;">₱${Number(item.sellingPrice).toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Right Column: Active Cart & Billing Terminal -->
      <div class="pos-cart">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">Prescription &amp; OTC Cart</h3>
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              Cashier: <strong style="color: var(--primary);">${window.authStore && window.authStore.getSession() ? window.authStore.getSession().fullName : 'Staff Pharmacist'}</strong>
            </div>
          </div>
          <button onclick="clearPOSCart()" style="background: none; border: none; color: #ef4444; font-size: 0.78rem; font-weight: 600; cursor: pointer;">
            Clear Cart
          </button>
        </div>

        <!-- Customer Classification (Senior/PWD Mandate) -->
        <div style="padding: 0.85rem 1.25rem; border-bottom: 1px solid var(--border-light); background: #ffffff;">
          <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 0.4rem;">
            CUSTOMER CLASSIFICATION:
          </label>
          <div style="display: flex; gap: 0.4rem; margin-bottom: 0.5rem;">
            <button 
              type="button" 
              onclick="setPOSCustomerType('Regular')" 
              class="cat-pill ${posCustomerType === 'Regular' ? 'active' : ''}" 
              style="flex: 1; text-align: center;"
            >
              Regular
            </button>
            <button 
              type="button" 
              onclick="setPOSCustomerType('Senior Citizen')" 
              class="cat-pill ${posCustomerType === 'Senior Citizen' ? 'active' : ''}" 
              style="flex: 1; text-align: center;"
            >
              Senior (20%)
            </button>
            <button 
              type="button" 
              onclick="setPOSCustomerType('PWD')" 
              class="cat-pill ${posCustomerType === 'PWD' ? 'active' : ''}" 
              style="flex: 1; text-align: center;"
            >
              PWD (20%)
            </button>
          </div>

          <!-- Senior / PWD ID & Doctor Rx Inputs -->
          ${posCustomerType !== 'Regular' ? `
            <div style="display: flex; flex-direction: column; gap: 0.4rem; padding: 0.6rem; background: #fefce8; border: 1px solid #fef08a; border-radius: var(--radius-sm); margin-bottom: 0.3rem;">
              <input 
                type="text" 
                placeholder="Senior / PWD ID No. (Required for BIR)" 
                value="${posSeniorId}" 
                oninput="posSeniorId = this.value" 
                class="form-input" 
                style="padding: 4px 8px; font-size: 0.78rem;" 
              />
              <input 
                type="text" 
                placeholder="Attending Doctor & PRC # (Optional)" 
                value="${posDoctorRx}" 
                oninput="posDoctorRx = this.value" 
                class="form-input" 
                style="padding: 4px 8px; font-size: 0.78rem;" 
              />
            </div>
          ` : ''}
        </div>

        <!-- Cart Line Items -->
        <div style="flex: 1; overflow-y: auto; padding: 0.75rem 1.25rem;">
          ${posCart.length === 0 ? `
            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.4;">🛒</div>
              <div style="font-weight: 600; font-size: 0.9rem;">Cart is Empty</div>
              <div style="font-size: 0.78rem;">Click medicines from the left to dispense</div>
            </div>
          ` : posCart.map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid var(--border-light);">
              <div style="flex: 1; padding-right: 0.5rem;">
                <div style="font-size: 0.84rem; font-weight: 700; color: var(--text-main);">
                  ${item.name}
                  ${item.isRx ? '<span style="color: #ef4444; font-size: 0.7rem; font-weight: 700; margin-left: 4px;">[Rx]</span>' : ''}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  ₱${item.price.toFixed(2)} / ${item.unit}
                </div>
              </div>
              <!-- Qty Steppers -->
              <div style="display: flex; align-items: center; gap: 6px;">
                <button onclick="updateCartItemQty('${item.id}', -1)" style="width: 24px; height: 24px; border: 1px solid var(--border-color); background: white; border-radius: 4px; cursor: pointer; font-weight: 700;">-</button>
                <span style="font-size: 0.85rem; font-weight: 700; min-width: 20px; text-align: center;">${item.qty}</span>
                <button onclick="updateCartItemQty('${item.id}', 1)" style="width: 24px; height: 24px; border: 1px solid var(--border-color); background: white; border-radius: 4px; cursor: pointer; font-weight: 700;">+</button>
              </div>
              <div style="text-align: right; min-width: 65px; font-size: 0.88rem; font-weight: 700; color: var(--text-main);">
                ₱${(item.price * item.qty).toFixed(2)}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Bill Breakdown & Calculations -->
        <div style="padding: 1rem 1.25rem; background: #f8fafc; border-top: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 4px;">
            <span>Subtotal:</span>
            <span>₱${subtotal.toFixed(2)}</span>
          </div>

          ${discountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: #16a34a; font-weight: 600; margin-bottom: 4px;">
              <span>Senior/PWD 20% + VAT Exemption:</span>
              <span>-₱${discountAmount.toFixed(2)}</span>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">
              <span>VAT 12% (Included):</span>
              <span>₱${vatAmount.toFixed(2)}</span>
            </div>
          `}

          <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 800; color: #028090; padding-top: 6px; border-top: 1px solid var(--border-color); margin-bottom: 0.75rem;">
            <span>Net Payable:</span>
            <span>₱${netTotal.toFixed(2)}</span>
          </div>

          <!-- Payment Options -->
          <div style="display: flex; gap: 0.4rem; margin-bottom: 0.75rem;">
            ${['Cash', 'GCash', 'Maya', 'Grab'].map(method => `
              <button 
                onclick="setPOSPaymentMethod('${method}')" 
                class="cat-pill ${posPaymentMethod === method ? 'active' : ''}" 
                style="flex: 1; text-align: center; font-size: 0.75rem;"
              >
                ${method}
              </button>
            `).join('')}
          </div>

          <!-- If Cash: Fast Bill Tender Shortcuts -->
          ${posPaymentMethod === 'Cash' ? `
            <div style="margin-bottom: 0.75rem;">
              <div style="display: flex; gap: 4px; margin-bottom: 4px;">
                <input 
                  type="number" 
                  id="cashTenderInput" 
                  placeholder="Cash Tendered ₱" 
                  value="${posCashTendered || ''}" 
                  oninput="handleCashTenderChange(this.value, ${netTotal})" 
                  class="form-input" 
                  style="flex: 1; padding: 4px 8px; font-size: 0.82rem;" 
                />
                <button onclick="setExactCash(${netTotal})" class="btn-outline" style="font-size: 0.75rem; padding: 4px 8px;">Exact</button>
                <button onclick="addCashTender(100, ${netTotal})" class="btn-outline" style="font-size: 0.75rem; padding: 4px 8px;">+100</button>
                <button onclick="addCashTender(500, ${netTotal})" class="btn-outline" style="font-size: 0.75rem; padding: 4px 8px;">+500</button>
                <button onclick="addCashTender(1000, ${netTotal})" class="btn-outline" style="font-size: 0.75rem; padding: 4px 8px;">+1000</button>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.84rem; font-weight: 700; color: #dc2626;">
                <span>Change:</span>
                <span>₱${changeDue.toFixed(2)}</span>
              </div>
            </div>
          ` : ''}

          <!-- Checkout & Print Button -->
          <button 
            onclick="completePOSSale(${subtotal}, ${discountAmount}, ${netTotal})" 
            ${posCart.length === 0 ? 'disabled' : ''}
            style="width: 100%; padding: 0.75rem; background: var(--primary); color: white; border: none; border-radius: var(--radius-sm); font-weight: 700; font-size: 0.95rem; cursor: pointer; box-shadow: var(--shadow-md); opacity: ${posCart.length === 0 ? '0.5' : '1'};"
          >
            ✓ Complete Sale & Issue OR
          </button>
        </div>
      </div>
    </div>

    <!-- Official Receipt Modal -->
    <div id="receiptModal" class="modal-overlay">
      <div class="modal-card" style="max-width: 420px;">
        <div class="modal-header">
          <h3 class="modal-title">BIR Official Receipt (OR)</h3>
          <button onclick="closeReceiptModal()" style="background: none; border: none; font-size: 1.3rem; cursor: pointer;">✕</button>
        </div>
        <div class="modal-body" id="receiptModalContent">
          <!-- Populated dynamically on sale complete -->
        </div>
        <div class="modal-footer" style="justify-content: space-between;">
          <button onclick="printReceipt()" class="btn-primary" style="background: #028090;">
            🖨️ Print Receipt
          </button>
          <button onclick="closeReceiptModal()" class="btn-outline">
            Done / Next Customer
          </button>
        </div>
      </div>
    </div>
  `;
}

window.handlePOSSearch = function(q) {
  posSearchQuery = q;
  renderPOSView(document.getElementById('main-content'));
};

window.clearPOSSearch = function() {
  posSearchQuery = '';
  renderPOSView(document.getElementById('main-content'));
};

window.setPOSCategory = function(cat) {
  posActiveCategory = cat;
  renderPOSView(document.getElementById('main-content'));
};

window.setPOSCustomerType = function(type) {
  posCustomerType = type;
  renderPOSView(document.getElementById('main-content'));
};

window.setPOSPaymentMethod = function(method) {
  posPaymentMethod = method;
  renderPOSView(document.getElementById('main-content'));
};

window.addToPOSCart = function(itemId) {
  const item = window.pharmacyStore.getItemById(itemId);
  if (!item) return;

  const existing = posCart.find(c => c.id === item.id);
  if (existing) {
    existing.qty += 1;
  } else {
    posCart.push({
      id: item.id,
      name: item.brandName + (item.dosage ? ' ' + item.dosage : ''),
      generic: item.genericName,
      price: Number(item.sellingPrice),
      costPrice: Number(item.costPrice),
      unit: item.unit,
      isRx: item.isRx,
      qty: 1
    });
  }
  renderPOSView(document.getElementById('main-content'));
};

window.updateCartItemQty = function(itemId, delta) {
  const item = posCart.find(c => c.id === itemId);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) {
      posCart = posCart.filter(c => c.id !== itemId);
    }
  }
  renderPOSView(document.getElementById('main-content'));
};

window.clearPOSCart = function() {
  posCart = [];
  posCashTendered = 0;
  renderPOSView(document.getElementById('main-content'));
};

window.handleCashTenderChange = function(val, netTotal) {
  posCashTendered = Number(val) || 0;
  renderPOSView(document.getElementById('main-content'));
};

window.setExactCash = function(netTotal) {
  posCashTendered = netTotal;
  renderPOSView(document.getElementById('main-content'));
};

window.addCashTender = function(amount, netTotal) {
  posCashTendered = (posCashTendered || 0) + amount;
  renderPOSView(document.getElementById('main-content'));
};

window.completePOSSale = function(subtotal, discount, netTotal) {
  if (posCart.length === 0) return;

  const session = window.authStore ? window.authStore.getSession() : null;
  const cashierName = session ? `${session.firstName} (${session.role})` : 'Lionel (Pharmacist)';

  const txn = window.pharmacyStore.addTransaction({
    cashier: cashierName,
    customerType: posCustomerType,
    customerId: posSeniorId,
    doctorRx: posDoctorRx,
    paymentMethod: posPaymentMethod,
    items: [...posCart],
    subtotal: subtotal,
    discountAmount: discount,
    netTotal: netTotal
  });

  // Display receipt
  renderOfficialReceipt(txn);

  // Reset cart
  posCart = [];
  posCashTendered = 0;
  posSeniorId = '';
  posDoctorRx = '';
  posCustomerType = 'Regular';
};

window.renderOfficialReceipt = function(txn) {
  const settings = window.pharmacyStore.getSettings();
  const content = document.getElementById('receiptModalContent');
  if (!content) return;

  content.innerHTML = `
    <div class="receipt-modal-preview">
      <div style="text-align: center; margin-bottom: 0.8rem;">
        <div style="font-weight: 800; font-size: 1.1rem; text-transform: uppercase;">${settings.pharmacyName}</div>
        <div style="font-size: 0.75rem;">${settings.branch}</div>
        <div style="font-size: 0.72rem;">${settings.address}</div>
        <div style="font-size: 0.72rem;">VAT REG TIN: ${settings.tin}</div>
        <div style="font-size: 0.72rem;">PRC LIC: ${settings.prcLicense}</div>
      </div>

      <div style="border-top: 1px dashed #64748b; margin: 6px 0;"></div>
      
      <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
        <span>OR NO: <strong>${txn.receiptNo}</strong></span>
        <span>${txn.date} ${txn.time}</span>
      </div>
      <div style="font-size: 0.75rem; margin-bottom: 4px;">
        Cashier: ${txn.cashier}
      </div>

      ${txn.customerId ? `
        <div style="font-size: 0.75rem; background: #e2e8f0; padding: 2px 4px; margin-bottom: 4px;">
          DISCOUNT TYPE: ${txn.customerType} | ID: ${txn.customerId}
        </div>
      ` : ''}

      <div style="border-top: 1px dashed #64748b; margin: 6px 0;"></div>

      <table style="width: 100%; font-size: 0.75rem; border-collapse: collapse;">
        <thead>
          <tr style="text-align: left; border-bottom: 1px solid #cbd5e1;">
            <th>ITEM</th>
            <th style="text-align: center;">QTY</th>
            <th style="text-align: right;">PRICE</th>
            <th style="text-align: right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${txn.items.map(i => `
            <tr>
              <td>${i.name}</td>
              <td style="text-align: center;">${i.qty}</td>
              <td style="text-align: right;">${i.price.toFixed(2)}</td>
              <td style="text-align: right;">${(i.price * i.qty).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="border-top: 1px dashed #64748b; margin: 8px 0;"></div>

      <div style="font-size: 0.78rem;">
        <div style="display: flex; justify-content: space-between;">
          <span>SUBTOTAL:</span>
          <span>₱${txn.subtotal.toFixed(2)}</span>
        </div>
        ${txn.discountAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; color: #16a34a; font-weight: 700;">
            <span>SENIOR / PWD DISCOUNT:</span>
            <span>-₱${txn.discountAmount.toFixed(2)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 0.95rem; margin-top: 4px; border-top: 1px solid #cbd5e1; padding-top: 4px;">
          <span>TOTAL AMOUNT DUE:</span>
          <span>₱${txn.netTotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
          <span>PAYMENT METHOD:</span>
          <span>${txn.paymentMethod.toUpperCase()}</span>
        </div>
      </div>

      <div style="border-top: 1px dashed #64748b; margin: 10px 0;"></div>

      <div style="text-align: center; font-size: 0.7rem; color: #64748b;">
        <div>THIS SERVES AS AN OFFICIAL RECEIPT</div>
        <div>Thank you for choosing ${settings.pharmacyName}!</div>
        <div>Keep your medicines in a cool, dry place.</div>
      </div>
    </div>
  `;

  document.getElementById('receiptModal').classList.add('active');
};

window.closeReceiptModal = function() {
  document.getElementById('receiptModal').classList.remove('active');
  renderPOSView(document.getElementById('main-content'));
};

window.printReceipt = function() {
  window.print();
};
