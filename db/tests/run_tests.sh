#!/usr/bin/env bash
# ============================================================================
# BhandarSetu Automated Test Runner
# Executes all SQL integrity tests in order
# ============================================================================

set -e

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-pds_admin}"
PGDATABASE="${PGDATABASE:-bhandarsetu}"
export PGPASSWORD="${PGPASSWORD:-pds_secret_2026}"

PSQL="psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -v ON_ERROR_STOP=1"

echo "========================================================================"
echo "RUNNING BHANDARSETU AUTOMATED INTEGRATION TESTS"
echo "========================================================================"

echo "\n>>> Running 01: Invariants, Constraints & Ledger Immutability..."
$PSQL -f "$(dirname "$0")/01_invariants_and_constraints.sql"

echo "\n>>> Running 02: FIFO Allocation Engine & Determinism..."
$PSQL -f "$(dirname "$0")/02_fifo_allocation.sql"

echo "\n>>> Running 03: Quality Hold, Release & Maker-Checker..."
$PSQL -f "$(dirname "$0")/03_hold_and_release.sql"

echo "\n>>> Running 04: FIFO Exceptions & Maker-Checker Rule..."
$PSQL -f "$(dirname "$0")/04_fifo_exception_maker_checker.sql"

echo "\n>>> Running 05: Cryptographic Ledger Verification & Tamper Detection..."
$PSQL -f "$(dirname "$0")/05_ledger_tamper_detection.sql"

echo "\n>>> Running 06: Bin Layer Invariants, Capacity & Quarantine Guard (M9.1)..."
$PSQL -f "$(dirname "$0")/06_bin_invariants_and_capacity.sql"

echo "\n>>> Running 07: Putaway Scoring & FIFO Lane Preservation (M9.2)..."
$PSQL -f "$(dirname "$0")/07_putaway_lane_rules.sql"

echo "\n>>> Running 08: Wave Picking & Outbound Pick Engine (M9.3)..."
$PSQL -f "$(dirname "$0")/08_wave_picking_and_quarantine_block.sql"

echo "\n>>> Running 09: Control Tower Read Models & Outbox Dispatch (M9.4)..."
$PSQL -f "$(dirname "$0")/09_control_tower_read_models.sql"

echo "\n========================================================================"
echo "ALL SQL TESTS PASSED SUCCESSFULLY!"
echo "========================================================================"
