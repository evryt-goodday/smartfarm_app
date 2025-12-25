-- =============================================================================
-- Control Command 테이블 생성
-- 생성일: 2025-12-25
-- 설명: 액추에이터 제어 명령 이력 및 상태 관리
-- =============================================================================

CREATE TABLE IF NOT EXISTS `control_command` (
    `command_id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '명령 고유 식별자',
    `actuator_id` INT NOT NULL COMMENT '액추에이터 ID (FK)',
    `command` ENUM('on', 'off', 'auto', 'manual') NOT NULL COMMENT '제어 명령',
    `requested_by` INT COMMENT '명령 요청 사용자 ID (FK)',
    `status` ENUM('pending', 'executing', 'executed', 'failed') DEFAULT 'pending' COMMENT '명령 실행 상태',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '명령 생성 시간',
    `executed_at` TIMESTAMP NULL COMMENT '명령 실행 시간',
    `error_message` TEXT COMMENT '실패 시 에러 메시지',
    FOREIGN KEY (`actuator_id`) REFERENCES `actuator_device`(`actuator_id`) ON DELETE CASCADE,
    FOREIGN KEY (`requested_by`) REFERENCES `user`(`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci 
COMMENT='액추에이터 제어 명령 이력 테이블';
