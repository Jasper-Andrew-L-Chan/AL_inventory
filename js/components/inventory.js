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

    <!-- Inventory Stock & Alert KPI Summary Banner -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
      <!-- Total Medicines In Stock Box -->
      <div class="card" onclick="switchInventoryTab('inventory')" style="margin-bottom: 0; padding: 1rem 1.25rem; border-left: 4px solid var(--primary); background: #f0fdfa; cursor: pointer; transition: transform 0.15s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 5px;">
              <i data-lucide="package-check" style="width: 15px; height: 15px;"></i> Medicines In Stock
            </div>
            <div style="font-size: 1.6rem; font-weight: 900; color: var(--primary); margin: 0.2rem 0;">
              ${items.filter(i => (Number(i.currentStock) || 0) > 0).length} <span style="font-size: 0.88rem; font-weight: 600; color: var(--text-muted);">/ ${items.length} Products</span>
            </div>
            <div style="font-size: 0.73rem; color: var(--text-muted);">
              <strong>${totalStockCount.toLocaleString()}</strong> total units available in inventory
            </div>
          </div>
          <span style="font-size: 0.7rem; font-weight: 700; background: rgba(2, 128, 144, 0.12); color: var(--primary); padding: 2px 8px; border-radius: 9999px;">
            In Stock
          </span>
        </div>
      </div>

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

    <!-- Top Action Buttons -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
      <div style="display: flex; gap: 0.75rem;">
        <button onclick="document.getElementById('inventoryImportFileInput').click()" class="btn-primary" style="background: var(--brand-charcoal); display: flex; align-items: center; gap: 0.5rem; box-shadow: none;">
          <i data-lucide="file-spreadsheet" style="width: 15px; height: 15px;"></i>
          <span>Import Inventory (.xlsx, .csv)</span>
        </button>
        <input type="file" id="inventoryImportFileInput" accept=".xlsx,.xls,.csv" style="display: none;" onchange="handleInventoryFileSelect(event)" />

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

    <!-- Selection Helper Banner Container -->
    <div id="selectionBannerContainer">
      ${selectedCount > 0 ? `
        <div id="inventorySelectionBanner" class="selected-count-banner">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="check" style="width: 14px; height: 14px;"></i> <strong>${selectedCount}</strong> item${selectedCount > 1 ? 's' : ''} selected</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">(Tip: Hold <strong>Shift</strong> and click another row to select a group)</span>
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
    </div>

    <!-- Search Toolbar with Date filters and Stock Pill -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <input 
          type="text" 
          id="inventorySearchInput"
          placeholder="Search by brand, generic, or lot #..." 
          value="${inventorySearchQuery}" 
          oninput="handleInventorySearch(this.value)" 
          class="form-input" 
          style="width: 300px; padding: 0.5rem 0.85rem;"
        />
        <div style="font-size: 0.76rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
          <kbd style="background: #e2e8f0; border-radius: 4px; padding: 2px 5px; font-size: 0.7rem; font-family: monospace;">Shift + Click</kbd>
          <span>on any row to select a group</span>
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

        <div id="inventoryCountBadge" style="background: #e07a5f; color: white; padding: 0.4rem 1rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="package" style="width: 15px; height: 15px;"></i>
          <span id="inventoryCountText">${displayedItems.length} displayed &bull; ${displayedItems.filter(i => (Number(i.currentStock) || 0) > 0).length} in stock (${displayedItems.reduce((acc, c) => acc + (Number(c.currentStock) || 0), 0).toLocaleString()} units)</span>
        </div>
      </div>
    </div>

    <!-- Inventory Data Table matching Image 2 columns -->
    <div class="table-container">
      <table class="data-table" id="inventoryTable">
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">
              <input type="checkbox" id="selectAllInventoryCheckbox" onchange="toggleSelectAllItems(this.checked)" ${allFilteredSelected ? 'checked' : ''} title="Select/Deselect All" />
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
        <tbody id="inventoryTableBody">
          ${renderInventoryTableRows(displayedItems)}
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
              <label style="font-size: 0.78rem; font-weight: 600; color: #028090; margin-bottom: 4px;">Cong's Price (₱)</label>
              <input type="number" id="modalCongPrice" class="form-input" step="0.01" min="0" placeholder="0.00" />
            </div>
            <div class="input-group">
              <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Company / Distributor</label>
              <input type="text" id="modalCompany" class="form-input" placeholder="e.g. ZUELLIG / ALLPMEDS" />
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

    <!-- Excel / CSV Import Preview & Validation Modal -->
    <div id="importPreviewModal" class="modal-overlay" style="display: none; align-items: center; justify-content: center; z-index: 10000;">
      <div class="modal-card" style="max-width: 1050px; width: 95vw; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; padding: 0;">
        <div class="modal-header" style="padding: 1.25rem 1.5rem; background: #ffffff; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(2, 128, 144, 0.12); color: var(--primary); display: flex; align-items: center; justify-content: center;">
              <i data-lucide="file-spreadsheet" style="width: 20px; height: 20px;"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--brand-charcoal);" id="importPreviewModalTitle">Import Inventory Preview & Validation</h3>
              <p style="margin: 0; font-size: 0.75rem; color: var(--text-muted);" id="importPreviewModalSubtitle">Verify detected medicine records, columns mapping, and duplicate handling before saving</p>
            </div>
          </div>
          <button onclick="closeImportPreviewModal()" style="background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px;">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>

        <div class="modal-body" style="padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1;">
          <!-- Validation Metrics Bar -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-sm); padding: 0.75rem 1rem;">
              <div style="font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Detected Rows</div>
              <div style="font-size: 1.4rem; font-weight: 900; color: #1e293b;" id="importStatTotal">0</div>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); padding: 0.75rem 1rem;">
              <div style="font-size: 0.7rem; font-weight: 700; color: #166534; text-transform: uppercase;">New Medicines</div>
              <div style="font-size: 1.4rem; font-weight: 900; color: #15803d;" id="importStatNew">0</div>
            </div>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 0.75rem 1rem;">
              <div style="font-size: 0.7rem; font-weight: 700; color: #92400e; text-transform: uppercase;">Existing Duplicates</div>
              <div style="font-size: 1.4rem; font-weight: 900; color: #b45309;" id="importStatDuplicate">0</div>
            </div>
            <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: var(--radius-sm); padding: 0.75rem 1rem;">
              <div style="font-size: 0.7rem; font-weight: 700; color: #9b2c2c; text-transform: uppercase;">Invalid / Missing Data</div>
              <div style="font-size: 1.4rem; font-weight: 900; color: #e53e3e;" id="importStatInvalid">0</div>
            </div>
          </div>

          <!-- Duplicate Resolution Options -->
          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: var(--radius-sm); padding: 0.85rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <div style="font-weight: 700; font-size: 0.84rem; color: #166534; display: flex; align-items: center; gap: 5px;">
                <i data-lucide="shield-alert" style="width: 15px; height: 15px;"></i>
                <span>Inventory Entry & Duplicate Handling</span>
              </div>
              <div style="font-size: 0.75rem; color: #374151; margin-top: 2px;">
                Choose how identical medicine names should be handled:
              </div>
            </div>
            <div style="display: flex; gap: 1rem; align-items: center; font-size: 0.82rem; font-weight: 600; flex-wrap: wrap;">
              <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #15803d;" title="Recommended: Preserve all medicines, different dosages, batches, and suppliers as separate inventory items">
                <input type="radio" name="duplicateAction" value="separate" checked onchange="handleDuplicateActionChange('separate')" />
                <span>Import All as Separate Entries (Recommended)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #1e40af;" title="Update prices and details for existing matching records">
                <input type="radio" name="duplicateAction" value="update" onchange="handleDuplicateActionChange('update')" />
                <span>Update Existing Records</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #854d0e;" title="Skip medicines that already exist in inventory">
                <input type="radio" name="duplicateAction" value="skip" onchange="handleDuplicateActionChange('skip')" />
                <span>Skip Existing</span>
              </label>
            </div>
          </div>

          <!-- Safety Backup Callout -->
          <div style="font-size: 0.75rem; color: #4b5563; background: #f9fafb; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 0.5rem 0.75rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="shield-check" style="width: 14px; height: 14px; color: #028090;"></i>
            <span>Safety Backup: The system will automatically create an instant snapshot of your current inventory before applying changes.</span>
          </div>

          <!-- Preview Table -->
          <div style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); max-height: 380px; overflow-y: auto; background: white;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
              <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 2;">
                <tr>
                  <th style="width: 45px; text-align: center;">#</th>
                  <th style="width: 95px; text-align: center;">Status</th>
                  <th>Generic & Brand Name</th>
                  <th>Dosage & Form</th>
                  <th style="text-align: right;">Initial Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Net Price</th>
                  <th style="text-align: right;">Selling Price</th>
                  <th style="text-align: right; color: #028090;">Cong's Price</th>
                  <th style="text-align: center;">Qty/Box</th>
                  <th>Expiry Date</th>
                  <th>Company</th>
                </tr>
              </thead>
              <tbody id="importPreviewTableBody">
                <!-- Dynamically populated by parseAndPreviewImportData -->
              </tbody>
            </table>
          </div>
        </div>

        <div class="modal-footer" style="padding: 1rem 1.5rem; background: #f8fafc; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <button type="button" onclick="closeImportPreviewModal()" class="btn-outline">Cancel</button>
          <div style="display: flex; gap: 0.75rem;">
            <button type="button" id="btnConfirmImport" onclick="executeInventoryImport()" class="btn-primary" style="background: var(--primary); display: flex; align-items: center; gap: 0.5rem;">
              <i data-lucide="check" style="width: 15px; height: 15px;"></i>
              <span id="btnConfirmImportText">Confirm & Save Import</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// ── Quick Selection Shortcuts (Shift + Left Click) ───────────────────────────

function updateSelectionUI() {
  const displayed = getFilteredInventoryItems();
  const selectedCount = selectedInventoryItemIds.size;
  const allFilteredSelected = displayed.length > 0 && displayed.every(i => selectedInventoryItemIds.has(i.id));

  // Update table rows and checkboxes directly for maximum responsiveness
  displayed.forEach(item => {
    const isSelected = selectedInventoryItemIds.has(item.id);
    const row = document.getElementById(`inv-row-${item.id}`);
    if (row) {
      if (isSelected) {
        row.classList.add('selected');
      } else {
        row.classList.remove('selected');
      }
    }
    const chk = document.getElementById(`inv-chk-${item.id}`);
    if (chk) {
      chk.checked = isSelected;
    }
  });

  // Update header "select all" checkbox
  const selectAllChk = document.getElementById('selectAllInventoryCheckbox');
  if (selectAllChk) {
    selectAllChk.checked = allFilteredSelected;
    selectAllChk.indeterminate = !allFilteredSelected && displayed.some(i => selectedInventoryItemIds.has(i.id));
  }

  // Update or render the Selection Helper Banner
  let banner = document.getElementById('inventorySelectionBanner');
  if (selectedCount > 0) {
    const bannerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="display: inline-flex; align-items: center; gap: 6px;"><i data-lucide="check" style="width: 14px; height: 14px;"></i> <strong>${selectedCount}</strong> item${selectedCount > 1 ? 's' : ''} selected</span>
        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">(Tip: Hold <strong>Shift</strong> and click another row to select a group)</span>
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
    `;
    if (!banner) {
      const bannerWrapper = document.getElementById('selectionBannerContainer');
      if (bannerWrapper) {
        bannerWrapper.innerHTML = `<div id="inventorySelectionBanner" class="selected-count-banner">${bannerHTML}</div>`;
      }
    } else {
      banner.style.display = 'flex';
      banner.innerHTML = bannerHTML;
    }
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  } else {
    if (banner) {
      banner.style.display = 'none';
      banner.innerHTML = '';
    }
  }
}

window.handleRowClick = function(event, itemId) {
  // Prevent row click if clicking directly on buttons or input elements
  if (event.target.closest('button') || event.target.closest('input')) {
    return;
  }

  // Clear text selection highlight if shift-clicking rows
  if (event.shiftKey) {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }

  const displayed = getFilteredInventoryItems();

  if (event.shiftKey && lastClickedItemId) {
    const idx1 = displayed.findIndex(i => i.id === lastClickedItemId);
    const idx2 = displayed.findIndex(i => i.id === itemId);
    if (idx1 !== -1 && idx2 !== -1) {
      const start = Math.min(idx1, idx2);
      const end = Math.max(idx1, idx2);
      // Select the entire range from anchor to current clicked item
      for (let i = start; i <= end; i++) {
        selectedInventoryItemIds.add(displayed[i].id);
      }
    } else {
      selectedInventoryItemIds.add(itemId);
      lastClickedItemId = itemId;
    }
  } else {
    // Regular click without Shift toggles the clicked row and sets it as anchor
    if (selectedInventoryItemIds.has(itemId)) {
      selectedInventoryItemIds.delete(itemId);
    } else {
      selectedInventoryItemIds.add(itemId);
    }
    lastClickedItemId = itemId;
  }

  updateSelectionUI();
};

window.toggleItemSelection = function(event, itemId, isSelected) {
  const displayed = getFilteredInventoryItems();

  if (event && event.shiftKey && lastClickedItemId) {
    const idx1 = displayed.findIndex(i => i.id === lastClickedItemId);
    const idx2 = displayed.findIndex(i => i.id === itemId);
    if (idx1 !== -1 && idx2 !== -1) {
      const start = Math.min(idx1, idx2);
      const end = Math.max(idx1, idx2);
      for (let i = start; i <= end; i++) {
        if (isSelected) {
          selectedInventoryItemIds.add(displayed[i].id);
        } else {
          selectedInventoryItemIds.delete(displayed[i].id);
        }
      }
    }
  } else {
    if (isSelected) {
      selectedInventoryItemIds.add(itemId);
    } else {
      selectedInventoryItemIds.delete(itemId);
    }
    lastClickedItemId = itemId;
  }

  updateSelectionUI();
};

window.toggleSelectAllItems = function(selectAll) {
  const displayed = getFilteredInventoryItems();
  if (selectAll) {
    displayed.forEach(i => selectedInventoryItemIds.add(i.id));
  } else {
    selectedInventoryItemIds.clear();
    lastClickedItemId = null;
  }
  updateSelectionUI();
};

window.clearItemSelection = function() {
  selectedInventoryItemIds.clear();
  lastClickedItemId = null;
  updateSelectionUI();
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

function getFilteredInventoryItems() {
  const items = window.pharmacyStore.getItems();
  const filtered = items.filter(item => {
    if (!inventorySearchQuery) return true;
    const q = inventorySearchQuery.toLowerCase();
    return (
      (item.brandName || '').toLowerCase().includes(q) ||
      (item.genericName || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.batchLot && item.batchLot.toLowerCase().includes(q))
    );
  });

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  if (inventoryCurrentTab === 'expiry-alerts') {
    return filtered.filter(item => {
      const isLow = (Number(item.currentStock) || 0) <= (Number(item.reorderLevel) || 10);
      const expDate = new Date(item.expiryDate);
      const isExpiring = !isNaN(expDate.getTime()) && expDate <= in90Days;
      return isLow || isExpiring;
    });
  }

  // Sort medicines alphabetically A-Z with out-of-stock items placed at the bottom
  return filtered.sort((a, b) => {
    const stockA = Number(a.currentStock) || 0;
    const stockB = Number(b.currentStock) || 0;
    const aOutOfStock = stockA <= 0;
    const bOutOfStock = stockB <= 0;

    // In-stock items appear first; out-of-stock items go to the bottom
    if (!aOutOfStock && bOutOfStock) return -1;
    if (aOutOfStock && !bOutOfStock) return 1;

    // Both are in-stock or both are out-of-stock: sort alphabetically by generic name, then brand name
    const nameA = ((a.genericName || a.brandName || a.name || '')).trim().toLowerCase();
    const nameB = ((b.genericName || b.brandName || b.name || '')).trim().toLowerCase();
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function renderInventoryTableRows(displayedItems) {
  if (!displayedItems || displayedItems.length === 0) {
    return `
      <tr>
        <td colspan="11" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="margin-bottom: 0.5rem; display: flex; justify-content: center;"><i data-lucide="${inventoryCurrentTab === 'expiry-alerts' ? 'check-circle' : 'package'}" style="width: 36px; height: 36px; opacity: 0.5; color: ${inventoryCurrentTab === 'expiry-alerts' ? '#10b981' : 'inherit'};"></i></div>
          <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-main); margin-bottom: 0.25rem;">
            ${inventoryCurrentTab === 'expiry-alerts' ? 'No Low Stock or Expiring Batches Found' : (inventorySearchQuery ? `No medicines matching "${escapeHtml(inventorySearchQuery)}"` : 'No medicines in inventory')}
          </div>
          <div style="font-size: 0.84rem; max-width: 420px; margin: 0 auto 1.25rem auto;">
            ${inventoryCurrentTab === 'expiry-alerts' ? 'All batches are well within safe shelf-life limits and have sufficient inventory.' : 'Your inventory is currently empty. Use the quick entry bar above or click the button below to add your first medicine batch.'}
          </div>
          <button onclick="${inventoryCurrentTab === 'expiry-alerts' ? "switchInventoryTab('inventory')" : 'openAddMedicineModal()'}" class="btn-primary" style="background: var(--primary); display: inline-flex; align-items: center; gap: 4px;">
            <i data-lucide="${inventoryCurrentTab === 'expiry-alerts' ? 'arrow-left' : 'plus'}" style="width: 15px; height: 15px;"></i> ${inventoryCurrentTab === 'expiry-alerts' ? 'Back to All Inventory' : 'Add First Medicine'}
          </button>
        </td>
      </tr>
    `;
  }

  return displayedItems.map(item => {
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
        title="Click to select, or Shift + Click to select a group"
      >
        <td style="text-align: center;" onclick="event.stopPropagation()">
          <input 
            type="checkbox" 
            id="inv-chk-${item.id}"
            ${isSelected ? 'checked' : ''} 
            onclick="toggleItemSelection(event, '${item.id}', this.checked)" 
          />
        </td>
        <td>
          <div style="font-weight: 800; color: var(--text-main); font-size: 0.92rem; text-transform: uppercase; letter-spacing: 0.01em;">
            ${escapeHtml(item.genericName || 'UNNAMED GENERIC')}
          </div>
          <div style="font-size: 0.8rem; color: #475569; font-weight: 500; margin-top: 1px;">
            ${escapeHtml(item.brandName || 'Generic / Unbranded')} <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: normal;">• ${escapeHtml(item.dosage || '')} [${escapeHtml(item.dosageForm || item.unit || 'pcs')}]</span>
            ${(item.company || item.supplier) ? `<span style="font-size: 0.72rem; background: #f1f5f9; color: #475569; padding: 1px 5px; border-radius: 4px; margin-left: 4px; font-weight: 600;" title="Company / Supplier">${escapeHtml(item.company || item.supplier)}</span>` : ''}
          </div>
        </td>
        <td>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(item.category)}</div>
          <span class="badge ${item.isRx ? 'badge-rx' : 'badge-otc'}" style="margin-top: 3px;">
            ${item.isRx ? 'Rx Required' : 'OTC'}
          </span>
        </td>
        <td>
          <div style="font-family: monospace; font-size: 0.78rem; font-weight: 600;">${escapeHtml(item.batchLot)}</div>
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
  }).join('');
}

// ── Search & Subtabs ─────────────────────────────────────────────────────────

window.handleInventorySearch = function(query) {
  inventorySearchQuery = query;

  const tbody = document.getElementById('inventoryTableBody');
  const countBadge = document.getElementById('inventoryCountText');

  if (tbody) {
    const displayedItems = getFilteredInventoryItems();
    tbody.innerHTML = renderInventoryTableRows(displayedItems);
    if (countBadge) {
      const inStockCount = displayedItems.filter(i => (Number(i.currentStock) || 0) > 0).length;
      const totalUnits = displayedItems.reduce((acc, c) => acc + (Number(c.currentStock) || 0), 0);
      countBadge.textContent = `${displayedItems.length} displayed • ${inStockCount} in stock (${totalUnits.toLocaleString()} units)`;
    }
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  } else {
    renderInventoryView(document.getElementById('main-content'));
  }
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
  document.getElementById('modalCostPrice').value = item.costPrice || item.unitPrice || 0;
  document.getElementById('modalSellingPrice').value = item.sellingPrice || 0;
  const congInput = document.getElementById('modalCongPrice');
  if (congInput) congInput.value = item.congPrice || 0;
  const companyInput = document.getElementById('modalCompany');
  if (companyInput) companyInput.value = item.company || item.supplier || '';
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
  const congInput = document.getElementById('modalCongPrice');
  const companyInput = document.getElementById('modalCompany');
  const data = {
    brandName: document.getElementById('modalBrandName').value.trim(),
    genericName: document.getElementById('modalGenericName').value.trim(),
    dosage: document.getElementById('modalDosage').value.trim(),
    category: document.getElementById('modalCategory').value,
    isRx: document.getElementById('modalIsRx').value === 'true',
    unit: document.getElementById('modalUnit').value.trim(),
    costPrice: Number(document.getElementById('modalCostPrice').value),
    unitPrice: Number(document.getElementById('modalCostPrice').value),
    sellingPrice: Number(document.getElementById('modalSellingPrice').value),
    congPrice: congInput ? Number(congInput.value) || 0 : 0,
    company: companyInput ? companyInput.value.trim() : '',
    supplier: companyInput ? companyInput.value.trim() : '',
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

// ── Excel (.xlsx, .xls) and CSV Import Logic with Preview & Validation ─────

let parsedImportData = [];
let importDuplicateAction = 'separate'; // 'separate' (default), 'update', 'skip'

window.closeImportPreviewModal = function() {
  const modal = document.getElementById('importPreviewModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
  const fileInput = document.getElementById('inventoryImportFileInput');
  if (fileInput) fileInput.value = '';
  parsedImportData = [];
};

window.handleDuplicateActionChange = function(action) {
  importDuplicateAction = action;
  updateImportSummaryStats();
  renderImportPreviewTable();
};

window.handleInventoryFileSelect = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
  const isCsv = fileName.endsWith('.csv');

  if (!isExcel && !isCsv) {
    alert('Unsupported file format. Please upload an Excel file (.xlsx, .xls) or a CSV file (.csv).');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();

  if (isExcel) {
    if (typeof XLSX === 'undefined') {
      alert('Excel parsing library (SheetJS) is still loading. Please check your internet connection or reload the page.');
      return;
    }
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        let rawJson = [];
        for (const sheetName of workbook.SheetNames) {
          const grid = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false });
          // Locate header row by looking for generic name, brand name, medicine name, or product
          const hIdx = grid.findIndex(r => Array.isArray(r) && r.some(c => /generic|brand|medicine|dosage|drug/i.test(String(c || ''))));
          if (hIdx === -1) continue;
          const headers = grid[hIdx].map(h => String(h || '').trim());
          rawJson = grid.slice(hIdx + 1).map(r => {
            const o = {};
            headers.forEach((h, i) => { if (h) o[h] = r[i] !== undefined ? r[i] : ''; });
            return o;
          });
          if (rawJson.length > 0) break;
        }
        if (rawJson.length === 0) {
          const ws = workbook.Sheets[workbook.SheetNames[0]];
          rawJson = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
        }
        processImportRows(rawJson, file.name);
      } catch (err) {
        alert('Failed to read Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    // CSV file
    reader.onload = function(e) {
      try {
        const text = e.target.result;
        let rawJson = [];
        if (typeof XLSX !== 'undefined') {
          const workbook = XLSX.read(text, { type: 'string' });
          const firstSheetName = workbook.SheetNames[0];
          rawJson = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: '', raw: false });
        } else {
          rawJson = parseCsvToObjects(text);
        }
        processImportRows(rawJson, file.name);
      } catch (err) {
        alert('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }
};

function parseCsvToObjects(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Simple CSV line parser respecting quotes
  const parseLine = (line) => {
    const values = [];
    let insideQuotes = false;
    let currentVal = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim());
    return values;
  };

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = vals[idx] !== undefined ? vals[idx] : '';
    });
    rows.push(rowObj);
  }
  return rows;
}

function processImportRows(rawRows, fileName) {
  if (!rawRows || rawRows.length === 0) {
    alert('The uploaded file does not contain any data rows.');
    return;
  }

  // Get current inventory to detect duplicates
  const existingItems = window.pharmacyStore.getItems();
  const makeKey = (brand, generic, dosage, form) => {
    return `${(brand || '').trim().toLowerCase()}|${(generic || '').trim().toLowerCase()}|${(dosage || '').trim().toLowerCase()}|${(form || '').trim().toLowerCase()}`;
  };
  const existingMap = new Map();
  existingItems.forEach(item => {
    existingMap.set(makeKey(item.brandName, item.genericName, item.dosage, item.dosageForm), item);
  });

  parsedImportData = [];
  let displayRowIndex = 0;

  rawRows.forEach((row, index) => {
    // 1. Intelligent column header mapping (case-insensitive & whitespace-tolerant)
    const findVal = (keywords) => {
      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const kw of keywords) {
          const cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanKey === cleanKw || cleanKey.includes(cleanKw)) {
            return String(row[key] !== undefined ? row[key] : '').trim();
          }
        }
      }
      return '';
    };

    let genericName = findVal(['generic name', 'generic', 'molecule']);
    let brandName = findVal(['brand name', 'brand', 'drug name', 'product name', 'medicine name', 'item name']);

    // Clean leading backticks or quotes if any
    genericName = genericName.replace(/^[`'"]+|[`'"]+$/g, '').trim();
    brandName = brandName.replace(/^[`'"]+|[`'"]+$/g, '').trim();

    // Skip empty trailing rows (e.g. ,,,,,,,,,,,#DIV/0!,,,#DIV/0!,,,,,,,,,,,,)
    if (!genericName && !brandName) {
      return;
    }

    const dosage = findVal(['dosage', 'strength', 'formulation']) || 'Standard';
    const dosageForm = findVal(['dosage form', 'form', 'presentation']) || 'Tablet';
    
    // Numeric sanitization: handle Excel errors like #DIV/0!, #N/A, expressions like 83+77, currency symbols
    const cleanNum = (str, fallback = 0) => {
      if (str === '' || str === null || str === undefined) return fallback;
      const s = String(str).trim();
      if (s.startsWith('#') || s === '-' || s.toLowerCase() === 'nan') return fallback;

      // Handle addition expressions like "83+77"
      if (s.includes('+')) {
        const parts = s.split('+').map(p => parseFloat(p.replace(/[^\d.-]/g, '')) || 0);
        const sum = parts.reduce((a, b) => a + b, 0);
        return isNaN(sum) ? fallback : sum;
      }

      const cleaned = s.replace(/[^\d.-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? fallback : num;
    };

    const rawInitialQty = findVal(['initial quantity', 'initial qty', 'initial qty.', 'initial stock', 'quantity', 'qty', 'stock', 'current stock']);
    const initialQty = cleanNum(rawInitialQty, 0);

    const rawUnitPrice = findVal(['unit price', 'cost price', 'cost', 'unit cost', 'purchase price']);
    const unitPrice = cleanNum(rawUnitPrice, 0);

    const rawNetPrice = findVal(['net price', 'net cost', 'net']);
    const netPrice = cleanNum(rawNetPrice, unitPrice);

    const rawQtyPerBox = findVal(['quantity per box', 'qty/box', 'qty per box', 'units per box', 'box qty', 'packaging']);
    const qtyPerBox = cleanNum(rawQtyPerBox, 1);

    const rawSellingPrice = findVal(['selling price', 'retail price', 'srp', 'price']);
    // If selling price is 0 or #DIV/0! but unitPrice is available, provide standard 20% pharmacy markup fallback if 0
    let sellingPrice = cleanNum(rawSellingPrice, 0);
    if (sellingPrice === 0 && unitPrice > 0) {
      sellingPrice = parseFloat((unitPrice * 1.20).toFixed(2));
    }

    const rawCongPrice = findVal(['cong price', "cong's price", 'congs price', 'cong', 'special price']);
    const congPrice = cleanNum(rawCongPrice, 0);

    const company = findVal(['company', 'manufacturer', 'supplier', 'distributor', 'mfg']) || 'General Distributor';

    // Parse and normalize expiry date
    const rawExpiry = findVal(['expiry date', 'expiry', 'exp date', 'expiration', 'exp']);
    let expiryDate = normalizeDateString(rawExpiry);

    // 2. Validate row
    const errors = [];
    if (initialQty < 0) {
      errors.push('Initial Quantity cannot be negative');
    }
    if (sellingPrice < 0) {
      errors.push('Selling Price cannot be negative');
    }

    const key = makeKey(brandName, genericName, dosage, dosageForm);
    const isDuplicate = existingMap.has(key);
    const existingItem = existingMap.get(key);

    let status = 'valid_new';
    if (errors.length > 0) {
      status = 'invalid';
    } else if (isDuplicate) {
      status = 'duplicate';
    }

    displayRowIndex++;
    parsedImportData.push({
      rowIndex: displayRowIndex,
      status, // 'valid_new', 'duplicate', 'invalid'
      errors,
      key,
      existingItem,
      data: {
        genericName: genericName || (brandName ? brandName : 'UNNAMED GENERIC'),
        brandName: brandName || (genericName ? genericName : 'Generic / Unbranded'),
        dosage: dosage,
        dosageForm: dosageForm,
        initialQty: initialQty,
        unitPrice: unitPrice,
        netPrice: netPrice,
        qtyPerBox: qtyPerBox > 0 ? qtyPerBox : 1,
        sellingPrice: sellingPrice,
        congPrice: congPrice,
        company: company,
        expiryDate: expiryDate || '2028-12-31'
      }
    });
  });

  // Open Preview Modal and render table
  showImportPreviewModal(fileName);
}

function normalizeDateString(dateVal) {
  if (!dateVal) return '';
  let str = String(dateVal).trim().replace(/\/+/g, '/'); // normalize double slashes like 10//27
  
  // 1. Check if already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 2. Check MM/YY or M/YY (e.g. 10/27, 09/28, 5/27)
  const mmyyMatch = str.match(/^(\d{1,2})\/(\d{2})$/);
  if (mmyyMatch) {
    const month = mmyyMatch[1].padStart(2, '0');
    const year = '20' + mmyyMatch[2];
    // Return last day of month
    const d = new Date(Number(year), Number(month), 0);
    const lastDay = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${lastDay}`;
  }

  // 3. Check MM/YYYY or M/YYYY (e.g. 08/2028, 10/2027)
  const mmyyyyMatch = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyyyyMatch) {
    const month = mmyyyyMatch[1].padStart(2, '0');
    const year = mmyyyyMatch[2];
    const d = new Date(Number(year), Number(month), 0);
    const lastDay = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${lastDay}`;
  }

  // 4. Check MM/DD/YYYY or MM/DD/YY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3].length === 2 ? '20' + slashMatch[3] : slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 5. Try standard Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return '2028-12-31';
}

function showImportPreviewModal(fileName) {
  const modal = document.getElementById('importPreviewModal');
  if (!modal) return;

  const title = document.getElementById('importPreviewModalTitle');
  if (title) title.textContent = `Import Inventory Preview: ${fileName}`;

  updateImportSummaryStats();
  renderImportPreviewTable();

  modal.style.display = 'flex';
  modal.classList.add('active');
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function updateImportSummaryStats() {
  const total = parsedImportData.length;
  const newCount = parsedImportData.filter(i => i.status === 'valid_new').length;
  const duplicateCount = parsedImportData.filter(i => i.status === 'duplicate').length;
  const invalidCount = parsedImportData.filter(i => i.status === 'invalid').length;

  const statTotal = document.getElementById('importStatTotal');
  const statNew = document.getElementById('importStatNew');
  const statDuplicate = document.getElementById('importStatDuplicate');
  const statInvalid = document.getElementById('importStatInvalid');

  if (statTotal) statTotal.textContent = total;
  if (statNew) statNew.textContent = newCount;
  if (statDuplicate) statDuplicate.textContent = duplicateCount;
  if (statInvalid) statInvalid.textContent = invalidCount;

  const btnConfirm = document.getElementById('btnConfirmImport');
  const btnConfirmText = document.getElementById('btnConfirmImportText');

  const validTotal = newCount + duplicateCount;

  if (btnConfirm) {
    if (importDuplicateAction === 'skip' && newCount === 0) {
      btnConfirm.disabled = true;
      btnConfirm.style.opacity = '0.5';
      btnConfirm.style.cursor = 'not-allowed';
    } else if (validTotal === 0) {
      btnConfirm.disabled = true;
      btnConfirm.style.opacity = '0.5';
      btnConfirm.style.cursor = 'not-allowed';
    } else {
      btnConfirm.disabled = false;
      btnConfirm.style.opacity = '1';
      btnConfirm.style.cursor = 'pointer';
    }
  }

  if (btnConfirmText) {
    if (importDuplicateAction === 'separate') {
      btnConfirmText.textContent = `Import All ${validTotal} Medicine Record${validTotal === 1 ? '' : 's'} as Separate Entries`;
    } else if (importDuplicateAction === 'update') {
      btnConfirmText.textContent = `Import ${newCount} New + Update ${duplicateCount} Existing`;
    } else {
      btnConfirmText.textContent = `Import ${newCount} New Medicine${newCount === 1 ? '' : 's'} (Skip ${duplicateCount} Duplicates)`;
    }
  }
}

function renderImportPreviewTable() {
  const tbody = document.getElementById('importPreviewTableBody');
  if (!tbody) return;

  if (parsedImportData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; padding: 2rem; color: var(--text-muted);">No records detected</td></tr>`;
    return;
  }

  tbody.innerHTML = parsedImportData.map(item => {
    const d = item.data;
    let badgeHtml = '';
    let rowBg = '';

    if (item.status === 'valid_new') {
      badgeHtml = `<span style="background: #dcfce7; color: #15803d; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; display: inline-block;">NEW</span>`;
    } else if (item.status === 'duplicate') {
      if (importDuplicateAction === 'separate') {
        badgeHtml = `<span style="background: #dcfce7; color: #166534; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; display: inline-block;" title="Will be imported as a separate inventory entry">SEPARATE ENTRY</span>`;
        rowBg = 'background: #f0fdf4;';
      } else if (importDuplicateAction === 'update') {
        badgeHtml = `<span style="background: #dbeafe; color: #2563eb; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; display: inline-block;" title="Matches existing medicine (${item.existingItem ? item.existingItem.brandName : ''})">UPDATE</span>`;
        rowBg = 'background: #eff6ff;';
      } else {
        badgeHtml = `<span style="background: #fef3c7; color: #b45309; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; display: inline-block;" title="Matches existing medicine (${item.existingItem ? item.existingItem.brandName : ''})">SKIP</span>`;
        rowBg = 'background: #fffbeb;';
      }
    } else {
      badgeHtml = `<span style="background: #fee2e2; color: #b91c1c; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; display: inline-block;" title="${item.errors.join(', ')}">INVALID</span>`;
      rowBg = 'background: #fef2f2;';
    }

    return `
      <tr style="${rowBg} border-bottom: 1px solid #f1f5f9;">
        <td style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">${item.rowIndex}</td>
        <td style="text-align: center;">${badgeHtml}</td>
        <td>
          <div style="font-weight: 800; color: var(--text-main); font-size: 0.85rem; text-transform: uppercase;">
            ${escapeHtml(d.genericName)}
          </div>
          <div style="font-size: 0.75rem; color: #475569; font-weight: 500;">
            ${escapeHtml(d.brandName)}
          </div>
        </td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(d.dosage)}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(d.dosageForm)}</div>
        </td>
        <td style="text-align: right; font-weight: 700;">${d.initialQty}</td>
        <td style="text-align: right;">₱${d.unitPrice.toFixed(2)}</td>
        <td style="text-align: right;">₱${d.netPrice.toFixed(2)}</td>
        <td style="text-align: right; font-weight: 700; color: var(--primary);">₱${d.sellingPrice.toFixed(2)}</td>
        <td style="text-align: right; font-weight: 700; color: #028090;">₱${d.congPrice.toFixed(2)}</td>
        <td style="text-align: center;">${d.qtyPerBox}</td>
        <td>${escapeHtml(d.expiryDate)}</td>
        <td style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(d.company)}">
          ${escapeHtml(d.company)}
        </td>
      </tr>
    `;
  }).join('');
}

window.executeInventoryImport = function() {
  if (!parsedImportData || parsedImportData.length === 0) {
    alert('No data to import.');
    return;
  }

  // Filter valid rows (exclude invalid/errored rows)
  const validRows = parsedImportData.filter(i => i.status !== 'invalid');
  if (validRows.length === 0) {
    alert('All records have validation errors. Please fix the file and try again.');
    return;
  }

  const itemsToProcess = validRows.map(r => r.data);

  // Execute bulk import with duplicate mode: 'separate' | 'update' | 'skip'
  const result = window.pharmacyStore.bulkImportItems(itemsToProcess, importDuplicateAction);

  // Capture invalid count before the preview data is cleared
  const invalidCount = parsedImportData.filter(i => i.status === 'invalid').length;

  // Close preview modal
  closeImportPreviewModal();

  // Re-render inventory view
  renderInventoryView(document.getElementById('main-content'));

  // Show styled import summary
  showImportResultDialog(result, invalidCount);
};

function showImportResultDialog(result, invalidCount) {
  const existing = document.getElementById('importResultOverlay');
  if (existing) existing.remove();

  const stat = (icon, label, value, color, bg) => `
    <div style="flex: 1; min-width: 120px; background: ${bg}; border-radius: 12px; padding: 0.9rem 1rem; text-align: left;">
      <div style="display: flex; align-items: center; gap: 6px; color: ${color}; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">
        <i data-lucide="${icon}" style="width: 13px; height: 13px;"></i> ${label}
      </div>
      <div style="font-size: 1.6rem; font-weight: 800; color: ${color}; margin-top: 4px;">${Number(value).toLocaleString()}</div>
    </div>`;

  const overlay = document.createElement('div');
  overlay.id = 'importResultOverlay';
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15,23,42,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 20000; opacity: 0; transition: opacity 0.2s ease;';
  overlay.innerHTML = `
    <div style="background: #fff; width: 92%; max-width: 480px; border-radius: 20px; padding: 2rem 1.75rem 1.5rem; text-align: center; box-shadow: 0 25px 60px rgba(15,23,42,0.35); transform: translateY(14px) scale(0.96); transition: transform 0.25s cubic-bezier(.2,.9,.3,1.2);">
      <div style="width: 68px; height: 68px; border-radius: 50%; margin: 0 auto 1rem; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 22px rgba(16,185,129,0.4);">
        <i data-lucide="check" style="width: 34px; height: 34px; color: #fff; stroke-width: 3;"></i>
      </div>
      <h3 style="margin: 0; font-size: 1.3rem; font-weight: 800; color: var(--brand-charcoal, #1e293b);">Import Complete</h3>
      <p style="margin: 0.35rem 0 1.25rem; font-size: 0.85rem; color: var(--text-muted, #64748b);">Your medicine inventory has been updated.</p>
      <div style="display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1rem;">
        ${stat('plus-circle', 'Added', result.addedCount, '#047857', '#ecfdf5')}
        ${stat('refresh-cw', 'Updated', result.updatedCount, '#1d4ed8', '#eff6ff')}
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1.25rem;">
        ${stat('skip-forward', 'Skipped', result.skippedCount, '#b45309', '#fffbeb')}
        ${stat('alert-circle', 'Invalid', invalidCount, '#b91c1c', '#fef2f2')}
      </div>
      <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.75rem; color: #64748b; background: #f8fafc; border-radius: 10px; padding: 0.55rem 0.75rem; margin-bottom: 1.25rem;">
        <i data-lucide="shield-check" style="width: 14px; height: 14px; color: #10b981;"></i>
        A safety backup was created before importing.
      </div>
      <button id="importResultDoneBtn" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.8rem; font-size: 0.95rem; font-weight: 700; border-radius: 12px;">Done</button>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 200);
  };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#importResultDoneBtn').addEventListener('click', close);

  if (typeof lucide !== 'undefined') lucide.createIcons();
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    overlay.firstElementChild.style.transform = 'translateY(0) scale(1)';
  });
}
