#!/usr/bin/env python3
"""
BhandarSetu — Secure Initial Manager Account Bootstrap CLI
===========================================================
This administrative CLI script provisions or resets the initial Manager/Supervisor
account using salted PBKDF2-HMAC-SHA256 password hashing.

Usage:
    python3 bootstrap_manager.py
    python3 bootstrap_manager.py --username manager@bhandarsetu.gov.in --name "Aayush Tripathi"

Environment Variables (Optional for headless CI/CD deployment):
    BS_BOOTSTRAP_USERNAME: Initial manager username/email
    BS_BOOTSTRAP_FULLNAME: Initial manager full name
    BS_BOOTSTRAP_PASSWORD: Initial manager password (min 8 chars, mixed case, numbers, symbols)
"""

import sys
import os
import re
import getpass
import hashlib
import secrets
import json
import argparse
import datetime

def hash_password(password: str, salt_hex: str = None) -> tuple:
    """Hash password using NIST-approved PBKDF2-HMAC-SHA256 with 100,000 rounds."""
    if not salt_hex:
        salt_bytes = secrets.token_bytes(16)
        salt_hex = salt_bytes.hex()
    else:
        salt_bytes = bytes.fromhex(salt_hex)

    derived = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt_bytes,
        100000
    )
    return derived.hex(), salt_hex

def validate_password_strength(password: str) -> tuple:
    """Enforce strict government enterprise password policy."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter (A-Z)."
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter (a-z)."
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one numeric digit (0-9)."
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character (!@#$%^&*...)."
    return True, ""

def main():
    parser = argparse.ArgumentParser(description="Bootstrap initial BhandarSetu Manager credentials")
    parser.add_argument("--username", help="Manager official email or username")
    parser.add_argument("--name", help="Manager full legal name")
    parser.add_argument("--password", help="Manager password (optional; prompted securely if omitted)")
    parser.add_argument("--out-json", default="bootstrap_credentials.json", help="Path to write credentials output")
    args = parser.parse_args()

    print("=================================================================")
    print(" BhandarSetu iPDS — Initial Manager Account Bootstrap")
    print("=================================================================")

    username = args.username or os.getenv("BS_BOOTSTRAP_USERNAME")
    fullname = args.name or os.getenv("BS_BOOTSTRAP_FULLNAME")
    password = args.password or os.getenv("BS_BOOTSTRAP_PASSWORD")

    if not username:
        username = input("Enter Manager Official Username / Email [manager@bhandarsetu.gov.in]: ").strip()
        if not username:
            username = "manager@bhandarsetu.gov.in"

    if not fullname:
        fullname = input("Enter Manager Full Legal Name [Aayush Tripathi]: ").strip()
        if not fullname:
            fullname = "Aayush Tripathi"

    if not password:
        while True:
            pwd1 = getpass.getpass("Enter secure Manager password: ")
            is_valid, msg = validate_password_strength(pwd1)
            if not is_valid:
                print(f"[!] Password policy violation: {msg}")
                continue
            pwd2 = getpass.getpass("Confirm secure Manager password: ")
            if pwd1 != pwd2:
                print("[!] Passwords do not match. Please try again.")
                continue
            password = pwd1
            break
    else:
        is_valid, msg = validate_password_strength(password)
        if not is_valid:
            print(f"[!] Error: Provided password fails policy: {msg}")
            sys.exit(1)

    # Cryptographic Hash Generation
    pwd_hash, salt = hash_password(password)

    record = {
        "id": "u-manager-01",
        "username": username,
        "fullName": fullname,
        "role": "MANAGER",
        "roleTitle": "District Godown Manager / Supervisor",
        "warehouseId": None,
        "warehouseName": "All Warehouses (National Central Depot)",
        "email": username,
        "isActive": True,
        "passwordHash": pwd_hash,
        "passwordSalt": salt,
        "mustChangePassword": False,
        "permissions": [
            "VIEW_SYSTEM_DATA", "MANAGE_USERS", "APPROVE_EXCEPTIONS", "VIEW_ANALYTICS",
            "VIEW_AUDIT_LOGS", "CREATE_INWARD", "VIEW_INVENTORY", "REQUEST_ALLOCATION",
            "PREPARE_DISPATCH", "UPDATE_DELIVERY", "APPROVE_QUALITY", "OVERRIDE_HOLD_BATCH",
            "CANCEL_DISPATCH", "STOCK_ADJUSTMENT"
        ],
        "lastLogin": datetime.datetime.now().strftime("%Y-%m-%d %H:%M") + " IST",
        "createdAt": datetime.datetime.now().isoformat()
    }

    # Save to bootstrap file
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(record, f, indent=2)

    print("\n[✓] Manager Account Successfully Provisioned!")
    print(f"    Username:       {username}")
    print(f"    Full Name:      {fullname}")
    print(f"    Role:           MANAGER (Supervisor Oversight)")
    print(f"    Warehouse:      National Central Depot Scope (All Godowns)")
    print(f"    Password Salt:  {salt[:8]}... (16 bytes hex)")
    print(f"    Password Hash:  {pwd_hash[:12]}... (PBKDF2-HMAC-SHA256)")
    print(f"    Record saved to: {args.out_json}")
    print("\n[!] The plaintext password was NOT written to disk or logs.")
    print("=================================================================\n")

if __name__ == "__main__":
    main()

