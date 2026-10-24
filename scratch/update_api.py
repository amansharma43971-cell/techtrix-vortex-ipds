with open('api/main.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update LoginRequest
old_login_req = '''class LoginRequest(BaseModel):
    username: str
    password: str'''

new_login_req = '''class LoginRequest(BaseModel):
    username: str
    password: str
    selected_role: Optional[str] = None  # 'MANAGER' or 'WAREHOUSE_ADMIN' '''

assert old_login_req in code, 'LoginRequest not found in api/main.py'
code = code.replace(old_login_req, new_login_req, 1)

# 2. Add role mismatch verification in auth_login
old_active_check = '''    # Deactivation check
    is_active = user_record.get("is_active", True) if user_record else db_row["is_active"]
    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Account deactivated. Please contact your District Godown Manager."
        )'''

new_active_check = '''    # Deactivation check
    is_active = user_record.get("is_active", True) if user_record else db_row["is_active"]
    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Account deactivated. Please contact your District Godown Manager."
        )'''

old_token_gen = '''    # Generate secure random token (32 bytes URL-safe)
    token = f"BS-AUTH-{secrets.token_urlsafe(32)}"'''

new_role_check = '''    # Role-Selection Enforcement
    actual_role = user_data["role"]
    if req.selected_role:
        if req.selected_role == "MANAGER" and actual_role != "MANAGER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: This account is registered as a Warehouse Operator and does not have authorization to access the Manager / Supervisor portal."
            )
        elif req.selected_role == "WAREHOUSE_ADMIN" and actual_role == "MANAGER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: This account is registered as a District Manager. Please select Manager / Supervisor to access your portal."
            )

    # Generate secure random token (32 bytes URL-safe)
    token = f"BS-AUTH-{secrets.token_urlsafe(32)}"'''

# Find insertion point after user_data is formed
old_session_store = '''    ACTIVE_SESSIONS[token] = user_data'''
assert old_session_store in code, 'ACTIVE_SESSIONS[token] not found'

# Insert role check before storing session
code = code.replace(old_token_gen, new_role_check, 1)

with open('api/main.py', 'w', encoding='utf-8') as f:
    f.write(code)

print('Updated api/main.py successfully')

