## BUG-001: Username uniqueness is case-sensitive leading to duplicate accounts
**Severity:** High
**Category:** Validation/Logic

**Description:**
Creating a user with the same letters but different case bypasses the uniqueness
check. Storage uses lowercase, but the pre-check compares the original
`username`, allowing duplicates/collisions.

**Steps to Reproduce:**
1. POST /users with username `CaseUser`
2. POST /users with username `caseuser`

**Expected Result:**
Second request should return 400 (duplicate username).

**Actual Result:**
Second request may succeed (201) and overwrite/conflict in storage.

**Evidence:**
```json
// Request 1
POST /users
{
  "username": "CaseUser",
  "email": "a@test.dev",
  "password": "secret12",
  "age": 21
}

// Request 2
POST /users
{
  "username": "caseuser",
  "email": "b@test.dev",
  "password": "secret12",
  "age": 21
}
```


## BUG-002: Pagination returns limit+1 items
**Severity:** Medium
**Category:** Pagination/Logic

**Description:**
GET /users returns one extra item because the slice uses `limit + 1`.

**Steps to Reproduce:**
1. Create 2+ users
2. GET /users?limit=1

**Expected Result:**
Response array length equals `limit` (1).

**Actual Result:**
Array length is 2.

**Evidence:**
```json
GET /users?limit=1
// Actual length: 2 (expected 1)
```


## BUG-003: Sessions never expire
**Severity:** High
**Category:** Security/Authentication

**Description:**
Session expiration check is commented out; tokens remain valid indefinitely.

**Steps to Reproduce:**
1. POST /login to obtain token
2. Wait beyond 24 hours (or inspect code)
3. Use token on protected endpoint

**Expected Result:**
Requests after expiration should return 401 (session expired).

**Actual Result:**
Token remains valid (no expiry enforced).

**Evidence:**
```json
// verify_session() omits expiry check; tokens do not expire
```


## BUG-004: Login allows inactive users
**Severity:** High
**Category:** Security/Authorization

**Description:**
Login endpoint does not check `is_active`, allowing deactivated users to login
and obtain tokens.

**Steps to Reproduce:**
1. Create user and delete it (soft delete sets is_active=false)
2. POST /login with that user's credentials

**Expected Result:**
Inactive users cannot login (401/403).

**Actual Result:**
Login succeeds and returns a token.

**Evidence:**
```json
POST /login
{"username": "deleted_user", "password": "secret12"}
// Returns 200 with token
```


## BUG-005: Weak password hashing (MD5 + static salt)
**Severity:** Critical
**Category:** Security/Cryptography

**Description:**
Passwords are hashed with MD5 and a static salt, which is insecure and prone to
rainbow table attacks.

**Steps to Reproduce:**
1. Inspect hashing behavior or dump stored hash

**Expected Result:**
Use a modern algorithm (e.g., bcrypt/argon2/scrypt) with per-user salts.

**Actual Result:**
MD5 with a hardcoded salt is used.

**Evidence:**
```json
// Storage shows md5("static_salt_2024" + password)
```


## BUG-006: Username validation allows quotes/semicolons
**Severity:** Medium
**Category:** Security/Validation

**Description:**
Allowed characters include `'";` which can enable injection in logs, SQL, or UI
contexts if not sanitized elsewhere.

**Steps to Reproduce:**
1. POST /users with username `bob";DROP` or `alice';--`

**Expected Result:**
Reject usernames containing quotes/semicolons.

**Actual Result:**
User creation accepted.

**Evidence:**
```json
POST /users
{"username": "alice'\";--", "email": "a@test", "password": "secret12", "age": 21}
// Returns 201
```


## BUG-007: Search `exact` flag inconsistent, email search case-sensitive
**Severity:** Low
**Category:** Functionality/UX

**Description:**
`exact=true` applies strict equality to username only; email always uses
substring match and is case-sensitive. Behavior is inconsistent and surprising.

**Steps to Reproduce:**
1. Create a user with email `User@Test.dev`
2. GET /users/search?q=user@test.dev&field=email&exact=true

**Expected Result:**
Consistent semantics across fields: either exact match or normalized compare.

**Actual Result:**
Email is matched using substring and case-sensitive logic regardless of `exact`.

**Evidence:**
```json
GET /users/search?q=user@test.dev&field=email&exact=true
// Returns results even if case differs or behaves inconsistently
```


## BUG-008: Update returns 200 for inactive users without changes
**Severity:** Medium
**Category:** Authorization/Logic

**Description:**
Updating an inactive user returns 200 and the current user state without
modifying anything, instead of rejecting the operation.

**Steps to Reproduce:**
1. Deactivate a user (DELETE /users/{id})
2. PUT /users/{id} with valid token

**Expected Result:**
Return 403 or 409 indicating updates are not allowed for inactive users.

**Actual Result:**
Returns 200 with unchanged user data.

**Evidence:**
```json
PUT /users/1
{"email": "new@test.dev"}
// 200 OK, but no update occurs
```


## BUG-009: Delete endpoint lacks ownership/role checks
**Severity:** High
**Category:** Security/Authorization

**Description:**
Any user who can pass Basic Auth can delete any other user. No ownership or role
validation is enforced.

**Steps to Reproduce:**
1. Login/create credentials for user A
2. DELETE /users/{id_of_user_B} with Basic Auth for A

**Expected Result:**
Only self-delete or privileged roles should be allowed.

**Actual Result:**
Deletion succeeds for arbitrary targets.

**Evidence:**
```json
DELETE /users/2
// Authorization: Basic ... (user A)
// Returns 200 {"message": "User deleted successfully", "was_active": true}
```


## BUG-010: Stats endpoint leaks emails and session tokens
**Severity:** Critical
**Category:** Security/Data Exposure

**Description:**
When `include_details=true`, endpoint returns user emails and session tokens.

**Steps to Reproduce:**
1. GET /stats?include_details=true

**Expected Result:**
Do not expose PII or secrets; require admin role at minimum.

**Actual Result:**
Emails and tokens are included in the response body.

**Evidence:**
```json
GET /stats?include_details=true
{
  "user_emails": ["a@test.dev", ...],
  "session_tokens": ["<token1>", "<token2>"]
}
```


## BUG-011: Rate limiting trusts spoofable headers; unbounded growth
**Severity:** Medium
**Category:** Security/Performance

**Description:**
IP is taken from `X-Forwarded-For`/`X-Real-IP` without verification (spoofable)
and request count dictionaries grow unbounded, risking memory issues.

**Steps to Reproduce:**
1. Send requests with random `X-Forwarded-For` addresses
2. Observe rate limit bypass and dictionaries growing

**Expected Result:**
Trust proxy headers only behind known proxies; cap/expire counters.

**Actual Result:**
Headers are trusted and counters never cleaned up.

**Evidence:**
```json
GET /users with X-Forwarded-For: 1.2.3.4
// Repeat with new IPs to bypass limits; memory grows
```


## BUG-012: Concurrency/race risks in global counters (no locking)
**Severity:** Medium
**Category:** Concurrency/Performance

**Description:**
`request_counts` and `last_request_time` are updated without locks, causing
race conditions under concurrent load.

**Steps to Reproduce:**
1. Fire many parallel requests from same IP

**Expected Result:**
Thread-safe increments and consistent rate limiting.

**Actual Result:**
Inconsistent counts due to races.

**Evidence:**
```json
// Parallel GETs show inconsistent throttling decisions
```


## BUG-013: Inconsistent parameter typing for get_user
**Severity:** Low
**Category:** Consistency/API Design

**Description:**
`GET /users/{user_id}` parses `user_id` as string and converts to int; other
endpoints use int path parameters. Inconsistency may cause confusing errors.

**Steps to Reproduce:**
1. GET /users/abc

**Expected Result:**
Consistent typing across endpoints; framework validation returns 422 for bad
types.

**Actual Result:**
Custom 400 with message; type model differs from other routes.

**Evidence:**
```json
GET /users/abc
// 400 {"detail": "Invalid user ID format: abc"}
```


## BUG-014: bulk_create_users swallows exceptions silently
**Severity:** Medium
**Category:** Error Handling

**Description:**
The bulk endpoint catches all exceptions and ignores failures, returning success
counts without indicating which entries failed or why.

**Steps to Reproduce:**
1. POST /users/bulk with some invalid payloads

**Expected Result:**
Return per-item status or fail with detailed errors.

**Actual Result:**
Silent `except: pass`; response claims success count only.

**Evidence:**
```json
POST /users/bulk
[{"username": "ok","email": "a@test.dev","password":"p4ssw0rd","age":21},
 {"username": "x","email": "bad","password":"1","age":10}]
// Response: {"created": 1, "users": [ ... ]} without error details
```


## BUG-015: Sorting by created_at casts to string
**Severity:** Low
**Category:** Data Handling/Sorting

**Description:**
Sorting uses `str(created_at)` as key. Although ISO-like strings may sort
lexicographically, relying on string conversion risks inconsistent ordering and
locale issues.

**Steps to Reproduce:**
1. Create users across different seconds/milliseconds
2. GET /users?sort_by=created_at&order=desc

**Expected Result:**
Stable chronological sorting based on timestamps.

**Actual Result:**
Potential inconsistent ordering due to string conversion.

**Evidence:**
```json
GET /users?sort_by=created_at&order=desc
// Order may not match true timestamps under all conditions
```


---

Notes:
- Confirmed failing automated test: `tests/test_api.py::test_users_pagination_limit_no_extra` (BUG-002)
- Additional tests should be added to assert each bug and link failures here.

### Additional Findings

## BUG-016: Timing side-channel on invalid username vs password
**Severity:** Low
**Category:** Security/Side-channel

**Description:**
Authentication delays differ when username is missing vs password mismatch, which
may leak whether a username exists.

**Steps to Reproduce:**
1. POST /login with unknown username, any password
2. POST /login with known username, wrong password
3. Measure response times

**Expected Result:**
Comparable timing responses regardless of username existence.

**Actual Result:**
Noticeable timing difference (e.g., ~50–100ms) reveals user existence.

**Evidence:**
```json
POST /login {"username":"unknown","password":"x"} // ~50ms
POST /login {"username":"known","password":"x"}   // ~100ms
```


## BUG-017: Logout returns 200 even without active session
**Severity:** Low
**Category:** UX/Security Semantics

**Description:**
`POST /logout` responds 200 with "No active session" even if no/invalid token
is provided, reducing clarity for clients and observability for security.

**Steps to Reproduce:**
1. POST /logout without Authorization header

**Expected Result:**
Return 401 or 204 without message to differentiate cases.

**Actual Result:**
Always 200 with a message.

**Evidence:**
```json
POST /logout // 200 {"message":"No active session"}
```


## BUG-018: Mixed auth models across endpoints (Basic vs Bearer)
**Severity:** Medium
**Category:** Security/Consistency

**Description:**
`DELETE /users/{id}` uses Basic Auth while `PUT /users/{id}` relies on Bearer
token sessions. Mixing patterns increases attack surface and client complexity.

**Steps to Reproduce:**
1. Attempt update with Bearer → required
2. Attempt delete with Basic → accepted

**Expected Result:**
Consistent auth scheme across protected endpoints.

**Actual Result:**
Inconsistent schemes across endpoints.

**Evidence:**
```json
DELETE /users/{id} // Basic required
PUT /users/{id}    // Bearer required
```


## BUG-019: Rate limiting applied only on POST /users (inconsistent)
**Severity:** Medium
**Category:** Security/Abuse Prevention

**Description:**
Rate limiting is enforced in `create_user` only. Other endpoints (e.g., GET
routes, login) are not rate-limited, allowing abuse such as enumeration.

**Steps to Reproduce:**
1. Send high-volume requests to `/users` (GET) or `/login` with same IP
2. Observe no 429 responses

**Expected Result:**
Consistent, configurable rate limit policy across sensitive endpoints.

**Actual Result:**
Only POST /users is limited.

**Evidence:**
```json
// Code path: verify_rate_limit() is used solely by POST /users
```


## BUG-020: Health memory metrics are not actual memory usage
**Severity:** Low
**Category:** Observability/Correctness

**Description:**
`/health` returns `memory_users` and `memory_sessions` as lengths of stringified
dicts, which do not represent memory consumption and may mislead operators.

**Steps to Reproduce:**
1. GET /health

**Expected Result:**
Either omit memory stats or report real memory metrics.

**Actual Result:**
Reports character lengths of serialized dicts.

**Evidence:**
```json
GET /health => { "memory_users": <len(str(users_db))>, ... }
```


## BUG-021: Deprecated validators and query params (future break risk)
**Severity:** Low
**Category:** Maintainability/Compatibility

**Description:**
Pydantic V1-style `@validator` and `Query(..., regex=...)` are deprecated in
current versions, emitting warnings and risking breakage on upgrades.

**Steps to Reproduce:**
1. Run tests; observe deprecation warnings

**Expected Result:**
Use `@field_validator` and `pattern=` for query validation.

**Actual Result:**
Deprecated APIs in use.

**Evidence:**
```text
PydanticDeprecatedSince20: @validator
DeprecationWarning: Query(..., regex=...) is deprecated; use pattern
```


## BUG-022: Logout with invalid token returns 200
**Severity:** Low
**Category:** UX/Security Semantics

**Description:**
`POST /logout` returns 200 "Logged out successfully" even when the provided
Bearer token is invalid/unknown, making it hard to detect token misuse.

**Steps to Reproduce:**
1. POST /logout with `Authorization: Bearer invalid`

**Expected Result:**
Return 401 or 204 (idempotent) without success message for invalid tokens.

**Actual Result:**
Returns 200 with success message.

**Evidence:**
```json
POST /logout (invalid token) => {"message":"Logged out successfully"}
```


## BUG-023: Basic auth updates last_login on DELETE
**Severity:** Low
**Category:** Data Integrity

**Description:**
Successful Basic authentication in `verify_credentials` updates `last_login`,
so invoking DELETE updates a field that should reflect actual interactive login.

**Steps to Reproduce:**
1. Create user
2. DELETE /users/{id} with Basic auth
3. Fetch user and observe `last_login` changed

**Expected Result:**
`last_login` should update on real login only.

**Actual Result:**
DELETE updates `last_login`.

**Evidence:**
```json
verify_credentials(): user["last_login"] = datetime.now()
```


## BUG-024: `limit` accepts negative numbers
**Severity:** Low
**Category:** Input Validation

**Description:**
`GET /users` uses `limit: Query(10, le=100)` without a lower bound. Negative
limits lead to confusing slices and responses.

**Steps to Reproduce:**
1. GET /users?limit=-5

**Expected Result:**
Reject with 422 or 400.

**Actual Result:**
200 with odd pagination behavior (implementation-defined slicing).

**Evidence:**
```json
GET /users?limit=-5 => 200 (unexpected acceptance)
```

