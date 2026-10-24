import re

with open('index.html', 'r', encoding='utf-8') as f:
    raw_html = f.read()

scripts = list(re.finditer(r'<script(?:\s+[^>]*)?>(.*?)</script>', raw_html, re.DOTALL))
js_code = scripts[2].group(1)

total_backticks = js_code.count('`')
escaped_backticks = js_code.count(r'\`')
unescaped = total_backticks - escaped_backticks
print(f'Total backticks: {total_backticks}, escaped: {escaped_backticks}, unescaped: {unescaped}')
assert unescaped % 2 == 0, 'Unbalanced template literals!'
print('Template literals are perfectly balanced!')

# Check curly braces in JS
open_braces = js_code.count('{')
close_braces = js_code.count('}')
print(f'Open braces: {open_braces}, Close braces: {close_braces}')

# Check parentheses in JS
open_parens = js_code.count('(')
close_parens = js_code.count(')')
print(f'Open parens: {open_parens}, Close parens: {close_parens}')

