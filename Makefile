# ============================================================================
# BhandarSetu Makefile
# One-command orchestration, testing, seeding, demonstration, and load testing
# ============================================================================

.PHONY: up down restart test seed demo load verify logs clean help

help:
	@echo "BhandarSetu Operations:"
	@echo "  make up       - Build and start all services via Docker Compose"
	@echo "  make down     - Stop and teardown all running containers"
	@echo "  make restart  - Restart the complete stack"
	@echo "  make test     - Run full SQL invariant & engine test suite"
	@echo "  make seed     - Reset and reseed master godowns, commodities, batches"
	@echo "  make demo     - Execute the 6-scenario scripted demonstration"
	@echo "  make load     - Run 50-client parallel concurrency & 1M batch benchmark"
	@echo "  make verify   - Check ledger SHA-256 hash chains & balance invariant"
	@echo "  make logs     - Tail logs across postgres, api, and web services"

up:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart

test:
	docker compose exec postgres bash /db/tests/run_tests.sh

seed:
	docker compose exec postgres psql -U pds_admin -d bhandarsetu -f /docker-entrypoint-initdb.d/05_seed.sql

demo:
	docker compose exec postgres psql -U pds_admin -d bhandarsetu -f /db/demo.sql

load:
	docker compose exec api python /app/../db/tests/concurrency_test.py
	docker compose exec postgres psql -U pds_admin -d bhandarsetu -f /db/tests/benchmark_1m.sql

verify:
	docker compose exec postgres psql -U pds_admin -d bhandarsetu -c "SELECT * FROM verify_ledger_chain();"
	docker compose exec postgres psql -U pds_admin -d bhandarsetu -c "SELECT * FROM v_balance_mismatch;"
	docker compose exec postgres psql -U pds_admin -d bhandarsetu -c "SELECT * FROM v_bin_vs_batch_mismatch;"

logs:
	docker compose logs -f

