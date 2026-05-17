-- ============================================================
-- Flyway Migration V020
-- 创建培训课程表、培训考试表和培训成绩表
-- 源文件: app/sql/missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS training_courses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  course_name VARCHAR(128) DEFAULT NULL,
  course_type INT DEFAULT 1,
  duration INT DEFAULT 0,
  content TEXT DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='培训课程';

CREATE TABLE IF NOT EXISTS training_exams (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  exam_name VARCHAR(128) DEFAULT NULL,
  pass_score INT DEFAULT 60,
  duration INT DEFAULT 30,
  questions JSON DEFAULT NULL,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='培训考试';

CREATE TABLE IF NOT EXISTS training_scores (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  exam_id BIGINT DEFAULT NULL,
  user_id VARCHAR(64) DEFAULT NULL,
  score INT DEFAULT 0,
  status INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_exam_id (exam_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='培训成绩';
