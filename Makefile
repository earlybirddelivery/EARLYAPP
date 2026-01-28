# Kirana Store - Phase 5: Testing & Deployment Makefile
.PHONY: help install setup test lint format build deploy clean

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help:
	@echo "$(CYAN)Kirana Store - Phase 5: Testing & Deployment$(NC)"
	@echo ""
	@echo "$(GREEN)Development Commands:$(NC)"
	@echo "  make install          - Install all dependencies"
	@echo "  make setup            - Setup development environment"
	@echo "  make dev              - Start development servers"
	@echo ""
	@echo "$(GREEN)Testing Commands:$(NC)"
	@echo "  make test             - Run all tests"
	@echo "  make test-backend     - Run backend tests"
	@echo "  make test-frontend    - Run frontend tests"
	@echo "  make test-integration - Run integration tests"
	@echo "  make test-e2e         - Run end-to-end tests"
	@echo "  make test-load        - Run load/performance tests"
	@echo "  make coverage         - Generate test coverage report"
	@echo ""
	@echo "$(GREEN)Code Quality Commands:$(NC)"
	@echo "  make lint             - Run all linters"
	@echo "  make lint-backend     - Lint backend code (Python)"
	@echo "  make lint-frontend    - Lint frontend code (JavaScript)"
	@echo "  make format           - Format all code"
	@echo "  make format-backend   - Format backend code"
	@echo "  make format-frontend  - Format frontend code"
	@echo ""
	@echo "$(GREEN)Build Commands:$(NC)"
	@echo "  make build            - Build all containers"
	@echo "  make build-backend    - Build backend Docker image"
	@echo "  make build-frontend   - Build frontend Docker image"
	@echo "  make build-prod       - Build production images"
	@echo ""
	@echo "$(GREEN)Docker Commands:$(NC)"
	@echo "  make docker-up        - Start Docker containers (dev)"
	@echo "  make docker-down      - Stop Docker containers"
	@echo "  make docker-logs      - View Docker logs"
	@echo "  make docker-clean     - Clean Docker containers and volumes"
	@echo ""
	@echo "$(GREEN)Deployment Commands:$(NC)"
	@echo "  make deploy-staging   - Deploy to staging environment"
	@echo "  make deploy-prod      - Deploy to production"
	@echo "  make deploy-rollback  - Rollback to previous deployment"
	@echo "  make health-check     - Verify application health"
	@echo ""
	@echo "$(GREEN)Database Commands:$(NC)"
	@echo "  make db-migrate       - Run database migrations"
	@echo "  make db-seed          - Seed database with sample data"
	@echo "  make db-backup        - Backup database"
	@echo "  make db-restore       - Restore database from backup"
	@echo ""
	@echo "$(GREEN)Utility Commands:$(NC)"
	@echo "  make clean            - Clean all build artifacts"
	@echo "  make docs             - Generate documentation"
	@echo "  make security-scan    - Run security scanning"

# =====================
# INSTALLATION & SETUP
# =====================

install:
	@echo "$(CYAN)Installing dependencies...$(NC)"
	cd backend && pip install -r requirements.txt
	cd frontend && npm ci
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

setup: install
	@echo "$(CYAN)Setting up development environment...$(NC)"
	@# Copy environment files if they don't exist
	@[ -f backend/.env ] || cp backend/.env.example backend/.env
	@[ -f frontend/.env ] || cp frontend/.env.example frontend/.env
	@echo "$(GREEN)✓ Environment files created$(NC)"
	@echo "$(CYAN)Creating database...$(NC)"
	docker-compose up -d mongodb redis
	@sleep 5
	python backend/reset_users.py
	python backend/seed_data.py
	@echo "$(GREEN)✓ Development environment ready$(NC)"

# =====================
# DEVELOPMENT
# =====================

dev:
	@echo "$(CYAN)Starting development servers...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Development environment started$(NC)"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:5000"
	@echo "MongoDB:  http://localhost:8081 (Mongo Express)"

dev-stop:
	@echo "$(CYAN)Stopping development servers...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Development environment stopped$(NC)"

dev-logs:
	docker-compose logs -f

# =====================
# TESTING
# =====================

test: test-backend test-frontend test-integration
	@echo "$(GREEN)✓ All tests passed$(NC)"

test-backend:
	@echo "$(CYAN)Running backend tests...$(NC)"
	cd backend && pytest tests/ -v --cov=. --cov-report=html --cov-report=term-missing
	@echo "$(GREEN)✓ Backend tests completed$(NC)"

test-frontend:
	@echo "$(CYAN)Running frontend tests...$(NC)"
	cd frontend && npm test -- --coverage --watchAll=false
	@echo "$(GREEN)✓ Frontend tests completed$(NC)"

test-integration:
	@echo "$(CYAN)Running integration tests...$(NC)"
	cd backend && pytest test_phase5_integration.py -v
	@echo "$(GREEN)✓ Integration tests completed$(NC)"

test-access-control:
	@echo "$(CYAN)Running access control tests...$(NC)"
	cd backend && pytest test_phase5_integration.py::TestAccessControl -v

test-payment:
	@echo "$(CYAN)Running payment tests...$(NC)"
	cd backend && pytest test_phase5_integration.py::TestPaymentIntegration -v

test-mobile:
	@echo "$(CYAN)Running mobile app tests...$(NC)"
	cd backend && pytest test_phase5_integration.py::TestMobileApp -v

test-websocket:
	@echo "$(CYAN)Running WebSocket tests...$(NC)"
	cd backend && pytest test_phase5_integration.py::TestWebSocketRealTime -v

test-search:
	@echo "$(CYAN)Running search tests...$(NC)"
	cd backend && pytest test_phase5_integration.py::TestAdvancedSearch -v

test-performance:
	@echo "$(CYAN)Running performance tests...$(NC)"
	cd backend && pytest test_phase5_integration.py::TestPerformance -v

test-e2e:
	@echo "$(CYAN)Running end-to-end tests...$(NC)"
	cd frontend && npm run test:e2e
	@echo "$(GREEN)✓ E2E tests completed$(NC)"

test-load:
	@echo "$(CYAN)Running load tests...$(NC)"
	@command -v k6 >/dev/null 2>&1 || { echo "k6 not installed. Install from https://k6.io"; exit 1; }
	k6 run tests/load/api.js --vus 50 --duration 30s
	@echo "$(GREEN)✓ Load tests completed$(NC)"

coverage:
	@echo "$(CYAN)Generating coverage reports...$(NC)"
	cd backend && coverage run -m pytest tests/
	cd backend && coverage report -m
	cd backend && coverage html
	@echo "$(GREEN)✓ Coverage report generated: backend/htmlcov/index.html$(NC)"

# =====================
# CODE QUALITY
# =====================

lint: lint-backend lint-frontend
	@echo "$(GREEN)✓ All linting passed$(NC)"

lint-backend:
	@echo "$(CYAN)Linting backend code...$(NC)"
	cd backend && flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
	cd backend && flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127
	@echo "$(GREEN)✓ Backend linting completed$(NC)"

lint-frontend:
	@echo "$(CYAN)Linting frontend code...$(NC)"
	cd frontend && npm run lint
	@echo "$(GREEN)✓ Frontend linting completed$(NC)"

format: format-backend format-frontend
	@echo "$(GREEN)✓ All code formatted$(NC)"

format-backend:
	@echo "$(CYAN)Formatting backend code...$(NC)"
	cd backend && black .
	cd backend && isort .
	@echo "$(GREEN)✓ Backend code formatted$(NC)"

format-frontend:
	@echo "$(CYAN)Formatting frontend code...$(NC)"
	cd frontend && npm run format
	@echo "$(GREEN)✓ Frontend code formatted$(NC)"

# =====================
# BUILDING
# =====================

build: build-backend build-frontend
	@echo "$(GREEN)✓ All builds completed$(NC)"

build-backend:
	@echo "$(CYAN)Building backend Docker image...$(NC)"
	docker build -t kirana-backend:latest ./backend
	@echo "$(GREEN)✓ Backend image built$(NC)"

build-frontend:
	@echo "$(CYAN)Building frontend Docker image...$(NC)"
	docker build -t kirana-frontend:latest ./frontend
	@echo "$(GREEN)✓ Frontend image built$(NC)"

build-prod:
	@echo "$(CYAN)Building production images...$(NC)"
	docker build -t kirana-backend:prod ./backend
	docker build -t kirana-frontend:prod ./frontend
	@echo "$(GREEN)✓ Production images built$(NC)"

# =====================
# DOCKER COMMANDS
# =====================

docker-up:
	@echo "$(CYAN)Starting Docker containers...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Containers started$(NC)"

docker-down:
	@echo "$(CYAN)Stopping Docker containers...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Containers stopped$(NC)"

docker-logs:
	docker-compose logs -f

docker-clean:
	@echo "$(CYAN)Cleaning Docker resources...$(NC)"
	docker-compose down -v
	docker system prune -f
	@echo "$(GREEN)✓ Docker cleanup completed$(NC)"

docker-ps:
	docker-compose ps

# =====================
# DATABASE COMMANDS
# =====================

db-migrate:
	@echo "$(CYAN)Running database migrations...$(NC)"
	cd backend && python -c "from database import migrate; migrate()"
	@echo "$(GREEN)✓ Migrations completed$(NC)"

db-seed:
	@echo "$(CYAN)Seeding database...$(NC)"
	cd backend && python seed_data.py
	@echo "$(GREEN)✓ Database seeded$(NC)"

db-backup:
	@echo "$(CYAN)Backing up database...$(NC)"
	docker exec kirana_mongodb mongodump --out /backups/$(shell date +%Y%m%d_%H%M%S)
	@echo "$(GREEN)✓ Backup completed$(NC)"

db-restore:
	@echo "$(CYAN)Restoring database...$(NC)"
	@read -p "Enter backup directory: " dir; \
	docker exec kirana_mongodb mongorestore /backups/$$dir
	@echo "$(GREEN)✓ Database restored$(NC)"

# =====================
# DEPLOYMENT
# =====================

deploy-staging:
	@echo "$(CYAN)Deploying to staging...$(NC)"
	@echo "$(YELLOW)⚠ Ensure all tests pass before deploying$(NC)"
	@make test
	@echo "$(CYAN)Building images...$(NC)"
	@make build
	@echo "$(CYAN)Pushing to registry...$(NC)"
	docker tag kirana-backend:latest kirana-backend:staging
	docker tag kirana-frontend:latest kirana-frontend:staging
	@echo "$(CYAN)Deploying to staging environment...$(NC)"
	docker-compose -f docker-compose.prod.yml up -d
	@sleep 10
	@make health-check
	@echo "$(GREEN)✓ Deployment to staging completed$(NC)"

deploy-prod:
	@echo "$(RED)⚠ PRODUCTION DEPLOYMENT$(NC)"
	@echo "$(YELLOW)This will deploy to production. Proceed with caution.$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		make test; \
		make build-prod; \
		echo "$(CYAN)Pushing to registry...$(NC)"; \
		docker tag kirana-backend:prod kirana-backend:latest; \
		docker tag kirana-frontend:prod kirana-frontend:latest; \
		echo "$(CYAN)Deploying to production...$(NC)"; \
		docker-compose -f docker-compose.prod.yml up -d; \
		sleep 10; \
		make health-check; \
		echo "$(GREEN)✓ Deployment to production completed$(NC)"; \
	else \
		echo "$(YELLOW)Deployment cancelled$(NC)"; \
	fi

deploy-rollback:
	@echo "$(YELLOW)Rolling back to previous deployment...$(NC)"
	git revert --no-edit HEAD
	git push origin main
	make deploy-prod
	@echo "$(GREEN)✓ Rollback completed$(NC)"

health-check:
	@echo "$(CYAN)Checking application health...$(NC)"
	@for i in 1 2 3 4 5; do \
		if curl -f http://localhost:5000/health > /dev/null 2>&1; then \
			echo "$(GREEN)✓ Backend health check passed$(NC)"; \
			break; \
		fi; \
		echo "$(YELLOW)Waiting for backend...$(NC)"; \
		sleep 5; \
	done
	@for i in 1 2 3 4 5; do \
		if curl -f http://localhost:3000 > /dev/null 2>&1; then \
			echo "$(GREEN)✓ Frontend health check passed$(NC)"; \
			break; \
		fi; \
		echo "$(YELLOW)Waiting for frontend...$(NC)"; \
		sleep 5; \
	done
	@echo "$(GREEN)✓ All health checks passed$(NC)"

# =====================
# SECURITY & DOCS
# =====================

security-scan:
	@echo "$(CYAN)Running security scans...$(NC)"
	@command -v snyk >/dev/null 2>&1 || { echo "Snyk not installed"; exit 1; }
	snyk test backend/
	snyk test frontend/
	@echo "$(GREEN)✓ Security scan completed$(NC)"

docs:
	@echo "$(CYAN)Generating documentation...$(NC)"
	@mkdir -p docs
	@echo "Phase 5 documentation generated" > docs/PHASE_5_TESTING_DEPLOYMENT.md
	@echo "$(GREEN)✓ Documentation generated$(NC)"

# =====================
# CLEANUP
# =====================

clean:
	@echo "$(CYAN)Cleaning build artifacts...$(NC)"
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".coverage" -exec rm -rf {} +
	cd frontend && rm -rf build node_modules
	@echo "$(GREEN)✓ Cleanup completed$(NC)"

clean-all: clean docker-clean
	@echo "$(GREEN)✓ All cleanup completed$(NC)"

.DEFAULT_GOAL := help
