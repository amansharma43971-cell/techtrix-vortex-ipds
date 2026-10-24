with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    function printCurrentConsignmentVoucher() {
      const el = document.getElementById('printableVoucherSlip');
      if (!el) return;
      const win = window.open('', '_blank', 'width=800,height=700');
      win.document.write(`
        <html>
          <head>
            <title>Consignment Intake Voucher</title>
            <script src="https://cdn.tailwindcss.com"><\\/script>
          </head>
          <body class="p-8 bg-white font-sans text-slate-900" onload="window.print()">
            ${el.outerHTML}
          </body>
        </html>
      `);
      win.document.close();
    }'''

replacement = '''    function printCurrentConsignmentVoucher() {
      const el = document.getElementById('printableVoucherSlip');
      if (!el) return;
      const win = window.open('', '_blank', 'width=800,height=700');
      const tailwindScriptTag = '<scr' + 'ipt src="https://cdn.tailwindcss.com"></scr' + 'ipt>';
      win.document.write(`
        <html>
          <head>
            <title>Consignment Intake Voucher</title>
            ` + tailwindScriptTag + `
          </head>
          <body class="p-8 bg-white font-sans text-slate-900" onload="window.print()">
            ${el.outerHTML}
          </body>
        </html>
      `);
      win.document.close();
    }'''

if target in content:
    content = content.replace(target, replacement)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Replaced dangerous script tag in printCurrentConsignmentVoucher')
else:
    print('FAILED: Target not found')

