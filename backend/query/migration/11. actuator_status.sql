-- =============================================================================
-- Actuator Status 테이블 생성
-- 생성일: 2025-12-25
-- 설명: 액추에이터 현재 상태 (ON/OFF, 자동/수동)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `actuator_status` (
    `status_id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '상태 고유 식별자',
    `actuator_id` INT NOT NULL COMMENT '액추에이터 ID (FK)',
    `is_on` BOOLEAN DEFAULT FALSE COMMENT 'ON/OFF 상태',
    `mode` ENUM('auto', 'manual') DEFAULT 'auto' COMMENT '제어 모드',
    `brightness` INT DEFAULT 100 COMMENT 'LED 밝기 (0-100, LED 전용)',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '마지막 업데이트 시간',
    FOREIGN KEY (`actuator_id`) REFERENCES `actuator_device`(`actuator_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_actuator` (`actuator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci 
COMMENT='액추에이터 현재 상태 테이블';
