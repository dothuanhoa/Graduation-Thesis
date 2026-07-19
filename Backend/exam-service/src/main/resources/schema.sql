CREATE TABLE IF NOT EXISTS exam_targets (
    id BIGINT PRIMARY KEY,
    exam_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_group_code VARCHAR(20) NOT NULL DEFAULT '1',
    faculty_id VARCHAR(50),
    faculty_code VARCHAR(50),
    faculty_name VARCHAR(255),
    target_mode VARCHAR(20) NOT NULL DEFAULT 'CLASS',
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL
);
@@

ALTER TABLE exam_targets ADD COLUMN IF NOT EXISTS exam_id BIGINT;
@@
ALTER TABLE exam_targets ADD COLUMN IF NOT EXISTS student_group_code VARCHAR(20) DEFAULT '1';
@@
ALTER TABLE exam_targets ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(50);
@@
ALTER TABLE exam_targets ADD COLUMN IF NOT EXISTS faculty_code VARCHAR(50);
@@
ALTER TABLE exam_targets ADD COLUMN IF NOT EXISTS faculty_name VARCHAR(255);
@@
ALTER TABLE exam_targets ADD COLUMN IF NOT EXISTS target_mode VARCHAR(20) DEFAULT 'CLASS';
@@
ALTER TABLE exam_targets ADD COLUMN IF NOT EXISTS start_time TIMESTAMP;
@@
ALTER TABLE exam_targets ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;
@@

CREATE TABLE IF NOT EXISTS exam_target_classes (
    id BIGINT PRIMARY KEY,
    target_id BIGINT NOT NULL REFERENCES exam_targets(id) ON DELETE CASCADE,
    class_identifier VARCHAR(80) NOT NULL
);
@@

CREATE TABLE IF NOT EXISTS exam_target_students (
    id BIGINT PRIMARY KEY,
    target_id BIGINT NOT NULL REFERENCES exam_targets(id) ON DELETE CASCADE,
    student_identifier VARCHAR(80) NOT NULL
);
@@

CREATE INDEX IF NOT EXISTS idx_exam_target_exam ON exam_targets(exam_id);
@@
CREATE INDEX IF NOT EXISTS idx_exam_target_group ON exam_targets(student_group_code);
@@
CREATE INDEX IF NOT EXISTS idx_exam_target_mode ON exam_targets(target_mode);
@@
CREATE INDEX IF NOT EXISTS idx_exam_target_class_target ON exam_target_classes(target_id);
@@
CREATE INDEX IF NOT EXISTS idx_exam_target_class_identifier ON exam_target_classes(class_identifier);
@@
CREATE INDEX IF NOT EXISTS idx_exam_target_student_target ON exam_target_students(target_id);
@@
CREATE INDEX IF NOT EXISTS idx_exam_target_student_identifier ON exam_target_students(student_identifier);
@@
CREATE UNIQUE INDEX IF NOT EXISTS uk_exam_target_class ON exam_target_classes(target_id, class_identifier);
@@
CREATE UNIQUE INDEX IF NOT EXISTS uk_exam_target_student ON exam_target_students(target_id, student_identifier);
@@

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'exam_targets' AND column_name = 'class_ids'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'exam_targets' AND column_name = 'class_codes'
    ) THEN
        EXECUTE $sql$
            WITH raw_identifiers AS (
                SELECT
                    target.id AS target_id,
                    trim(identifier) AS class_identifier
                FROM exam_targets target
                CROSS JOIN LATERAL regexp_split_to_table(
                    COALESCE(NULLIF(trim(target.class_ids), ''), target.class_codes, ''),
                    ','
                ) AS identifier
            ),
            normalized AS (
                SELECT DISTINCT target_id, class_identifier
                FROM raw_identifiers
                WHERE class_identifier IS NOT NULL AND class_identifier <> ''
            ),
            numbered AS (
                SELECT
                    row_number() OVER (ORDER BY target_id, class_identifier) AS row_number,
                    target_id,
                    class_identifier
                FROM normalized
            )
            INSERT INTO exam_target_classes(id, target_id, class_identifier)
            SELECT
                (extract(epoch from clock_timestamp())::BIGINT * 1000000) + row_number,
                target_id,
                class_identifier
            FROM numbered
            ON CONFLICT (target_id, class_identifier) DO NOTHING
        $sql$;
    END IF;
END $$;
@@

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'exam_targets' AND column_name = 'student_ids'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'exam_targets' AND column_name = 'student_codes'
    ) THEN
        EXECUTE $sql$
            WITH raw_identifiers AS (
                SELECT
                    target.id AS target_id,
                    trim(identifier) AS student_identifier
                FROM exam_targets target
                CROSS JOIN LATERAL regexp_split_to_table(
                    COALESCE(NULLIF(trim(target.student_ids), ''), target.student_codes, ''),
                    ','
                ) AS identifier
            ),
            normalized AS (
                SELECT DISTINCT target_id, student_identifier
                FROM raw_identifiers
                WHERE student_identifier IS NOT NULL AND student_identifier <> ''
            ),
            numbered AS (
                SELECT
                    row_number() OVER (ORDER BY target_id, student_identifier) AS row_number,
                    target_id,
                    student_identifier
                FROM normalized
            )
            INSERT INTO exam_target_students(id, target_id, student_identifier)
            SELECT
                (extract(epoch from clock_timestamp())::BIGINT * 1000000) + row_number,
                target_id,
                student_identifier
            FROM numbered
            ON CONFLICT (target_id, student_identifier) DO NOTHING
        $sql$;
    END IF;
END $$;
@@

ALTER TABLE exam_targets DROP COLUMN IF EXISTS class_ids;
@@
ALTER TABLE exam_targets DROP COLUMN IF EXISTS class_codes;
@@
ALTER TABLE exam_targets DROP COLUMN IF EXISTS student_ids;
@@
ALTER TABLE exam_targets DROP COLUMN IF EXISTS student_codes;
@@
ALTER TABLE exam_targets DROP COLUMN IF EXISTS student_names;
@@

UPDATE exam_targets SET student_group_code = '1' WHERE student_group_code IS NULL OR trim(student_group_code) = '';
@@
UPDATE exam_targets SET target_mode = 'CLASS' WHERE target_mode IS NULL OR trim(target_mode) = '';
@@
