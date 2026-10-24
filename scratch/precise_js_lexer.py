import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

scripts = list(re.finditer(r'<script(?:\s+[^>]*)?>(.*?)</script>', html, re.DOTALL))
js_code = scripts[2].group(1)
start_line = html[:scripts[2].start(1)].count('\n') + 1

# Let's tokenize JavaScript using Python
# Tokens to keep track:
# parens (), brackets [], braces {}
# States: DEFAULT, STRING_SINGLE, STRING_DOUBLE, TEMPLATE, COMMENT_LINE, COMMENT_BLOCK, REGEX

paren_stack = []
bracket_stack = []
brace_stack = []
template_expr_depth = [] # stack of int tracking brace_stack depth when entering ${

n = len(js_code)
i = 0
line = start_line
col = 1

last_token = ''

while i < n:
    c = js_code[i]
    
    # Track line and col
    if c == '\n':
        line += 1
        col = 1
    else:
        col += 1

    # Whitespace
    if c in ' \t\r\n':
        i += 1
        continue

    # Single-line comment
    if c == '/' and i + 1 < n and js_code[i+1] == '/':
        while i < n and js_code[i] != '\n':
            i += 1
        continue

    # Multi-line comment
    if c == '/' and i + 1 < n and js_code[i+1] == '*':
        i += 2
        while i + 1 < n and not (js_code[i] == '*' and js_code[i+1] == '/'):
            if js_code[i] == '\n':
                line += 1
                col = 1
            i += 1
        i += 2
        continue

    # Single quote string
    if c == '\'':
        i += 1
        while i < n:
            if js_code[i] == '\\':
                i += 2
                continue
            if js_code[i] == '\'':
                i += 1
                break
            if js_code[i] == '\n':
                line += 1
                col = 1
            i += 1
        last_token = 'STRING'
        continue

    # Double quote string
    if c == '"':
        i += 1
        while i < n:
            if js_code[i] == '\\':
                i += 2
                continue
            if js_code[i] == '"':
                i += 1
                break
            if js_code[i] == '\n':
                line += 1
                col = 1
            i += 1
        last_token = 'STRING'
        continue

    # Template literal
    if c == '`':
        i += 1
        while i < n:
            if js_code[i] == '\\':
                i += 2
                continue
            if js_code[i] == '$' and i + 1 < n and js_code[i+1] == '{':
                i += 2
                # We enter an expression inside template literal
                template_expr_depth.append(len(brace_stack))
                brace_stack.append(('${', line, col))
                last_token = '${'
                break # continue parsing tokens inside ${ ... }
            if js_code[i] == '`':
                i += 1
                last_token = 'TEMPLATE'
                break
            if js_code[i] == '\n':
                line += 1
                col = 1
            i += 1
        continue

    # Regex literal check
    # A slash is regex if preceded by start of input or punctuation/keywords
    regex_preceders = {
        '', '(', '[', '{', ';', ',', '=', ':', '?', '!', '&', '|', '^', '~', '+', '-', '*', '/', '%',
        'return', 'typeof', 'delete', 'void', 'throw', 'case', 'in', 'instanceof', '=>'
    }
    if c == '/' and (last_token in regex_preceders):
        # Likely a regex
        i += 1
        in_char_class = False
        while i < n:
            if js_code[i] == '\\':
                i += 2
                continue
            if js_code[i] == '[':
                in_char_class = True
            elif js_code[i] == ']':
                in_char_class = False
            elif js_code[i] == '/' and not in_char_class:
                i += 1
                # Regex flags
                while i < n and js_code[i] in 'gimsuy':
                    i += 1
                break
            if js_code[i] == '\n':
                # regex can't cross newline
                break
            i += 1
        last_token = 'REGEX'
        continue

    # Delimiters
    if c == '(':
        paren_stack.append(('(', line, col))
        last_token = '('
        i += 1
    elif c == ')':
        if not paren_stack:
            print(f'SYNTAX ERROR: Unexpected ) at line {line}, col {col}')
        else:
            paren_stack.pop()
        last_token = ')'
        i += 1
    elif c == '[':
        bracket_stack.append(('[', line, col))
        last_token = '['
        i += 1
    elif c == ']':
        if not bracket_stack:
            print(f'SYNTAX ERROR: Unexpected ] at line {line}, col {col}')
        else:
            bracket_stack.pop()
        last_token = ']'
        i += 1
    elif c == '{':
        brace_stack.append(('{', line, col))
        last_token = '{'
        i += 1
    elif c == '}':
        if not brace_stack:
            print(f'SYNTAX ERROR: Unexpected }} at line {line}, col {col}')
        else:
            top = brace_stack.pop()
            if top[0] == '${':
                # Resume scanning template literal!
                template_expr_depth.pop()
                # Continue scan inside backtick
                while i + 1 < n:
                    i += 1
                    if js_code[i] == '\\':
                        i += 1
                        continue
                    if js_code[i] == '$' and i + 1 < n and js_code[i+1] == '{':
                        i += 2
                        template_expr_depth.append(len(brace_stack))
                        brace_stack.append(('${', line, col))
                        last_token = '${'
                        break
                    if js_code[i] == '`':
                        i += 1
                        last_token = 'TEMPLATE'
                        break
                    if js_code[i] == '\n':
                        line += 1
                        col = 1
                continue
        last_token = '}'
        i += 1
    else:
        # Word or other symbol
        if c.isalnum() or c in '_$':
            start_word = i
            while i < n and (js_code[i].isalnum() or js_code[i] in '_$'):
                i += 1
            last_token = js_code[start_word:i]
        else:
            last_token = c
            i += 1

print('=== Tokenizer Finished ===')
print(f'Unclosed parens: {len(paren_stack)}')
for p in paren_stack:
    print(f'  ( opened at line {p[1]}, col {p[2]}')

print(f'Unclosed brackets: {len(bracket_stack)}')
for b in bracket_stack:
    print(f'  [ opened at line {b[1]}, col {b[2]}')

print(f'Unclosed braces: {len(brace_stack)}')
for b in brace_stack:
    print(f'  {b[0]} opened at line {b[1]}, col {b[2]}')

