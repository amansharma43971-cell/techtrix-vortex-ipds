# Insert Stock Control group into getRoleNavGroups
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = """        {
          title: 'Reports & Administration',"""

stock_control_nav_group = """        {
          title: 'Stock Control',
          items: [
            {
              id: 'damaged-stock',
              label: 'Damaged & Held Stock',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
              badge: (appState.damagedStock || []).filter(d => d.status === 'ON_HOLD' || d.status === 'REPORTED').length
            },
            {
              id: 'clearance-orders',
              label: 'Clearance Orders',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>',
              badge: (appState.clearanceOrders || []).filter(c => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS').length
            },
            {
              id: 'stock-transfers',
              label: 'Stock Transfer',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>',
              badge: (appState.stockTransfers || []).filter(t => t.status === 'IN_TRANSIT').length
            },
            {
              id: 'stock-verification',
              label: 'Stock Verification',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
              badge: (appState.stockVerifications || []).filter(v => v.status === 'DISCREPANCY_DETECTED').length
            },
            {
              id: 'disposal-approvals',
              label: 'Disposal & Write-off',
              icon: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>',
              badge: (appState.disposalRequests || []).filter(d => d.status === 'REQUESTED' || d.status === 'UNDER_REVIEW').length
            }
          ]
        },
        {
          title: 'Reports & Administration',"""

assert target in html, "Target Reports & Administration not found"
html = html.replace(target, stock_control_nav_group, 1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Stock Control nav group inserted into getRoleNavGroups successfully.")

