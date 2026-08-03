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

## 6. Activity registration load test

The activity registration script simulates the real student flow:

1. Admin logs in and creates a `LIMITED` activity, unless `ACTIVITY_ID` is provided.
2. Each student logs in.
3. Each student loads the activity list and activity detail.
4. All students wait for the same timestamp.
5. Each student calls `POST /api/activities/{id}/registrations/me`.
6. Each student reloads the activity detail.

Run from the `Backend` folder.

Create a new activity with capacity equal to the number of virtual users:

```powershell
docker compose --profile load-test run --rm `
  -e ADMIN_USERNAME=admin `
  -e ADMIN_PASSWORD=Admin123!@ `
  -e VUS=500 `
  -e CAPACITY=500 `
  -e REGISTER_AFTER_SECONDS=10 `
  k6 run activity-registration.js
```

Test the last-slot race condition. In this case, `http_req_failed` may show expected `400` responses because students after the capacity is full are rejected by business rule. Use the custom metric `unexpected_failure_rate` as the pass/fail signal:

```powershell
docker compose --profile load-test run --rm `
  -e ADMIN_USERNAME=admin `
  -e ADMIN_PASSWORD=Admin123!@ `
  -e VUS=500 `
  -e CAPACITY=100 `
  -e EXPECT_FULL=true `
  -e REGISTER_AFTER_SECONDS=10 `
  k6 run activity-registration.js
```

Stress test 5000 students competing for 100 registration slots:

Seed 5000 test students:

```powershell
docker cp .\load-tests\seed-user-db-5000-students.sql user-db:/tmp/seed-user-db-5000-students.sql
docker exec user-db psql -U postgres -d user_db -f /tmp/seed-user-db-5000-students.sql

docker cp .\load-tests\seed-auth-db-5000-students.sql auth-db:/tmp/seed-auth-db-5000-students.sql
docker exec auth-db psql -U postgres -d auth_db -f /tmp/seed-auth-db-5000-students.sql
```

Run the competition test:

```powershell
docker compose --profile load-test run --rm `
  -e ADMIN_USERNAME=admin `
  -e ADMIN_PASSWORD=Admin123!@ `
  -e STUDENTS_FILE=./students-5000.csv `
  -e VUS=5000 `
  -e CAPACITY=100 `
  -e EXPECT_FULL=true `
  -e CHECK_ACTIVITY_LIST=false `
  -e REGISTER_AFTER_SECONDS=15 `
  k6 run activity-registration.js
```

Expected result:

- `register_success` should be `100`.
- `register_rejected_full_or_duplicate` should be `4900`.
- `unexpected_failure_rate` should be `0%`.
- `http_req_failed` will be high because k6 counts expected business-rule `400` responses as failed HTTP requests. For this case, use `unexpected_failure_rate` as the main pass/fail metric.

Run against an existing activity:

```powershell
docker compose --profile load-test run --rm `
  -e ACTIVITY_ID=YOUR_ACTIVITY_ID `
  -e CREATE_ACTIVITY=false `
  -e VUS=500 `
  -e CAPACITY=500 `
  k6 run activity-registration.js
```

Useful environment variables:

| Variable | Meaning | Default |
| --- | --- | --- |
| `BASE_URL` | API Gateway URL | `http://api-gateway:8000` |
| `ACTIVITY_ID` | Existing activity id to test | empty |
| `CREATE_ACTIVITY` | Create a new activity in setup | `true` if `ACTIVITY_ID` is empty |
| `ADMIN_USERNAME` | Admin account used to create activity | `admin` |
| `ADMIN_PASSWORD` | Admin password | `Admin123!@` |
| `STUDENTS_FILE` | CSV account file loaded by k6 | `./students.csv` |
| `VUS` | Number of concurrent students | `500` |
| `CAPACITY` | Activity registration capacity | equal to `VUS` |
| `REGISTER_AFTER_SECONDS` | Delay before all VUs register together | `5` |
| `LOCAL_TIME_OFFSET_MINUTES` | Offset used to generate backend `LocalDateTime`; Vietnam is `420` | `420` |
| `EXPECT_FULL` | Treat full-capacity rejection as expected | `true` if `CAPACITY < VUS` |
| `CHECK_ACTIVITY_LIST` | Load activity list before detail | `true` |
| `SUMMARY_HTML` | Write `activity-registration-summary.html` | `true` |
