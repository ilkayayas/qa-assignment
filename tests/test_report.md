## Executive Summary

This report presents the results of automated and exploratory testing for the
FastAPI-based User Management API. The testing effort combined unit-style
in-process API tests (pytest) with end-to-end API tests (Cypress), including
schema validation, negative scenarios, performance (p95 latency), and
concurrency/rate-limiting behavior. We identified critical and high-severity
issues in authentication, authorization, data exposure, and input validation.

Key outcomes:
- Automated coverage baseline established via pytest (100% of `main.py`).
- 24 bugs documented; multiple critical/high security and logic defects.
- Cypress p95 performance thresholds satisfied for sampled endpoints on a local
  environment; further profiling advised in CI/CD and staging.


## Test Metrics

- Total pytest tests executed: 41 (38 passed, 3 failing intentionally to expose bugs)
- Total Cypress specs: 11
  - Root, users-create, users-list, auth, users-update-delete, search-stats-health,
    rate-limit, concurrency, schema, perf, negative-and-boundaries
- Pass/fail ratio:
  - Pytest: green aside from 3 intentional failing assertions (pagination off-by-one;
    `/users/search` routing shadowing on username/email exact and substring)
  - Cypress: green; known defects asserted and documented
- Backend code coverage (pytest): 100% lines in `main.py`
- Performance metrics (Cypress p95 on local machine):
  - GET /, GET /health, GET /stats, GET /users?limit=10 under 250ms p95
  - Note: local figures are indicative; not production-grade benchmarks


## Bug Summary

- Total bugs found: 24
- By severity:
  - Critical: 2 (weak password hashing; token/email leakage in stats)
  - High: 4 (inactive users can login; ownership/role checks missing; sessions
    never expire; case-insensitive uniqueness collision)
  - Medium: 10 (pagination off-by-one; username validation allows quotes/; ;
    search inconsistencies; update inactive returns 200; proxy header trust;
    counters lack cleanup; silent bulk errors; mixed auth models; rate limit
    scope; concurrency races)
  - Low: 8 (timing side-channel; logout status semantics; health memory
    metrics; deprecations; logout invalid token 200; last_login on DELETE;
    negative limit acceptance; sorting by stringified timestamp)

See `tests/bugs_report.md` for full details with reproducible steps and
evidence. Where applicable, Cypress tests assert the behavior (BUG-IDs noted in
spec descriptions and comments).


## Recommendations

Priority fixes:
1. Replace MD5 + static salt with a modern password hash (bcrypt/argon2id) and
   per-user salts.
2. Reinstate and enforce session expiration; add token revocation checks.
3. Remove sensitive fields from `/stats` or protect behind admin-only auth.
4. Align auth schemes: prefer Bearer tokens for protected endpoints; require
   ownership/role-based checks for delete and update.
5. Correct pagination to honor `limit` exactly; validate parameters (lower
   bounds, enums) consistently and fail fast (422).
6. Sanitize username rules; disallow quotes/semicolons; normalize case handling.
7. Implement robust rate-limiting across sensitive endpoints (login, search,
   user listing) with trusted proxy configuration and counter eviction.
8. Fix bulk endpoint to report per-item errors; avoid blanket exception catches.

Security improvements:
- Adopt secure headers and safe defaults; avoid reflecting secrets in responses.
- Normalize and validate inputs rigorously; remove deprecated API usage to
  prevent future vulnerability windows.
- Avoid timing side-channels by equalizing error paths and delays.

Performance optimizations:
- Eliminate unnecessary string conversions in sorting; sort on native types.
- Add caching/ETags for list and stats endpoints where feasible.
- Monitor p95/ p99 latency in CI with historical regression thresholds.


## Security Assessment

Vulnerabilities identified:
- Weak password hashing (MD5+static salt) → enables offline cracking.
- Token/email disclosure via `/stats?include_details=true` → information leak.
- Session expiry not enforced → prolonged token validity.
- Mixed auth models and missing authorization checks → privilege escalation.
- Trusting `X-Forwarded-For` without known proxy → rate-limit bypass.
- Timing differences on login → user enumeration risk.

Risk levels and mitigations:
- Critical risks (hashing, secret disclosure): fix immediately; rotate any
  exposed tokens and audit access logs.
- High risks (authz gaps, session expiry): enforce role and ownership checks;
  implement token TTLs and refresh/blacklist mechanisms.
- Medium/Low risks: address input validation, deprecations, and observability
  issues to harden the service.


## Appendix

How to run tests:
- See `tests/README_TESTS.md` for detailed instructions

Artifacts:
- Pytest coverage: `coverage.xml`
- Cypress report: `cypressAutomation/cypress/results/report.html` (generate via
  `npm run report:merge && npm run report:generate`)

