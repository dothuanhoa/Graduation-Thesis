BEGIN;

INSERT INTO auth_users (
  id,
  username,
  email,
  password_hash,
  role,
  status,
  failed_attempts
)
SELECT
  910000000000000000 + gs,
  'K650' || lpad(gs::text, 4, '0'),
  lower('K650' || lpad(gs::text, 4, '0')) || '@student.edu.vn',
  '$2a$10$96VGPbartX7yr2Az6GhDrOUjV.yb5O4oEkgf/b9VrXdf8pU3p3QB2',
  'STUDENT',
  'ACTIVE',
  0
FROM generate_series(1, 5000) AS gs
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  failed_attempts = EXCLUDED.failed_attempts;

COMMIT;
