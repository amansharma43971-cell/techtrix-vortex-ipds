# BhandarSetu (भंडार सेतु) UX Architecture & Operational Decisions

---

## 1. The Core 5-Second Questions
In a fast-paced government godown environment, a supervisor or auditor has zero patience for decorative animations or multi-level hidden menus. Every layout is structured to answer the **five fundamental operational questions within 5 seconds**:

| Question | UI Location & Visual Mechanism | Response Time |
| :--- | :--- | :--- |
| **1. What stock do we have, and how old is it?** | Control Tower KPIs + Inventory Age Brackets (<30d, 31-60d, 61-90d, 90+d). | < 2 seconds |
| **2. Which batch must be dispatched next, and where is it?** | Next-to-Dispatch Queue with prominent ⭐ star badge and exact Bin Coordinates (`BLK-A-01-1`). | < 1 second |
| **3. What came in, what went out, and WHY?** | Outflow Classification Chart + Append-only Live Ledger Movement Feed. | < 3 seconds |
| **4. What is at risk (expiry, hold, delay)?** | Control Tower Risk Counters + Emergency Quality & Recall Alerts. | < 2 seconds |
| **5. Can I trust this data?** | Real-time Merkle Hash Chain pill on Header (`CHAIN HEALTH: 100%`). | < 1 second |

---

## 2. Key UX Trade-offs & Decisions

### 2.1 Integer Grams as the Single Source of Truth
- **Decision:** All mathematical calculations, state stores, and database schemas use integer grams (`BIGINT`).
- **Rationale:** Floating point arithmetic in ration distribution leads to fractional rounding anomalies across truckloads (e.g. 999.99999 kg).
- **Presentation:** The UI exposes a universal Unit Toggle (`kg` vs `quintal`). Conversion occurs strictly at formatting time via `formatQuantity()`.

### 2.2 Proportional Multi-Batch Split Bar
- **Decision:** In Step 1 of Dispatch, as an operator types order quantity (e.g., 1,000 kg), the system immediately renders a live horizontal stacked bar showing which batches will be picked in what proportion.
- **Rationale:** In standard ERPs, warehouse workers only discover they need multiple batches after printing the pick slip. BhandarSetu shows the exact batch breakdown before confirmation, highlighting batch ages and preventing wrong-batch dispatches.

### 2.3 Strict Maker-Checker Guard (SQLSTATE BS004)
- **Decision:** An operator who submits a manual FIFO bypass request cannot approve their own submission. The Approvals Inbox actively inspects `requested_by_id` against the current active session.
- **Visual Feedback:** Instead of hiding the item, the UI displays a disabled `Maker-Checker Locked (Self)` badge with an alert icon, reinforcing institutional accountability.

### 2.4 Keyboard-First Stock Reconciliation
- **Decision:** Physical stock-taking uses a table where pressing `Tab` jumps directly between weight inputs.
- **Rationale:** Auditing a 20-stack godown with a clipboard requires rapid numeric data entry. Real-time variance percentages update immediately with color-coded tolerance gates (within ±0.5% = In Tolerance; >1.5% = Automatic Escalation).

### 2.5 Dual-Surface Verification (Internal Tower + Public Mobile)
- **Decision:** Dispatch produces both an internal Gate Pass record and an unauthenticated public `/verify/{token}` page optimized for mobile phone scanning.
- **Rationale:** Ration shop dealers, vigilance officers, and citizens receiving ration supplies need immediate verification without requiring system login credentials.

---

## 3. Density & Localization Modes

### 3.1 Density Toggles
- **Comfortable Mode:** Generous padding (16px/24px) for touchscreens and tablet usage in the field.
- **Compact Mode:** High information density (8px/12px) for control room multi-monitor setups.

### 3.2 Dual-Language Architecture (English & Hindi)
- Fully localized interface strings covering all domain terminology:
  - *Stock Allocation* / *भंडारण आवंटन*
  - *Gate Pass* / *गेट पास जारी करें*
  - *Quality Hold* / *गुणवत्ता रोक*
  - *Next to Dispatch* / *अगला प्रेषण*
  - *Cryptographic Seal* / *डिजिटल मुहर*

