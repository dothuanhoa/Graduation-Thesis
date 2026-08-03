BEGIN;

INSERT INTO faculties (id, faculty_code, faculty_name, status)
VALUES (910010000000000001, 'K650TEST', 'Khoa test tải đăng ký hoạt động', 'ACTIVE')
ON CONFLICT (faculty_code) DO UPDATE SET
  faculty_name = EXCLUDED.faculty_name,
  status = EXCLUDED.status;

INSERT INTO academic_years (id, year_name, start_year)
VALUES (910020000000000001, '2025-2029', 2025)
ON CONFLICT (id) DO UPDATE SET
  year_name = EXCLUDED.year_name,
  start_year = EXCLUDED.start_year;

INSERT INTO classes (id, class_code, status, academic_year_id, faculty_id)
SELECT
  910030000000000000 + gs,
  'K650_TEST_' || lpad(gs::text, 2, '0'),
  'ACTIVE',
  910020000000000001,
  910010000000000001
FROM generate_series(1, 50) AS gs
ON CONFLICT (class_code) DO UPDATE SET
  status = EXCLUDED.status,
  academic_year_id = EXCLUDED.academic_year_id,
  faculty_id = EXCLUDED.faculty_id;

INSERT INTO user_profiles (
  id,
  student_id,
  full_name,
  email,
  dob,
  gender,
  contact_phone,
  class_id,
  student_group_id,
  student_status
)
SELECT
  910040000000000000 + gs,
  'K650' || lpad(gs::text, 4, '0'),
  'Sinh viên test đăng ký hoạt động ' || lpad(gs::text, 4, '0'),
  lower('K650' || lpad(gs::text, 4, '0')) || '@student.edu.vn',
  date '2004-01-01' + ((gs - 1) % 28),
  CASE WHEN gs % 2 = 0 THEN 'FEMALE' ELSE 'MALE' END,
  '091' || lpad(gs::text, 7, '0'),
  910030000000000000 + (((gs - 1) / 100)::bigint + 1),
  1,
  'STUDYING'
FROM generate_series(1, 5000) AS gs
ON CONFLICT (student_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  dob = EXCLUDED.dob,
  gender = EXCLUDED.gender,
  contact_phone = EXCLUDED.contact_phone,
  class_id = EXCLUDED.class_id,
  student_group_id = EXCLUDED.student_group_id,
  student_status = EXCLUDED.student_status;

COMMIT;
