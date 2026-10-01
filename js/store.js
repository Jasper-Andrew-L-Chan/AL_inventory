/**
 * AffordaLabs Pharmacy POS & Inventory System
 * Data Store & State Management (LocalStorage with default pharmacy seed)
 */

const STORAGE_KEYS = {
  ITEMS: 'al_pharmacy_items',
  TRANSACTIONS: 'al_pharmacy_transactions',
  SETTINGS: 'al_pharmacy_settings',
  STAFF: 'al_pharmacy_staff',
  DRAWER: 'al_pharmacy_drawer'
};

const INITIAL_MEDICINES = [
  {
    id: 'med-001',
    brandName: 'Biogesic',
    genericName: 'Paracetamol',
    dosage: '500mg Tablet',
    category: 'Analgesic & Antipyretic',
    isRx: false,
    unit: 'pcs',
    costPrice: 4.20,
    sellingPrice: 7.50,
    beginningStock: 600,
    addedStock: 100,
    deductedStock: 45,
    currentStock: 655,
    reorderLevel: 100,
    batchLot: 'LOT-PAR-26A',
    expiryDate: '2027-08-31',
    barcode: '4800016644211',
    supplier: 'Unilab Pharma'
  },
  {
    id: 'med-002',
    brandName: 'Amoxil',
    genericName: 'Amoxicillin',
    dosage: '500mg Capsule',
    category: 'Antibiotics',
    isRx: true,
    unit: 'capsule',
    costPrice: 8.50,
    sellingPrice: 15.00,
    beginningStock: 350,
    addedStock: 0,
    deductedStock: 30,
    currentStock: 320,
    reorderLevel: 50,
    batchLot: 'LOT-AMX-25F',
    expiryDate: '2026-11-20', // Expiring soon!
    barcode: '4800018899120',
    supplier: 'GSK Philippines'
  },
  {
    id: 'med-003',
    brandName: 'Neozep Forte',
    genericName: 'Phenylephrine HCl + Chlorphenamine Maleate + Paracetamol',
    dosage: 'Tablet',
    category: 'Cough & Cold',
    isRx: false,
    unit: 'pcs',
    costPrice: 5.80,
    sellingPrice: 10.00,
    beginningStock: 400,
    addedStock: 50,
    deductedStock: 60,
    currentStock: 390,
    reorderLevel: 80,
    batchLot: 'LOT-NZP-26C',
    expiryDate: '2027-05-15',
    barcode: '4800021133045',
    supplier: 'Unilab Pharma'
  },
  {
    id: 'med-004',
    brandName: 'Ponstan',
    genericName: 'Mefenamic Acid',
    dosage: '500mg Capsule',
    category: 'Analgesic & Antipyretic',
    isRx: true,
    unit: 'capsule',
    costPrice: 16.00,
    sellingPrice: 28.00,
    beginningStock: 180,
    addedStock: 0,
    deductedStock: 15,
    currentStock: 165,
    reorderLevel: 40,
    batchLot: 'LOT-PST-26B',
    expiryDate: '2027-01-10',
    barcode: '4800034455112',
    supplier: 'Pfizer Philippines'
  },
  {
    id: 'med-005',
    brandName: 'Norvasc',
    genericName: 'Amlodipine Besilate',
    dosage: '5mg Tablet',
    category: 'Cardiovascular',
    isRx: true,
    unit: 'pcs',
    costPrice: 22.00,
    sellingPrice: 38.50,
    beginningStock: 250,
    addedStock: 50,
    deductedStock: 25,
    currentStock: 275,
    reorderLevel: 60,
    batchLot: 'LOT-AML-26K',
    expiryDate: '2027-10-31',
    barcode: '4800045566778',
    supplier: 'Viatris'
  },
  {
    id: 'med-006',
    brandName: 'Glucophage',
    genericName: 'Metformin HCl',
    dosage: '500mg Tablet',
    category: 'Antidiabetic',
    isRx: true,
    unit: 'pcs',
    costPrice: 9.00,
    sellingPrice: 16.00,
    beginningStock: 300,
    addedStock: 0,
    deductedStock: 40,
    currentStock: 260,
    reorderLevel: 50,
    batchLot: 'LOT-MET-25L',
    expiryDate: '2026-12-15', // Expiring in 2 months
    barcode: '4800056677889',
    supplier: 'Merck Healthcare'
  },
  {
    id: 'med-007',
    brandName: 'Enervon C',
    genericName: 'Multivitamins + Vitamin C',
    dosage: 'Tablet',
    category: 'Vitamins & Supplements',
    isRx: false,
    unit: 'tablet',
    costPrice: 6.20,
    sellingPrice: 9.50,
    beginningStock: 800,
    addedStock: 200,
    deductedStock: 95,
    currentStock: 905,
    reorderLevel: 150,
    batchLot: 'LOT-ENV-26G',
    expiryDate: '2028-02-28',
    barcode: '4800067788990',
    supplier: 'United Laboratories'
  },
  {
    id: 'med-008',
    brandName: 'Betadine 10%',
    genericName: 'Povidone-Iodine Antiseptic Solution',
    dosage: '60ml Bottle',
    category: 'First Aid & Antiseptics',
    isRx: false,
    unit: 'bottle',
    costPrice: 115.00,
    sellingPrice: 165.00,
    beginningStock: 25,
    addedStock: 10,
    deductedStock: 3,
    currentStock: 32,
    reorderLevel: 10,
    batchLot: 'LOT-BET-26D',
    expiryDate: '2027-11-12',
    barcode: '4800078899001',
    supplier: 'Mundipharma'
  },
  {
    id: 'med-009',
    brandName: 'Ventolin Inhaler',
    genericName: 'Salbutamol Sulfate',
    dosage: '100mcg/dose CFC-Free',
    category: 'Respiratory',
    isRx: true,
    unit: 'box',
    costPrice: 310.00,
    sellingPrice: 420.00,
    beginningStock: 15,
    addedStock: 0,
    deductedStock: 2,
    currentStock: 13,
    reorderLevel: 5,
    batchLot: 'LOT-VNT-26H',
    expiryDate: '2027-04-18',
    barcode: '4800089900112',
    supplier: 'GSK Philippines'
  },
  {
    id: 'med-010',
    brandName: 'Ascorbic Acid (Generic)',
    genericName: 'Ascorbic Acid (Vitamin C)',
    dosage: '500mg Tablet',
    category: 'Vitamins & Supplements',
    isRx: false,
    unit: 'pcs',
    costPrice: 1.80,
    sellingPrice: 4.00,
    beginningStock: 1500,
    addedStock: 500,
    deductedStock: 180,
    currentStock: 1820,
    reorderLevel: 250,
    batchLot: 'LOT-ASC-26M',
    expiryDate: '2027-09-30',
    barcode: '4800091122334',
    supplier: 'RiteMed'
  }
];

const INITIAL_TRANSACTIONS = [
  {
    id: 'txn-2759',
    receiptNo: 'OR-2759',
    date: '2026-10-01',
    time: '2:22 PM',
    cashier: 'Lionel (Pharmacist)',
    customerType: 'Senior Citizen',
    customerId: 'SC-PASIG-2019-4402',
    doctorRx: 'DR. SANTOS - LIC# 009124',
    paymentMethod: 'Grab',
    items: [
      { id: 'med-001', name: 'Biogesic 500mg Tablet', qty: 20, price: 7.50, isRx: false },
      { id: 'med-002', name: 'Amoxil 500mg Capsule (Rx)', qty: 21, price: 15.00, isRx: true },
      { id: 'med-007', name: 'Enervon C Tablet', qty: 10, price: 9.50, isRx: false }
    ],
    subtotal: 560.00,
    discountAmount: 30.00,
    netTotal: 530.00,
    status: 'Completed'
  },
  {
    id: 'txn-2758',
    receiptNo: 'OR-2758',
    date: '2026-10-01',
    time: '2:09 PM',
    cashier: 'Lionel (Pharmacist)',
    customerType: 'Regular',
    paymentMethod: 'Cash',
    items: [
      { id: 'med-003', name: 'Neozep Forte Tablet', qty: 6, price: 10.00, isRx: false },
      { id: 'med-001', name: 'Biogesic 500mg Tablet', qty: 6, price: 7.50, isRx: false }
    ],
    subtotal: 105.00,
    discountAmount: 0.00,
    netTotal: 105.00,
    status: 'Completed'
  },
  {
    id: 'txn-2757',
    receiptNo: 'OR-2757',
    date: '2026-10-01',
    time: '1:52 PM',
    cashier: 'Lionel (Pharmacist)',
    customerType: 'Regular',
    paymentMethod: 'Cash',
    items: [
      { id: 'med-001', name: 'Biogesic 500mg Tablet', qty: 10, price: 7.50, isRx: false }
    ],
    subtotal: 75.00,
    discountAmount: 0.00,
    netTotal: 75.00,
    status: 'Completed'
  },
  {
    id: 'txn-2756',
    receiptNo: 'OR-2756',
    date: '2026-10-01',
    time: '1:36 PM',
    cashier: 'Lionel (Pharmacist)',
    customerType: 'PWD',
    customerId: 'PWD-2023-88219',
    paymentMethod: 'Maya',
    items: [
      { id: 'med-005', name: 'Norvasc 5mg Tablet (Rx)', qty: 6, price: 38.50, isRx: true }
    ],
    subtotal: 231.00,
    discountAmount: 11.00,
    netTotal: 220.00,
    status: 'Completed'
  },
  {
    id: 'txn-2755',
    receiptNo: 'OR-2755',
    date: '2026-10-01',
    time: '12:45 PM',
    cashier: 'Sarah (Pharmacy Asst)',
    customerType: 'Regular',
    paymentMethod: 'GCash',
    items: [
      { id: 'med-008', name: 'Betadine 10% 60ml Bottle', qty: 1, price: 165.00, isRx: false },
      { id: 'med-010', name: 'Ascorbic Acid (Generic) 500mg', qty: 30, price: 4.00, isRx: false }
    ],
    subtotal: 285.00,
    discountAmount: 0.00,
    netTotal: 285.00,
    status: 'Completed'
  },
  {
    id: 'txn-2754',
    receiptNo: 'OR-2754',
    date: '2026-10-01',
    time: '11:15 AM',
    cashier: 'Sarah (Pharmacy Asst)',
    customerType: 'Senior Citizen',
    customerId: 'SC-PASIG-2015-1109',
    paymentMethod: 'Cash',
    items: [
      { id: 'med-009', name: 'Ventolin Inhaler 100mcg', qty: 1, price: 420.00, isRx: true }
    ],
    subtotal: 420.00,
    discountAmount: 84.00,
    netTotal: 336.00,
    status: 'Completed'
  }
];

const INITIAL_SETTINGS = {
  pharmacyName: 'AffordaLabs Pharmacy',
  tagline: 'Your Trusted Community Drugstore',
  branch: 'Main Branch - Pasig City',
  address: '128 Mabini St, Kapasigan, Pasig City, Metro Manila',
  tin: '302-841-925-000',
  pharmacistInCharge: 'Jasper Andrew Chan, RPh',
  prcLicense: 'PRC-0089142',
  birAccreditation: 'BIR-RR7-2024-00981',
  phone: '(02) 8642-9912 / 0917-123-4567',
  currency: 'PHP',
  currencySymbol: '₱',
  seniorDiscountRate: 20, // 20% Senior / PWD
  vatRate: 12,
  vatExemptSenior: true
};

const INITIAL_STAFF = [
  { id: 'stf-1', name: 'Jasper Andrew Chan', role: 'Pharmacist-in-Charge / Owner', license: 'PRC-0089142', phone: '0917-123-4567', status: 'Active' },
  { id: 'stf-2', name: 'Lionel Santos', role: 'Staff Pharmacist', license: 'PRC-0092144', phone: '0918-234-5678', status: 'Active' },
  { id: 'stf-3', name: 'Sarah Dela Cruz', role: 'Pharmacy Assistant', license: 'TESDA NC-III', phone: '0922-345-6789', status: 'Active' },
  { id: 'stf-4', name: 'Mark Ramos', role: 'Inventory Specialist', license: '-', phone: '0919-456-7890', status: 'Active' }
];

const INITIAL_DRAWER = {
  shiftDate: '2026-10-01',
  openedAt: '08:00 AM',
  openedBy: 'Lionel Santos',
  openingFloat: 2000.00, // ₱2,000 petty cash float
  currentCashInDrawer: 3431.00,
  expectedCash: 3431.00,
  discrepancy: 0.00,
  status: 'Open'
};

class PharmacyStore {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.ITEMS)) {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_MEDICINES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STAFF)) {
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DRAWER)) {
      localStorage.setItem(STORAGE_KEYS.DRAWER, JSON.stringify(INITIAL_DRAWER));
    }
  }

  // --- Medicine Item Methods ---
  getItems() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ITEMS)) || [];
  }

  getItemById(id) {
    return this.getItems().find(i => i.id === id);
  }

  saveItems(items) {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('pharmacy:items-updated'));
  }

  addItem(item) {
    const items = this.getItems();
    const newItem = {
      id: 'med-' + Date.now().toString(36),
      beginningStock: Number(item.qty || 0),
      addedStock: 0,
      deductedStock: 0,
      currentStock: Number(item.qty || 0),
      reorderLevel: Number(item.reorderLevel || 20),
      batchLot: item.batchLot || 'LOT-' + new Date().getFullYear() + '-01',
      expiryDate: item.expiryDate || '2027-12-31',
      isRx: !!item.isRx,
      costPrice: Number(item.costPrice || 0),
      sellingPrice: Number(item.sellingPrice || 0),
      supplier: item.supplier || 'General Distributor',
      ...item
    };
    items.unshift(newItem);
    this.saveItems(items);
    return newItem;
  }

  updateItem(id, updates) {
    const items = this.getItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...updates };
      this.saveItems(items);
      return items[idx];
    }
    return null;
  }

  adjustStock(id, changeAmount, reason = 'Adjustment') {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (item) {
      const amount = Number(changeAmount);
      if (amount > 0) {
        item.addedStock = (Number(item.addedStock) || 0) + amount;
      } else {
        item.deductedStock = (Number(item.deductedStock) || 0) + Math.abs(amount);
      }
      item.currentStock = Math.max(0, (Number(item.currentStock) || 0) + amount);
      this.saveItems(items);
      return item;
    }
    return null;
  }

  // --- Transactions ---
  getTransactions() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
  }

  saveTransactions(txns) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txns));
    window.dispatchEvent(new CustomEvent('pharmacy:txns-updated'));
  }

  addTransaction(txnData) {
    const txns = this.getTransactions();
    const receiptNum = 2760 + txns.length;
    const now = new Date();
    
    const newTxn = {
      id: 'txn-' + Date.now(),
      receiptNo: 'OR-' + receiptNum,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cashier: txnData.cashier || 'Lionel (Pharmacist)',
      customerType: txnData.customerType || 'Regular',
      customerId: txnData.customerId || '',
      doctorRx: txnData.doctorRx || '',
      paymentMethod: txnData.paymentMethod || 'Cash',
      items: txnData.items || [],
      subtotal: Number(txnData.subtotal || 0),
      discountAmount: Number(txnData.discountAmount || 0),
      netTotal: Number(txnData.netTotal || 0),
      status: 'Completed'
    };

    txns.unshift(newTxn);
    this.saveTransactions(txns);

    // Deduct stock for each sold medicine
    txnData.items.forEach(cartItem => {
      this.adjustStock(cartItem.id, -cartItem.qty, 'POS Sale ' + newTxn.receiptNo);
    });

    // Update Cash Drawer if paid in Cash
    if (newTxn.paymentMethod === 'Cash') {
      const drawer = this.getDrawer();
      drawer.currentCashInDrawer += newTxn.netTotal;
      drawer.expectedCash += newTxn.netTotal;
      this.saveDrawer(drawer);
    }

    return newTxn;
  }

  refundTransaction(txnId, reason = 'Customer Returned Unopened') {
    const txns = this.getTransactions();
    const txn = txns.find(t => t.id === txnId);
    if (txn && txn.status !== 'Refunded') {
      txn.status = 'Refunded';
      txn.refundReason = reason;
      txn.refundDate = new Date().toISOString();
      this.saveTransactions(txns);

      // Return medicines to inventory
      txn.items.forEach(item => {
        this.adjustStock(item.id, item.qty, 'Refund Restock ' + txn.receiptNo);
      });

      return txn;
    }
    return null;
  }

  // --- Financial & Dashboard Aggregates ---
  getDashboardMetrics() {
    const txns = this.getTransactions().filter(t => t.status !== 'Refunded');
    const items = this.getItems();

    let totalNetSales = 0;
    let totalDiscounts = 0;
    let totalItemsDispensed = 0;
    let costOfGoods = 0;

    const paymentTotals = {
      Cash: 0,
      Grab: 0,
      Maya: 0,
      GCash: 0,
      Card: 0,
      FoodPanda: 0
    };

    txns.forEach(t => {
      totalNetSales += Number(t.netTotal || 0);
      totalDiscounts += Number(t.discountAmount || 0);

      const method = t.paymentMethod || 'Cash';
      if (paymentTotals[method] !== undefined) {
        paymentTotals[method] += Number(t.netTotal || 0);
      } else {
        paymentTotals['Cash'] += Number(t.netTotal || 0);
      }

      t.items.forEach(sold => {
        totalItemsDispensed += Number(sold.qty || 0);
        const originalItem = items.find(i => i.id === sold.id);
        const cost = originalItem ? originalItem.costPrice : sold.price * 0.6;
        costOfGoods += cost * Number(sold.qty || 0);
      });
    });

    const grossProfit = totalNetSales - costOfGoods;
    const lowStockCount = items.filter(i => i.currentStock <= i.reorderLevel).length;

    // Check items expiring within 90 days
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const expiringSoonCount = items.filter(i => {
      const exp = new Date(i.expiryDate);
      return exp <= in90Days;
    }).length;

    return {
      netSales: totalNetSales,
      discounts: totalDiscounts,
      transactionCount: txns.length,
      costOfGoods: costOfGoods,
      itemsDispensed: totalItemsDispensed,
      grossProfit: grossProfit,
      totalRefunds: 0.00,
      lowStockCount,
      expiringSoonCount,
      paymentTotals,
      totalSKUs: items.length
    };
  }

  // --- Settings ---
  getSettings() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || INITIAL_SETTINGS;
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('pharmacy:settings-updated'));
  }

  // --- Staff ---
  getStaff() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF)) || INITIAL_STAFF;
  }

  // --- Cash Drawer ---
  getDrawer() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.DRAWER)) || INITIAL_DRAWER;
  }

  saveDrawer(drawer) {
    localStorage.setItem(STORAGE_KEYS.DRAWER, JSON.stringify(drawer));
    window.dispatchEvent(new CustomEvent('pharmacy:drawer-updated'));
  }
}

// Global instance
window.pharmacyStore = new PharmacyStore();
