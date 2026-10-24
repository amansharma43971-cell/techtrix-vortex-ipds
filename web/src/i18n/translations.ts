// ============================================================================
// Complete Bilingual Translations Dictionary (English & Hindi)
// Natural, official civil supplies terminology
// ============================================================================

export const TRANSLATIONS = {
  en: {
    // Shell & Navigation
    app_title: "BhandarSetu",
    app_subtitle: "PDS Stock Allocation & Traceable Dispatch Control Tower",
    nav_tower: "Control Tower",
    nav_dispatch: "Dispatch Engine",
    nav_receipts: "Stock Allocation",
    nav_inventory: "Inventory & Stacks",
    nav_quality: "Quality & Recalls",
    nav_reconciliation: "Reconciliation",
    nav_approvals: "Approvals Inbox",
    nav_audit: "Forensic Audit",
    nav_insights: "Insights & SLA",
    nav_verify: "Public QR Verify",

    // Roles
    role_supervisor: "Godown Supervisor",
    role_store_employee: "Store Keeper / Picker",
    role_quality_officer: "Quality Inspector",
    role_approver: "Authorized Approver (DSO)",
    role_auditor: "Vigilance Auditor (Read-Only)",
    role_admin: "System Administrator",

    // Common Buttons & Actions
    btn_search: "Search...",
    btn_confirm: "Confirm",
    btn_cancel: "Cancel",
    btn_submit: "Submit",
    btn_refresh: "Refresh",
    btn_verify: "Verify Integrity",
    btn_download_pdf: "Download PDF Proof",
    btn_scan: "Scan QR Barcode",
    btn_override: "Request Override",
    btn_approve: "Approve",
    btn_reject: "Reject",
    btn_quarantine: "Quarantine Batch",
    btn_release: "Request Release",

    // Statuses
    status_available: "Available",
    status_near_expiry: "Near Expiry",
    status_quality_hold: "Quality Hold",
    status_quarantined_recall: "Recalled / Barricaded",
    status_reserved: "Reserved / Staged",
    status_exhausted: "Exhausted",
    status_expired: "Expired",

    // Control Tower KPIs
    kpi_available_stock: "Total Available Stock",
    kpi_held_stock: "Held / Quarantined",
    kpi_near_expiry: "Near Expiry (≤30d)",
    kpi_fifo_compliance: "FIFO Compliance",
    kpi_inbound_today: "Inflow Today",
    kpi_outbound_today: "Outflow Today",
    kpi_open_tasks: "Open Putaway / Picks",
    kpi_overdue_tasks: "Overdue SLA Tasks",
    kpi_ledger_integrity: "Ledger Cryptographic Status",

    // Dispatch Flow
    dispatch_step_1: "1. Demand & Allotment",
    dispatch_step_2: "2. FIFO Allocation Plan",
    dispatch_step_3: "3. Scan Verification & Gate Pass",
    dispatch_shortfall_title: "Stock Shortfall Alert",
    dispatch_shortfall_desc: "Demand exceeds available inventory. Silent partial fulfillment is prohibited.",
    dispatch_fifo_warning: "FIFO Inversion Alert: An older eligible batch is being bypassed.",
    dispatch_exact_sum_verified: "Exact-sum balance confirmed: zero calculation drift."
  },

  hi: {
    // Shell & Navigation
    app_title: "भंडार सेतु",
    app_subtitle: "सार्वजनिक वितरण प्रणाली FIFO स्टॉक आवंटन एवं प्रेषण नियंत्रण कक्ष",
    nav_tower: "कंट्रोल टॉवर",
    nav_dispatch: "प्रेषण इंजन",
    nav_receipts: "स्टॉक आवंटन",
    nav_inventory: "गोदाम स्टॉक व थप्पियां",
    nav_quality: "गुणवत्ता व वापसी",
    nav_reconciliation: "भौतिक सत्यापन",
    nav_approvals: "स्वीकृति इनबॉक्स",
    nav_audit: "न्यायिक ऑडिट",
    nav_insights: "विश्लेषण व SLA",
    nav_verify: "सार्वजनिक QR सत्यापन",

    // Roles
    role_supervisor: "गोदाम पर्यवेक्षक",
    role_store_employee: "स्टोर कीपर / पिकर",
    role_quality_officer: "गुणवत्ता निरीक्षक",
    role_approver: "जिला आपूर्ति अधिकारी (अनुमोदक)",
    role_auditor: "सतर्कता लेखापरीक्षक (केवल पठन)",
    role_admin: "सिस्टम प्रशासक",

    // Common Buttons & Actions
    btn_search: "खोजें...",
    btn_confirm: "पुष्टि करें",
    btn_cancel: "रद्द करें",
    btn_submit: "जमा करें",
    btn_refresh: "ताज़ा करें",
    btn_verify: "सत्यता जांचें",
    btn_download_pdf: "प्रमाण पत्र PDF डाउनलोड करें",
    btn_scan: "QR बारकोड स्कैन करें",
    btn_override: "अपवाद अनुरोध करें",
    btn_approve: "स्वीकृत करें",
    btn_reject: "अस्वीकृत करें",
    btn_quarantine: "स्टॉक को अलग (क्वारंटाइन) करें",
    btn_release: "रिलीज़ का अनुरोध करें",

    // Statuses
    status_available: "उपलब्ध",
    status_near_expiry: "समाप्ति निकट",
    status_quality_hold: "गुणवत्ता रोक",
    status_quarantined_recall: "वापसी आदेश / अवरुद्ध",
    status_reserved: "आरक्षित",
    status_exhausted: "समाप्त",
    status_expired: "अवधि समाप्त",

    // Control Tower KPIs
    kpi_available_stock: "कुल उपलब्ध खाद्यान्न",
    kpi_held_stock: "रोका गया स्टॉक",
    kpi_near_expiry: "समाप्ति निकट (≤30 दिन)",
    kpi_fifo_compliance: "FIFO अनुपालन",
    kpi_inbound_today: "आज की आवक",
    kpi_outbound_today: "आज का प्रेषण",
    kpi_open_tasks: "लंबित कार्य",
    kpi_overdue_tasks: "समय सीमा पार कार्य",
    kpi_ledger_integrity: "खाता बही सुरक्षा स्थिति",

    // Dispatch Flow
    dispatch_step_1: "1. मांग एवं राशन दुकान",
    dispatch_step_2: "2. FIFO आवंटन योजना",
    dispatch_step_3: "3. स्कैन सत्यापन एवं गेट पास",
    dispatch_shortfall_title: "स्टॉक की कमी की चेतावनी",
    dispatch_shortfall_desc: "मांग उपलब्ध गोदाम स्टॉक से अधिक है। बिना अनुमति आंशिक वितरण प्रतिबंधित है।",
    dispatch_fifo_warning: "FIFO उल्लंघन: पुराना स्टॉक छोड़ कर नया स्टॉक चुना जा रहा है।",
    dispatch_exact_sum_verified: "सटीक मात्रा सत्यापित: गणना में शून्य विचलन।"
  }
};

