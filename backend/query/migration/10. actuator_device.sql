-- =============================================================================
-- Actuator Device 테이블 생성
-- 생성일: 2025-12-25
-- 설명: 액추에이터 장치 정보 (팬, 펌프, LED)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `actuator_device` (
    `actuator_id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '액추에이터 고유 식별자',
    `house_id` INT NOT NULL COMMENT '하우스 ID (FK)',
    `device_id` INT COMMENT '연결된 센서 ID (선택 사항)',
    `actuator_type` ENUM('fan', 'pump', 'led') NOT NULL COMMENT '액추에이터 타입',
    `name` VARCHAR(100) NOT NULL COMMENT '액추에이터 이름',
    `model` VARCHAR(100) COMMENT '모델명',
    `location` VARCHAR(255) COMMENT '설치 위치',
    `status` ENUM('online', 'offline', 'error') DEFAULT 'online' COMMENT '장치 상태',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',
    FOREIGN KEY (`house_id`) REFERENCES `house`(`house_id`) ON DELETE CASCADE,
    FOREIGN KEY (`device_id`) REFERENCES `sensor_device`(`device_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci 
COMMENT='액추에이터 장치 정보 테이블';
