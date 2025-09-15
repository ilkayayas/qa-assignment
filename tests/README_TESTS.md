## QA Test Runner Guide

### Prerequisites
- Python venv is created at `.venv`
- Node.js is available (for Cypress)

### 1) Backend tests with coverage (pytest)
Run from project root:

```bash
source .venv/bin/activate
pip install -r requirements.txt -r requirements_test.txt
pytest --cov=main \
	--cov-report=term-missing:skip-covered \
	--cov-report=xml:coverage.xml
```

Artifacts:
- Terminal shows coverage summary
- XML report at `coverage.xml`

### 2) Start the API server
In a separate terminal from project root:

```bash
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

Docs:
- http://localhost:8000/docs
- http://localhost:8000/redoc

### 3) Cypress API tests and HTML report
Run from `cypressAutomation/`:

```bash
cd cypressAutomation
npm install
npm run cypress:run
# optional HTML report
npm run report:merge && npm run report:generate
```

Artifacts:
- Mochawesome HTML at `cypressAutomation/cypress/results/report.html`
- JSONs at `cypressAutomation/cypress/results/*.json`

### 4) Typical end-to-end flow
```bash
# 1) Backend tests with coverage
source .venv/bin/activate
pip install -r requirements.txt -r requirements_test.txt
pytest --cov=main --cov-report=term-missing:skip-covered --cov-report=xml:coverage.xml

# 2) Start API (keep running)
uvicorn main:app --host 0.0.0.0 --port 8000

# 3) Cypress tests & report
cd cypressAutomation
npm install
npm run cypress:run
npm run report:merge && npm run report:generate
```

### 5) What’s covered
- Pytest: fast in-process smoke and coverage across core endpoints
- Cypress: API behavior tests (positive/negative), schema checks, p95 latency, rate-limit and concurrency

### Troubleshooting
- If port 8000 is in use, stop other servers or change `--port`
- If Cypress fails on first run, ensure the API is up and reachable at `http://localhost:8000`
- To reset Node modules: `rm -rf cypressAutomation/node_modules && npm install`
