# k6 Load Tests

## 1. Prepare accounts

The load test reads `students.csv` from this folder. The current generated file contains 3000 test accounts:

```csv
username,password
K6250001,123456
K6250002,123456
...
K6253000,123456
```

Seed files for Docker databases:

```powershell
docker cp .\load-tests\seed-user-db-3000-students.sql user-db:/tmp/seed-user-db-3000-students.sql
docker exec user-db psql -U postgres -d user_db -f /tmp/seed-user-db-3000-students.sql

docker cp .\load-tests\seed-auth-db-3000-students.sql auth-db:/tmp/seed-auth-db-3000-students.sql
docker exec auth-db psql -U postgres -d auth_db -f /tmp/seed-auth-db-3000-students.sql
```

## 2. Recommended flow for testing 3000 simultaneous submissions

Run from the `Backend` folder.

Step 1: prepare attempts and answer all questions. This starts the exam and saves answers for every question, but does not submit.

```powershell
docker compose --profile load-test run --rm -e EXAM_ID=867766805580198903 -e VUS=3000 -e MODE=prepare k6 run exam-500.js
```

Step 2: submit at the same time. This logs in all accounts and waits for a common submit time before calling submit.

```powershell
docker compose --profile load-test run --rm -e EXAM_ID=867766805580198903 -e VUS=3000 -e MODE=submit -e SUBMIT_AFTER_SECONDS=30 k6 run exam-500.js
```

## 3. Full flow in one run

```powershell
docker compose --profile load-test run --rm -e EXAM_ID=867766805580198903 -e VUS=3000 -e MODE=full -e SUBMIT_AFTER_SECONDS=180 k6 run exam-500.js
```

## 4. Ramp gradually

```powershell
docker compose --profile load-test run --rm -e EXAM_ID=867766805580198903 -e VUS=500 -e MODE=full -e SUBMIT_AFTER_SECONDS=90 k6 run exam-500.js
docker compose --profile load-test run --rm -e EXAM_ID=867766805580198903 -e VUS=1000 -e MODE=full -e SUBMIT_AFTER_SECONDS=120 k6 run exam-500.js
docker compose --profile load-test run --rm -e EXAM_ID=867766805580198903 -e VUS=3000 -e MODE=full -e SUBMIT_AFTER_SECONDS=180 k6 run exam-500.js
```

## 5. Clean old attempts for test students

Only run this against test accounts `K6250001` to `K6253000`.

```powershell
docker exec exam-db psql -U postgres -d exam_db -c "delete from exam_attempts where exam_id = 867766805580198903 and user_tsid like 'K625%';"
docker exec redis sh -c "redis-cli --scan --pattern 'exam_state:867766805580198903:K625*' | xargs -r redis-cli del"
docker exec redis sh -c "redis-cli --scan --pattern 'exam_session:867766805580198903:K625*' | xargs -r redis-cli del"
```