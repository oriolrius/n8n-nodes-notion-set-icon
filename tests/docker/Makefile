.PHONY: help setup build up down test validate clean logs shell rebuild status

# Default target
help:
	@echo "N8n Custom Node Docker Test Suite"
	@echo "================================="
	@echo "Available commands:"
	@echo "  make setup    - Initial setup (build node, prepare files)"
	@echo "  make build    - Build Docker images"
	@echo "  make up       - Start n8n container"
	@echo "  make validate - Run comprehensive validation"
	@echo "  make test     - Run all tests (setup + validate)"
	@echo "  make status   - Check container status"
	@echo "  make logs     - Show container logs"
	@echo "  make shell    - Open shell in n8n container"
	@echo "  make down     - Stop containers"
	@echo "  make clean    - Clean up everything"
	@echo "  make rebuild  - Clean and rebuild everything"

# Initial setup
setup:
	@echo "Setting up test environment..."
	@bash setup.sh

# Build Docker images
build: setup
	docker compose build

# Start containers
up: build
	docker compose up -d n8n
	@echo "Waiting for n8n to be ready..."
	@for i in {1..30}; do \
		if curl -s http://localhost:5678/healthz > /dev/null; then \
			echo "✅ n8n is running at http://localhost:5678"; \
			break; \
		fi; \
		echo "Waiting... ($$i/30)"; \
		sleep 2; \
	done

# Setup n8n with CLI
setup-n8n: up
	@echo "Setting up n8n environment..."
	@chmod +x setup-n8n.sh
	@./setup-n8n.sh

# Run Playwright UI tests
test-ui: setup-n8n
	@echo "Running Playwright UI tests..."
	@cd ../.. && npx playwright test --config tests/docker/playwright.config.ts

# Run validation
validate: up
	@echo "Running validation suite..."
	docker compose run --rm validator

# Run all tests (CLI setup + UI tests)
test: setup-n8n test-ui

# Run only Docker validation
test-docker: validate

# Check status
status:
	@echo "Container Status:"
	@docker compose ps
	@echo ""
	@echo "N8n Health Check:"
	@curl -s http://localhost:5678/healthz && echo " ✅ Healthy" || echo " ❌ Not responding"

# Stop containers
down:
	docker compose down

# View logs
logs:
	docker compose logs -f

# View n8n logs only
logs-n8n:
	docker compose logs -f n8n

# View validator logs only
logs-validator:
	docker compose logs -f validator

# Open shell in n8n container
shell:
	docker compose exec n8n /bin/sh

# Clean everything
clean: down
	docker compose down -v
	docker compose rm -f
	rm -rf test-results/
	rm -rf custom-node/

# Rebuild everything
rebuild: clean build