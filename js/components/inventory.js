/**
 * Inventory View Component
 * Matches Image 2 layout with Philippine Pharmacy specific fields:
 * Generic Names, Batch/Lot Numbers, Expiration Dates, Rx Classification, and Stock Movements.
 * Features:
 * - Quick selection via Shift + Click (or Checkbox) with visual row highlight
 * - Edit and Delete buttons on each row
 * - Confirmation modal/prompt before permanent deletion
 * - Bulk actions (Delete Selected, Edit Selected)
 */

let inventorySearchQuery = '';
let inventoryCurrentTab = 'inventory';
let selectedInventoryItemIds = new Set();
let lastClickedItemId = null;

function renderInventoryView(container) {
  const items = window.pharmacyStore.getItems();
  const filteredItems = items.filter(item => {
    if (!inventorySearchQuery) return true;
    const q = inventorySearchQuery.toLowerCase();
    return (
      item.brandName.toLowerCase().includes(q) ||
      item.genericName.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.batchLot && item.batchLot.toLowerCase().includes(q))
    );
  });

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const lowStockItems = items.filter(i => (Number(i.currentStock) || 0) <= (Number(i.reorderLevel) || 10));
  const expiringItems = items.filter(i => {
    if (!i.expiryDate) return false;
    const exp = new Date(i.expiryDate);
    return !isNaN(exp.getTime()) && exp <= in90Days;
  });

  // Filter based on active subtab
  let displayedItems = filteredItems;
  if (inventoryCurrentTab === 'expiry-alerts') {
    displayedItems = filteredItems.filter(item => {
      const isLow = (Number(item.currentStock) || 0) <= (Number(item.reorderLevel) || 10);
      const expDate = new Date(item.expiryDate);
      const isExpiring = !isNaN(expDate.getTime()) && expDate <= in90Days;
      return isLow || isExpiring;
    });
  }

  const totalStockCount = items.reduce((acc, curr) => acc + (Number(curr.currentStock) || 0), 0);
  const selectedCount = selectedInventoryItemIds.size;
  const allFilteredSelected = displayedItems.length > 0 && displayedItems.every(i => selectedInventoryItemIds.has(i.id));

  container.innerHTML = `
    <!-- Top Subtabs Bar -->
    <div class="subtabs-bar">
      <button class="subtab-btn ${inventoryCurrentTab === 'inventory' ? 'active' : ''}" onclick="switchInventoryTab('inventory')">
        INVENTORY
      </button>
      <button class="subtab-btn ${inventoryCurrentTab === 'expiry-alerts' ? 'active' : ''}" onclick="switchInventoryTab('expiry-alerts')" style="display: inline-flex; align-items: center; gap: 6px;">
        <i data-lucide="alert-triangle" style="width: 14px; height: 14px; color: ${lowStockItems.length + expiringItems.length > 0 ? '#ef4444' : 'inherit'};"></i>
        <span>BATCH EXPIRY & REORDER ALERTS</span>
        <span style="background: ${lowStockItems.length + expiringItems.length > 0 ? '#fee2e2' : '#f1f5f9'}; color: ${lowStockItems.length + expiringItems.length > 0 ? '#dc2626' : 'var(--text-muted)'}; padding: 1px 7px; border-radius: 9999px; font-weight: 800; font-size: 0.72rem;">
          ${lowStockItems.length + expiringItems.length}
        </span>
      </button>
    </div>

    <!-- Alert KPI Summary Banner (Shows in Alert tab or when items need attention) -->
    ${(inventoryCurrentTab === 'expiry-alerts' || lowStockItems.length > 0 || expiringItems.length > 0) ? `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
        <!-- Needs Restock Box -->
        <div class="card" onclick="switchInventoryTab('expiry-alerts')" style="margin-bottom: 0; padding: 1rem 1.25rem; border-left: 4px solid #ef4444; background: #fffafb; cursor: pointer; transition: transform 0.15s ease;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 5px;">
                <i data-lucide="package-plus" style="width: 15px; height: 15px;"></i> Needs Restock
              </div>
              <div style="font-size: 1.6rem; font-weight: 900; color: #dc2626; margin: 0.2rem 0;">
                ${lowStockItems.length}
              </div>
              <div style="font-size: 0.73rem; color: var(--text-muted);">
                ${lowStockItems.length > 0 ? lowStockItems.map(i => i.brandName).slice(0, 3).join(', ') + (lowStockItems.length > 3 ? ` +${lowStockItems.length - 3} more` : '') : 'All medicines at healthy stock'}
              </div>
            </div>
            <span class="reorder-pill-badge" style="font-size: 0.72rem; padding: 3px 10px;">
              <span class="reorder-pill-dot"></span>
              <span>Needs Restock</span>
            </span>
          </div>
        </div>

        <!-- Expiring Soon Box -->
        <div class="card" onclick="switchInventoryTab('expiry-alerts')" style="margin-bottom: 0; padding: 1rem 1.25rem; border-left: 4px solid #f59e0b; background: #fffdfa; cursor: pointer; transition: transform 0.15s ease;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 5px;">
                <i data-lucide="clock" style="width: 15px; height: 15px;"></i> Expiring Within 90 Days
              </div>
              <div style="font-size: 1.6rem; font-weight: 900; color: #d97706; margin: 0.2rem 0;">
                ${expiringItems.length}
              </div>
              <div style="font-size: 0.73rem; color: var(--text-muted);">
                ${expiringItems.length > 0 ? expiringItems.map(i => `${i.brandName} (${i.expiryDate})`).slice(0, 2).join(', ') + (expiringItems.length > 2 ? ` +${expiringItems.length - 2} more` : '') : 'No batches expiring soon'}
              </div>
            </div>
            <span style="font-size: 0.7rem; font-weight: 700; background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 9999px;">
              Near Expiry
            </span>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Top Action Buttons -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
      <div style="display: flex; gap: 0.75rem;">
        <button onclick="document.getElementById('csvFileInput').click()" class="btn-primary" style="background: var(--brand-charcoal); display: flex; align-items: center; gap: 0.5rem; box-shadow: none;">
          <i data-lucide="upload" style="width: 15px; height: 15px;"></i>
          <span>Upload CSV File</span>
        </button>
        <input type="file" id="csvFileInput" accept=".csv" style="display: none;" onchange="handleCSVUpload(event)" />

        <button onclick="exportInventoryToCSV()" class="btn-outline" style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="download" style="width: 15px; height: 15px;"></i>
          <span>Export Stock CSV</span>
        </button>
      </div>

      <div style="display: flex; gap: 0.5rem;">
        <button onclick="openAddMedicineModal()" class="btn-primary" style="background: var(--primary); display: flex; align-items: center; gap: 0.4rem;">
          <i data-lucide="plus" style="width: 15px; height: 15px;"></i>
          <span>Detailed Medicine / Batch Form</span>
        </button>
      </div>
    </div>

    <!-- Quick Add Medicine Bar -->
    <div class="quick-add-bar">
      <div class="quick-add-title">CREATE MEDICINE / PRODUCT QUICK ENTRY</div>
      <form id="quickAddForm" onsubmit="handleQuickAdd(event)" class="quick-add-fields">
        <input type="text" id="quickBrandName" placeholder="BRAND / DRUG NAME (ex. Biogesic)" class="form-input" style="min-width: 200px;" required />
        <input type="text" id="quickGenericName" placeholder="GENERIC NAME (ex. Paracetamol)" class="form-input" style="min-width: 200px;" required />
        <input type="text" id="quickUnit" placeholder="UNIT (pcs, capsule, bottle, box)" class="form-input" style="width: 150px;" required />
        <input type="number" id="quickQty" placeholder="QTY IN STOCK" class="form-input" style="width: 120px;" min="0" required />
        <input type="number" id="quickPrice" placeholder="PRICE ₱" class="form-input" style="width: 100px;" step="0.25" min="0" required />
        <button type="submit" class="btn-primary" style="background: var(--primary); padding: 0.55rem 1.2rem;">
          Add Medicine
        </button>
      </form>
    </div>

    <!-- Selection Helper Banner (Shows when 1 or more items are selected) -->
    ${selectedCount > 0 ? `
      <div class="selected-count-banner">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="check" style="width: 14px; height: 14px;"></i> <strong>${selectedCount}</strong> item${selectedCount > 1 ? 's' : ''} selected</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">(Tip: You can use <strong>Shift + Click</strong> on any row to select)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          ${selectedCount === 1 ? `
            <button onclick="editFirstSelected()" class="btn-action-edit" style="display: inline-flex; align-items: center; gap: 4px;">
              <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Edit Selected
            </button>
          ` : ''}
          <button onclick="deleteSelectedItems()" class="btn-action-delete" style="display: inline-flex; align-items: center; gap: 4px;">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Delete Selected (${selectedCount})
          </button>
          <button onclick="clearItemSelection()" class="btn-outline" style="padding: 2px 8px; font-size: 0.75rem;">
            Deselect All
          </button>
        </div>
      </div>
    ` : ''}

    <!-- Search Toolbar with Date filters and Stock Pill -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <input 
          type="text" 
          placeholder="Search by brand, generic, or lot #..." 
          value="${inventorySearchQuery}" 
          oninput="handleInventorySearch(this.value)" 
          class="form-input" 
          style="width: 300px; padding: 0.5rem 0.85rem;"
        />
        <div style="font-size: 0.76rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
          <kbd style="background: #e2e8f0; border-radius: 4px; padding: 2px 5px; font-size: 0.7rem; font-family: monospace;">Shift + Click</kbd>
          <span>on any row to select</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 1.2rem;">
        ${inventoryCurrentTab === 'expiry-alerts' ? `
          <button onclick="switchInventoryTab('inventory')" class="btn-outline" style="font-size: 0.75rem; padding: 3px 8px;">
            View All Inventory (${items.length})
          </button>
        ` : `
          <span style="font-size: 0.85rem; color: var(--primary); font-weight: 700; border-bottom: 2px solid var(--primary); padding-bottom: 2px;">All Items</span>
        `}

        <!-- Total medicines count and Shift Status badge -->
        <div style="background: rgba(2, 128, 144, 0.1); border: 1px solid rgba(2, 128, 144, 0.25); color: var(--primary); padding: 0.35rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
          <i data-lucide="clock" style="width: 14px; height: 14px;"></i>
          <span>Shift Window: 6:00 AM – 9:00 PM</span>
        </div>

        <div style="background: #e07a5f; color: white; padding: 0.4rem 1rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
          <i data-lucide="package" style="width: 15px; height: 15px;"></i>
          <span>${displayedItems.length} Medicines displayed</span>
        </div>
      </div>
    </div>

    <!-- Inventory Data Table matching Image 2 columns -->
    <div class="table-container">
      <table class="data-table" id="inventoryTable">
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">
              <input type="checkbox" onchange="toggleSelectAllItems(this.checked)" ${allFilteredSelected ? 'checked' : ''} title="Select/Deselect All" />
            </th>
            <th>Medicine Details & Generic Name</th>
            <th>Category / Rx</th>
            <th>Batch / Expiry</th>
            <th style="text-align: right;" title="Opening inventory at start of shift">Beginning Shift</th>
            <th style="text-align: right;" title="Stock received / added during this shift (resets at 6am / 9pm)">Added (Shift)</th>
            <th style="text-align: right;" title="Stock dispensed / deducted during this shift (resets at 6am / 9pm)">Deducted (Shift)</th>
            <th style="text-align: right; color: var(--primary); font-weight: 700;">Current Stock</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: center; width: 140px;">Fast Adjust</th>
            <th style="text-align: center; width: 160px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${displayedItems.length === 0 ? `
            <tr>
              <td colspan="11" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                <div style="margin-bottom: 0.5rem; display: flex; justify-content: center;"><i data-lucide="${inventoryCurrentTab === 'expiry-alerts' ? 'check-circle' : 'package'}" style="width: 36px; height: 36px; opacity: 0.5; color: ${inventoryCurrentTab === 'expiry-alerts' ? '#10b981' : 'inherit'};"></i></div>
                <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-main); margin-bottom: 0.25rem;">
                  ${inventoryCurrentTab === 'expiry-alerts' ? 'No Low Stock or Expiring Batches Found' : (inventorySearchQuery ? `No medicines matching "${inventorySearchQuery}"` : 'No medicines in inventory')}
                </div>
                <div style="font-size: 0.84rem; max-width: 420px; margin: 0 auto 1.25rem auto;">
                  ${inventoryCurrentTab === 'expiry-alerts' ? 'All batches are well within safe shelf-life limits and have sufficient inventory.' : 'Your inventory is currently empty. Use the quick entry bar above or click the button below to add your first medicine batch.'}
                </div>
                <button onclick="${inventoryCurrentTab === 'expiry-alerts' ? "switchInventoryTab('inventory')" : 'openAddMedicineModal()'}" class="btn-primary" style="background: var(--primary); display: inline-flex; align-items: center; gap: 4px;">
                  <i data-lucide="${inventoryCurrentTab === 'expiry-alerts' ? 'arrow-left' : 'plus'}" style="width: 15px; height: 15px;"></i> ${inventoryCurrentTab === 'expiry-alerts' ? 'Back to All Inventory' : 'Add First Medicine'}
                </button>
              </td>
            </tr>
          ` : displayedItems.map(item => {
            const isLow = item.currentStock <= item.reorderLevel;
            const expDate = new Date(item.expiryDate);
            const now = new Date();
            const daysToExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
            const isExpiringSoon = daysToExpiry <= 90;
            const isSelected = selectedInventoryItemIds.has(item.id);

            return `
              <tr 
                id="inv-row-${item.id}"
                class="${isSelected ? 'selected' : ''}" 
                onclick="handleRowClick(event, '${item.id}')"
                style="cursor: pointer; user-select: none;"
                title="Shift + Click to select for Edit / Delete"
              >
                <td style="text-align: center;" onclick="event.stopPropagation()">
                  <input 
                    type="checkbox" 
                    ${isSelected ? 'checked' : ''} 
                    onchange="toggleItemSelection('${item.id}', this.checked)" 
                  />
                </td>
                <td>
                  <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">
                    ${item.brandName} <span style="font-weight: normal; color: var(--text-muted);">[${item.unit}]</span>
                  </div>
                  <div style="font-size: 0.75rem; color: #0d9488; font-style: italic;">
                    ${item.genericName} - ${item.dosage || ''}
                  </div>
                </td>
                <td>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">${item.category}</div>
                  <span class="badge ${item.isRx ? 'badge-rx' : 'badge-otc'}" style="margin-top: 3px;">
                    ${item.isRx ? 'Rx Required' : 'OTC'}
                  </span>
                </td>
                <td>
                  <div style="font-family: monospace; font-size: 0.78rem; font-weight: 600;">${item.batchLot}</div>
                  <div style="font-size: 0.72rem; margin-top: 2px;">
                    ${daysToExpiry <= 0 ? `
                      <span style="background: #fee2e2; color: #b91c1c; font-weight: 800; padding: 1px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;">
                        <i data-lucide="alert-octagon" style="width: 11px; height: 11px;"></i> EXPIRED (${item.expiryDate})
                      </span>
                    ` : (daysToExpiry <= 30 ? `
                      <span style="background: #fee2e2; color: #dc2626; font-weight: 700; padding: 1px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;">
                        <i data-lucide="alert-triangle" style="width: 11px; height: 11px;"></i> Expires in ${daysToExpiry}d (${item.expiryDate})
                      </span>
                    ` : (isExpiringSoon ? `
                      <span style="background: #fef3c7; color: #b45309; font-weight: 700; padding: 1px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;">
                        <i data-lucide="clock" style="width: 11px; height: 11px;"></i> Exp in ${daysToExpiry}d (${item.expiryDate})
                      </span>
                    ` : `
                      <span style="color: var(--text-muted);">Exp: ${item.expiryDate}</span>
                    `))}
                  </div>
                </td>
                <td style="text-align: right; color: var(--text-muted);">${item.beginningStock}</td>
                <td style="text-align: right; color: #16a34a; font-weight: 600;">+${item.addedStock}</td>
                <td style="text-align: right; color: #dc2626; font-weight: 600;">-${item.deductedStock}</td>
                <td style="text-align: right; font-weight: 800; font-size: 0.95rem; ${isLow ? 'color: #dc2626;' : 'color: var(--text-main);'}">
                  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                    <span>${item.currentStock}</span>
                    ${item.currentStock === 0 ? `
                      <span class="reorder-pill-badge out-of-stock" title="Critical: 0 stock remaining. Reorder urgently!">
                        <span class="reorder-pill-dot"></span>
                        <span>OUT OF STOCK</span>
                      </span>
                    ` : (isLow ? `
                      <span class="reorder-pill-badge" title="Stock at or below reorder threshold (≤${item.reorderLevel || 10})">
                        <span class="reorder-pill-dot"></span>
                        <span>REORDER (≤${item.reorderLevel || 10})</span>
                      </span>
                    ` : '')}
                  </div>
                </td>
                <td style="text-align: right; font-weight: 600;">₱${Number(item.sellingPrice).toFixed(2)}</td>
                <td style="text-align: center;" onclick="event.stopPropagation()">
                  <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                    <input 
                      type="number" 
                      id="adj-input-${item.id}" 
                      placeholder="Qty" 
                      style="width: 50px; padding: 3px 5px; font-size: 0.8rem; border: 1px solid var(--border-color); border-radius: 4px; text-align: center;" 
                    />
                    <button 
                      onclick="fastAdjustStock('${item.id}', 1)" 
                      title="Add to Stock"
                      style="width: 24px; height: 24px; border-radius: 50%; background: #10b981; color: white; border: none; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center;"
                    >
                      +
                    </button>
                    <button 
                      onclick="fastAdjustStock('${item.id}', -1)" 
                      title="Deduct Stock"
                      style="width: 24px; height: 24px; border-radius: 50%; background: #ef4444; color: white; border: none; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center;"
                    >
                      -
                    </button>
                  </div>
                </td>
                <td style="text-align: center;" onclick="event.stopPropagation()">
                  <div class="action-btn-group">
                    <button 
                      onclick="openEditMedicineModal('${item.id}')" 
                      class="btn-action-edit"
                      title="Edit this medicine"
                      style="display: inline-flex; align-items: center; gap: 4px;"
                    >
                      <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i> Edit
                    </button>
                    <button 
                      onclick="confirmDeleteItem('${item.id}')" 
                      class="btn-action-delete"
                      title="Delete this medicine permanently"
                      style="display: inline-flex; align-items: center; gap: 4px;"
                    >
                      <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i> Delete
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Medicine Modal -->
    <div id="medicineModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" id="medModalTitle">Add New Medicine</h3>
          <button onclick="closeMedicineModal()" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i data-lucide="x" style="width: 18px; height: 18px;"></i></button>
        </div>
        <form id="medDetailForm" onsubmit="handleSaveDetailedMedicine(event)">
          <div class="modal-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <input type="hidden" id="modalMedId" />
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Brand Name *</label>
              <input type="text" id="modalBrandName" class="form-input" placeholder="e.g. Biogesic" required />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Generic Name (RA 6675) *</label>
              <input type="text" id="modalGenericName" class="form-input" placeholder="e.g. Paracetamol" required />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Dosage & Formulation</label>
              <input type="text" id="modalDosage" class="form-input" placeholder="e.g. 500mg Tablet" />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Category / Therapeutic Class</label>
              <select id="modalCategory" class="form-input">
                <option value="Analgesic & Antipyretic">Analgesic & Antipyretic</option>
                <option value="Antibiotics">Antibiotics</option>
                <option value="Cough & Cold">Cough & Cold</option>
                <option value="Cardiovascular">Cardiovascular</option>
                <option value="Antidiabetic">Antidiabetic</option>
                <option value="Vitamins & Supplements">Vitamins & Supplements</option>
                <option value="First Aid & Antiseptics">First Aid & Antiseptics</option>
                <option value="Respiratory">Respiratory</option>
                <option value="Medical Supplies">Medical Supplies</option>
                <option value="General Medicine">General Medicine</option>
              </select>
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Prescription Required? (Rx)</label>
              <select id="modalIsRx" class="form-input">
                <option value="false">No - Over The Counter (OTC)</option>
                <option value="true">Yes - Prescription Only (Rx)</option>
              </select>
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Unit of Measurement</label>
              <input type="text" id="modalUnit" class="form-input" placeholder="e.g. pcs, box, capsule, bottle" required />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Unit Cost Price (₱)</label>
              <input type="number" id="modalCostPrice" class="form-input" step="0.01" min="0" placeholder="0.00" required />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Selling Retail Price (₱)</label>
              <input type="number" id="modalSellingPrice" class="form-input" step="0.01" min="0" placeholder="0.00" required />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Batch / Lot Number (FDA)</label>
              <input type="text" id="modalBatchLot" class="form-input" placeholder="e.g. LOT-2026-A1" required />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Expiration Date</label>
              <input type="date" id="modalExpiryDate" class="form-input" required />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Initial / Current Stock</label>
              <input type="number" id="modalQty" class="form-input" min="0" placeholder="0" required />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Reorder Alert Level</label>
              <input type="number" id="modalReorder" class="form-input" min="1" placeholder="20" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" onclick="closeMedicineModal()" class="btn-outline">Cancel</button>
            <button type="submit" class="btn-primary">Save Medicine</button>
          </div>
        </form>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// ── Quick Selection Shortcuts (Shift + Left Click) ───────────────────────────

window.handleRowClick = function(event, itemId) {
  // If user clicked with Shift key held down OR normal click on row
  if (event.shiftKey) {
    event.preventDefault();
    const items = window.pharmacyStore.getItems();
    
    // Range selection if last clicked item exists
    if (lastClickedItemId && lastClickedItemId !== itemId) {
      const idx1 = items.findIndex(i => i.id === lastClickedItemId);
      const idx2 = items.findIndex(i => i.id === itemId);
      if (idx1 !== -1 && idx2 !== -1) {
        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);
        for (let i = start; i <= end; i++) {
          selectedInventoryItemIds.add(items[i].id);
        }
      }
    } else {
      if (selectedInventoryItemIds.has(itemId)) {
        selectedInventoryItemIds.delete(itemId);
      } else {
        selectedInventoryItemIds.add(itemId);
      }
    }
  } else {
    // Normal single row selection toggle
    if (selectedInventoryItemIds.has(itemId)) {
      selectedInventoryItemIds.delete(itemId);
    } else {
      selectedInventoryItemIds.add(itemId);
    }
  }

  lastClickedItemId = itemId;
  renderInventoryView(document.getElementById('main-content'));
};

window.toggleItemSelection = function(itemId, isSelected) {
  if (isSelected) {
    selectedInventoryItemIds.add(itemId);
  } else {
    selectedInventoryItemIds.delete(itemId);
  }
  lastClickedItemId = itemId;
  renderInventoryView(document.getElementById('main-content'));
};

window.toggleSelectAllItems = function(selectAll) {
  const items = window.pharmacyStore.getItems();
  if (selectAll) {
    items.forEach(i => selectedInventoryItemIds.add(i.id));
  } else {
    selectedInventoryItemIds.clear();
  }
  renderInventoryView(document.getElementById('main-content'));
};

window.clearItemSelection = function() {
  selectedInventoryItemIds.clear();
  lastClickedItemId = null;
  renderInventoryView(document.getElementById('main-content'));
};

window.editFirstSelected = function() {
  const firstId = selectedInventoryItemIds.values().next().value;
  if (firstId) {
    openEditMedicineModal(firstId);
  }
};

// ── Delete Confirmation & Execution ──────────────────────────────────────────

window.confirmDeleteItem = function(itemId) {
  const item = window.pharmacyStore.getItemById(itemId);
  const name = item ? `${item.brandName} (${item.genericName})` : 'this item';

  const confirmed = confirm(
    `Are you sure you want to delete this item?\n\n` +
    `• Product: ${name}\n` +
    `• Batch: ${item ? item.batchLot : 'N/A'}\n\n` +
    `This action cannot be undone and will permanently remove it from inventory.`
  );

  if (confirmed) {
    window.pharmacyStore.deleteItem(itemId);
    selectedInventoryItemIds.delete(itemId);
    renderInventoryView(document.getElementById('main-content'));
  }
};

window.deleteSelectedItems = function() {
  const count = selectedInventoryItemIds.size;
  if (count === 0) return;

  const confirmed = confirm(
    `Are you sure you want to delete these ${count} selected item(s)?\n\n` +
    `This action will permanently delete all selected items from the database.`
  );

  if (confirmed) {
    window.pharmacyStore.deleteItems(Array.from(selectedInventoryItemIds));
    selectedInventoryItemIds.clear();
    lastClickedItemId = null;
    renderInventoryView(document.getElementById('main-content'));
  }
};

// ── Search & Subtabs ─────────────────────────────────────────────────────────

window.handleInventorySearch = function(query) {
  inventorySearchQuery = query;
  renderInventoryView(document.getElementById('main-content'));
};

window.switchInventoryTab = function(tab) {
  inventoryCurrentTab = tab;
  renderInventoryView(document.getElementById('main-content'));
};

// ── Fast Adjustments (+ / -) ────────────────────────────────────────────────

window.fastAdjustStock = function(itemId, multiplier) {
  const input = document.getElementById(`adj-input-${itemId}`);
  const val = Number(input.value) || 1;
  const change = val * multiplier;
  window.pharmacyStore.adjustStock(itemId, change, 'Quick adjustment on inventory table');
  renderInventoryView(document.getElementById('main-content'));
};

// ── Quick Add Form Handler ──────────────────────────────────────────────────

window.handleQuickAdd = function(e) {
  e.preventDefault();
  const brandName = document.getElementById('quickBrandName').value.trim();
  const genericName = document.getElementById('quickGenericName').value.trim();
  const unit = document.getElementById('quickUnit').value.trim();
  const qty = Number(document.getElementById('quickQty').value);
  const price = Number(document.getElementById('quickPrice').value);

  window.pharmacyStore.addItem({
    brandName,
    genericName,
    dosage: 'Standard',
    category: 'General Medicine',
    unit,
    qty,
    sellingPrice: price,
    costPrice: price * 0.65,
    isRx: false,
    batchLot: 'LOT-' + new Date().getFullYear() + '-Q' + Math.floor(Math.random() * 900 + 100),
    expiryDate: '2028-12-31'
  });

  // Clear inputs
  document.getElementById('quickBrandName').value = '';
  document.getElementById('quickGenericName').value = '';
  document.getElementById('quickUnit').value = '';
  document.getElementById('quickQty').value = '';
  document.getElementById('quickPrice').value = '';

  renderInventoryView(document.getElementById('main-content'));
};

// ── Detailed Modal ──────────────────────────────────────────────────────────

window.openAddMedicineModal = function() {
  document.getElementById('medModalTitle').textContent = 'Add New Medicine';
  document.getElementById('modalMedId').value = '';
  document.getElementById('medDetailForm').reset();
  document.getElementById('modalExpiryDate').value = '2027-12-31';
  document.getElementById('modalReorder').value = '30';
  document.getElementById('medicineModal').classList.add('active');
};

window.openEditMedicineModal = function(id) {
  const item = window.pharmacyStore.getItemById(id);
  if (!item) return;

  document.getElementById('medModalTitle').textContent = 'Edit Medicine & Lot Info';
  document.getElementById('modalMedId').value = item.id;
  document.getElementById('modalBrandName').value = item.brandName;
  document.getElementById('modalGenericName').value = item.genericName;
  document.getElementById('modalDosage').value = item.dosage || '';
  document.getElementById('modalCategory').value = item.category || 'General Medicine';
  document.getElementById('modalIsRx').value = item.isRx ? 'true' : 'false';
  document.getElementById('modalUnit').value = item.unit;
  document.getElementById('modalCostPrice').value = item.costPrice;
  document.getElementById('modalSellingPrice').value = item.sellingPrice;
  document.getElementById('modalBatchLot').value = item.batchLot;
  document.getElementById('modalExpiryDate').value = item.expiryDate;
  document.getElementById('modalQty').value = item.currentStock;
  document.getElementById('modalReorder').value = item.reorderLevel;

  document.getElementById('medicineModal').classList.add('active');
};

window.closeMedicineModal = function() {
  document.getElementById('medicineModal').classList.remove('active');
};

window.handleSaveDetailedMedicine = function(e) {
  e.preventDefault();
  const id = document.getElementById('modalMedId').value;
  const data = {
    brandName: document.getElementById('modalBrandName').value.trim(),
    genericName: document.getElementById('modalGenericName').value.trim(),
    dosage: document.getElementById('modalDosage').value.trim(),
    category: document.getElementById('modalCategory').value,
    isRx: document.getElementById('modalIsRx').value === 'true',
    unit: document.getElementById('modalUnit').value.trim(),
    costPrice: Number(document.getElementById('modalCostPrice').value),
    sellingPrice: Number(document.getElementById('modalSellingPrice').value),
    batchLot: document.getElementById('modalBatchLot').value.trim(),
    expiryDate: document.getElementById('modalExpiryDate').value,
    currentStock: Number(document.getElementById('modalQty').value),
    reorderLevel: Number(document.getElementById('modalReorder').value)
  };

  if (id) {
    window.pharmacyStore.updateItem(id, data);
  } else {
    data.beginningStock = data.currentStock;
    window.pharmacyStore.addItem(data);
  }

  closeMedicineModal();
  renderInventoryView(document.getElementById('main-content'));
};

// ── CSV Export & Import ──────────────────────────────────────────────────────

window.exportInventoryToCSV = function() {
  const items = window.pharmacyStore.getItems();
  const headers = ['ID,Brand Name,Generic Name,Dosage,Category,Rx,Unit,Cost Price,Selling Price,Stock,Batch Lot,Expiry Date'];
  const rows = items.map(i => [
    i.id,
    `"${i.brandName}"`,
    `"${i.genericName}"`,
    `"${i.dosage || ''}"`,
    `"${i.category}"`,
    i.isRx ? 'Yes' : 'No',
    i.unit,
    i.costPrice,
    i.sellingPrice,
    i.currentStock,
    i.batchLot,
    i.expiryDate
  ].join(','));

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `AffordaLabs_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.handleCSVUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n');
    let importedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length >= 8) {
        window.pharmacyStore.addItem({
          brandName: parts[1].replace(/"/g, ''),
          genericName: parts[2].replace(/"/g, ''),
          dosage: parts[3] ? parts[3].replace(/"/g, '') : 'Standard',
          category: parts[4] ? parts[4].replace(/"/g, '') : 'General Medicine',
          isRx: parts[5] && parts[5].toLowerCase().includes('y'),
          unit: parts[6] ? parts[6].replace(/"/g, '') : 'pcs',
          costPrice: Number(parts[7]) || 5.0,
          sellingPrice: Number(parts[8]) || 10.0,
          qty: Number(parts[9]) || 50,
          batchLot: parts[10] ? parts[10].replace(/"/g, '') : 'LOT-' + Date.now(),
          expiryDate: parts[11] ? parts[11].replace(/"/g, '') : '2028-12-31'
        });
        importedCount++;
      }
    }

    alert(`Successfully imported ${importedCount} medicines from CSV!`);
    renderInventoryView(document.getElementById('main-content'));
  };
  reader.readAsText(file);
};
