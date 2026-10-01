# AffordaLabs Pharmacy POS & Inventory Management System

An all-in-one, cloud-ready Pharmacy Point-of-Sale (POS) and Inventory Management System designed specifically for community drugstores in the Philippines. Inspired by modern cloud POS architectures (such as UTAK POS) while tailored with dedicated pharmacy operations, regulatory compliance, and branding.

---

## 📸 Baseline Reference vs. Pharmacy Implementation

| Reference Screen | Baseline Feature (UTAK POS) | AffordaLabs Pharmacy Feature |
| :--- | :--- | :--- |
| **Image 1: Home** | General POS welcome banner, links, tutorial | **Pharmacy Onboarding Hub**: Pharmacist-in-Charge status, license badge, FDA/BIR compliance links, quick POS register launch, online delivery alerts. |
| **Image 2: Inventory** | Ingredient list, stock added/deducted, + / - buttons | **Drug Formulary & Batch Inventory**: Brand vs. Generic name mapping (RA 6675), Batch/Lot numbers, Expiry date tracking with `<90-day` warnings, Rx vs. OTC badges, fast inline stock adjustment, and CSV Import/Export. |
| **Image 3: Transactions** | Table with expand, cashier, date/time, refund | **BIR-Compliant Dispensing Records**: Itemized prescriptions, customer classification (Senior / PWD ID), payment badges (Cash, GCash, Maya, GrabMart), inline search, and refund with automatic inventory restock. |
| **Image 4: Reports** | Profit & COGS by Item Bar Chart | **Pharmacy Analytics & Compliance Books**: Profit vs. COGS bar chart, Fast vs. Slow moving medicine velocity, official **BIR Senior & PWD 20% Discount Sales Book**, and **FDA Prescription (Rx) Logbook**. |
| **Image 5: Dashboard** | 8 KPI cards, Sales Area Chart, Payment Breakdown | **Live Pharmacy KPIs**: Net Sales (₱), Senior/PWD Discounts (₱), Transaction Count, COGS, Units Dispensed, Gross Profit, Expiry/Reorder alerts, Area Sales Curve, and payment channel breakdown. |

---

## 🇵🇭 Philippine Pharmacy Compliance Features

1. **Philippine Generics Act of 1988 (RA 6675)**:
   - Mandatory display and searchability of **Generic Names** alongside Brand Names (e.g. Paracetamol for Biogesic, Amoxicillin for Amoxil).
2. **Senior Citizens Act (RA 9994) & PWD Act (RA 10754)**:
   - One-click Senior/PWD toggle in POS.
   - Automatically computes 12% VAT exemption and 20% discount on medicine purchases.
   - Captures Senior/PWD OSCA ID number and Doctor's Prescription for BIR tax audit compliance.
3. **FDA Batch & Expiry Management**:
   - Lot number and expiration date tracking per drug item.
   - Automatic badges for expiring items within 90 days.
4. **Cash Drawer Reconciliation**:
   - Shift opening float (petty cash fund), live cash sales tracking, and End-of-Day Z-Reading generation.

---

## 🛠️ Project Architecture

```
AL_inventory/
├── index.html                  # Single-page application shell
├── css/
│   └── style.css               # Design system matching UTAK teal palette & pastel KPI cards
├── js/
│   ├── store.js                # Reactive state store with persistent LocalStorage & initial seed
│   ├── app.js                  # View routing, navigation & global shortcuts (F2 for POS)
│   └── components/
│       ├── home.js             # Hero banner, onboarding checklist & regulatory links
│       ├── dashboard.js        # KPI cards, area sales chart & payment breakdown
│       ├── inventory.js        # Stock table, batch lots, expiry warnings, inline adjust, CSV
│       ├── pos.js              # Cashier counter, generic search, Senior/PWD 20%, BIR OR generator
│       ├── transactions.js     # Transaction history, column search, refund & reprint
│       ├── reports.js          # Profit & COGS chart, Product Mix & BIR discount reports
│       ├── staff.js            # Pharmacists & personnel credentials
│       ├── cashdrawer.js       # Shift float, cash totals & Z-Reading
│       └── settings.js         # Pharmacy details, BIR TIN & PRC license config
└── README.md                   # System documentation
```

---

## 🚀 How to Run

1. Simply double-click `index.html` or open it in any web browser (Google Chrome, Microsoft Edge, Firefox, Safari).
2. **No server installation, Node.js, or database setup is needed** to run this prototype — everything runs client-side with persistent `localStorage`.
3. Press **`F2`** anywhere in the app to immediately jump to the **Counter POS Register**!
