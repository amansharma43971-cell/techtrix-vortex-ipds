import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

print("=" * 60)
print("TESTING ROLE SELECTION BEFORE LOGIN REQUIREMENTS")
print("=" * 60)

# 1. Step 1 State and Screen Verification
assert 'loginStep: 1' in html, "Initial loginStep should be 1"
assert 'loginSelectedRole: null' in html, "Initial loginSelectedRole should be null"
print("✅ Initial appState verified: loginStep = 1, loginSelectedRole = null")

# 2. Extract renderLoginView block
assert 'function renderLoginView()' in html
login_view = html.split('function renderLoginView()')[1].split('function renderUnauthorizedView')[0]

# Check Step 1 (appState.loginStep === 1)
assert 'Welcome to BhandarSetu' in login_view
assert 'Select your role to continue' in login_view
assert 'Manager / Supervisor' in login_view
assert 'Manage warehouse operations, monitor inventory, review reports, and manage authorized users.' in login_view
assert 'Warehouse Operator' in login_view
assert 'Receive stock, view assigned batches, request FIFO allocation, and manage permitted dispatch tasks.' in login_view
assert 'selectLoginRole(\'MANAGER\')' in login_view
assert 'selectLoginRole(\'WAREHOUSE_ADMIN\')' in login_view
assert 'proceedToLoginForm()' in login_view
print("✅ Step 1 verified: Heading, 2 role cards, exact descriptions, select handlers & continue button present.")

# Check Step 1 strict security: NO username, password, demo credentials, or sign up form on Step 1
step1_block = login_view.split('if (step === 1)')[1].split('// SCREEN 2: LOGIN FORM')[0]
assert 'loginUsername' not in step1_block, "Username field must not be in Step 1"
assert 'loginPassword' not in step1_block, "Password field must not be in Step 1"
assert 'Demo Accounts' not in step1_block, "Demo accounts must not be displayed on Step 1"
assert 'manager@bhandarsetu.gov.in' not in step1_block, "Prefilled credentials must not be on Step 1"
assert 'Operator@2025' not in step1_block, "Prefilled passwords must not be on Step 1"
assert 'Create an account' not in step1_block, "Public registration must not be on Step 1"
print("✅ Step 1 security verified: No username, password, demo credentials, prefilled accounts, or sign-up forms.")

# Check Step 2 (Role-specific login form)
step2_block = login_view.split('// SCREEN 2: LOGIN FORM')[1]
assert 'backToRoleSelection()' in step2_block, "Back button to change role must exist on Step 2"
assert 'loginUsername' in step2_block
assert 'loginPassword' in step2_block
assert 'toggleLoginPasswordVisibility()' in step2_block
assert 'openForgotPasswordModal()' in step2_block
assert 'handleLoginSubmit(event)' in step2_block
print("✅ Step 2 verified: Back button, username, password with eye toggle, forgot password, submit handler.")

# Check Role Mismatch Enforcements in handleLoginSubmit
assert 'LOGIN_ROLE_MISMATCH_DENIED' in html
assert 'Access Denied: This account is registered as a Warehouse Operator and does not have authorization to access the Manager / Supervisor portal. Please go back and select Warehouse Operator.' in html
assert 'Access Denied: This account is registered as a District Manager. Please go back and select Manager / Supervisor to access your portal.' in html
assert 'Account deactivated. Please contact your system administrator.' in html
assert 'Invalid credentials. Please verify your official username and password, or contact your supervisor.' in html
print("✅ Credential & Role verification strings verified with exact specification wording.")

# Check CSS Animations
assert '.animate-loginSlide' in html
assert '.animate-cardSelect' in html
assert '@media (prefers-reduced-motion: reduce)' in html
print("✅ Smooth visual transitions and reduced-motion accessibility verified.")

# Check Logout Reset
logout_block = html.split('function handleLogout()')[1].split('function updateHeader()')[0]
assert 'appState.loginStep = 1' in logout_block
assert 'appState.loginSelectedRole = null' in logout_block
print("✅ Logout reset verified: resets loginStep to 1 and loginSelectedRole to null.")

print("=" * 60)
print("ALL ROLE-BASED LOGIN TESTS PASSED SUCCESSFULLY!")
print("=" * 60)
