import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

scripts = list(re.finditer(r'<script(?:\s+[^>]*)?>(.*?)</script>', html, re.DOTALL))
js_code = scripts[2].group(1)

# Check line offset
start_line = html[:scripts[2].start(1)].count('\n') + 1

n = len(js_code)
line = start_line
col = 1

paren_stack = []
brace_stack = []
bracket_stack = []
template_expr_stack = []

in_single = False
in_double = False
in_backtick = False
in_line_comment = False
in_block_comment = False

i = 0
while i < n:
    c = js_code[i]
    if c == '\n':
        line += 1
        col = 1
        if in_line_comment:
            in_line_comment = False
        i += 1
        continue
    else:
        col += 1

    if in_line_comment:
        i += 1
        continue

    if in_block_comment:
        if c == '*' and i + 1 < n and js_code[i+1] == '/':
            in_block_comment = False
            i += 2
            col += 1
            continue
        i += 1
        continue

    if in_single:
        if c == '\\':
            i += 2
            col += 1
            continue
        if c == '\'':
            in_single = False
        i += 1
        continue

    if in_double:
        if c == '\\':
            i += 2
            col += 1
            continue
        if c == '"':
            in_double = False
        i += 1
        continue

    if in_backtick:
        if c == '\\':
            i += 2
            col += 1
            continue
        if c == '$' and i + 1 < n and js_code[i+1] == '{':
            # Entering template expression
            brace_stack.append(('${', line, col))
            in_backtick = False # now scanning inside code expression
            i += 2
            col += 1
            continue
        if c == '`':
            in_backtick = False
        i += 1
        continue

    # Not inside string or comment
    if c == '/' and i + 1 < n and js_code[i+1] == '/':
        in_line_comment = True
        i += 2
        col += 1
        continue
    if c == '/' and i + 1 < n and js_code[i+1] == '*':
        in_block_comment = True
        i += 2
        col += 1
        continue

    if c == '\'':
        in_single = True
        i += 1
        continue
    if c == '"':
        in_double = True
        i += 1
        continue
    if c == '`':
        in_backtick = True
        i += 1
        continue

    if c == '(':
        paren_stack.append((c, line, col))
    elif c == ')':
        if not paren_stack:
            print(f'EXTRA ) at line {line}, col {col}')
        else:
            paren_stack.pop()
    elif c == '[':
        bracket_stack.append((c, line, col))
    elif c == ']':
        if not bracket_stack:
            print(f'EXTRA ] at line {line}, col {col}')
        else:
            bracket_stack.pop()
    elif c == '{':
        brace_stack.append(('{', line, col))
    elif c == '}':
        if not brace_stack:
            print(f'EXTRA }} at line {line}, col {col}')
        else:
            top = brace_stack.pop()
            if top[0] == '${':
                # Returned from template expr back to backtick
                in_backtick = True
    i += 1

print(f'Scan complete.')
print(f'Unmatched parens count: {len(paren_stack)}')
for p in paren_stack[-10:]:
    print('  Unmatched ( opened at line', p[1], 'col', p[2])

print(f'Unmatched braces count: {len(brace_stack)}')
for b in brace_stack[-10:]:
    print('  Unmatched { opened at line', b[1], 'col', b[2])

print(f'Unmatched brackets count: {len(bracket_stack)}')
for b in bracket_stack[-10:]:
    print('  Unmatched [ opened at line', b[1], 'col', b[2])

