BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  900000000000000000 + gs,
  'K625' || lpad(gs::text, 4, '0'),
  lower('K625' || lpad(gs::text, 4, '0')) || '@student.edu.vn',
  crypt('123456', gen_salt('bf', 10)),
  'STUDENT',
  'ACTIVE',
  0
FROM generate_series(1, 500) AS gs
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  failed_attempts = EXCLUDED.failed_attempts;

COMMIT;