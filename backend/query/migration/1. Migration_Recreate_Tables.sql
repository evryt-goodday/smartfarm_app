-- =============================================================================
-- SmartFarm 테이블 마이그레이션 스크립트
-- 생성일: 2025-12-21
-- 설명: 기존 테이블 삭제 및 새로운 스키마로 재생성
-- =============================================================================

-- 외래키 체크 비활성화
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- 1. 기존 테이블 삭제 (의존성 역순)
-- =============================================================================

-- 센서 데이터 및 알림 테이블 삭제
DROP TABLE IF EXISTS `sensor_data`;
DROP TABLE IF EXISTS `alert`;
DROP TABLE IF EXISTS `threshold`;

-- 센서 장치 테이블 삭제
DROP TABLE IF EXISTS `sensor_device`;

-- 하우스 및 알림 설정 테이블 삭제
DROP TABLE IF EXISTS `notification_setting`;
DROP TABLE IF EXISTS `house`;

-- 기본 테이블 삭제
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS `sensor_type`;

-- =============================================================================
-- 2. 새로운 테이블 생성 (의존성 순서)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 센서 유형 테이블 생성
-- -----------------------------------------------------------------------------
CREATE TABLE `sensor_type` (
  `type_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '센서 유형 고유 식별자',
  `type_name` varchar(50) NOT NULL COMMENT '센서 유형 이름 (예: temperature, humidity)',
  `description` text DEFAULT NULL COMMENT '센서 유형 설명',
  `created_at` timestamp NULL DEFAULT current_timestamp() COMMENT '생성 시간',
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '수정 시간',
  `unit` varchar(50) NOT NULL COMMENT '센서 기호',
  PRIMARY KEY (`type_id`),
  UNIQUE KEY `type_name` (`type_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='센서 유형 정보를 저장하는 테이블';

-- -----------------------------------------------------------------------------
-- 2.2 사용자 테이블 생성
-- -----------------------------------------------------------------------------
CREATE TABLE `user` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '사용자 고유 식별자',
  `login_id` varchar(50) NOT NULL COMMENT '로그인 아이디',
  `password` varchar(255) NOT NULL COMMENT '암호화된 비밀번호',
  `name` varchar(100) NOT NULL COMMENT '사용자 이름',
  `email` varchar(100) DEFAULT NULL COMMENT '사용자 이메일 주소',
  `phone` varchar(20) DEFAULT NULL COMMENT '전화번호',
  `department` varchar(100) DEFAULT NULL COMMENT '부서명',
  `position` varchar(100) DEFAULT NULL COMMENT '직급명',
  `profile_image` varchar(255) DEFAULT NULL COMMENT '프로필 이미지 URL',
  `last_login` timestamp NULL DEFAULT NULL COMMENT '마지막 로그인 시간',
  `status` enum('active','inactive','suspended') DEFAULT 'active' COMMENT '사용자 계정 상태',
  `created_at` timestamp NULL DEFAULT current_timestamp() COMMENT '생성 시간',
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '수정 시간',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `login_id` (`login_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='사용자 정보를 저장하는 테이블';

-- -----------------------------------------------------------------------------
-- 2.3 하우스 테이블 생성
-- -----------------------------------------------------------------------------
CREATE TABLE `house` (
  `house_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '하우스 고유 식별자',
  `owner_id` int(11) NOT NULL COMMENT '소유자 ID (users 테이블의 외래키)',
  `location` varchar(255) NOT NULL COMMENT '하우스 위치',
  `name` varchar(100) NOT NULL COMMENT '하우스 이름',
  `created_at` timestamp NULL DEFAULT current_timestamp() COMMENT '생성 시간',
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '수정 시간',
  PRIMARY KEY (`house_id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `house_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='하우스 정보를 저장하는 테이블';

-- -----------------------------------------------------------------------------
-- 2.4 알림 설정 테이블 생성
-- -----------------------------------------------------------------------------
CREATE TABLE `notification_setting` (
  `setting_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '알림 설정 고유 식별자',
  `user_id` int(11) NOT NULL COMMENT '사용자 ID (외래키)',
  `email_notifications` tinyint(1) DEFAULT 1 COMMENT '이메일 알림 활성화 여부',
  `sms_notifications` tinyint(1) DEFAULT 0 COMMENT 'SMS 알림 활성화 여부',
  `push_notifications` tinyint(1) DEFAULT 1 COMMENT '브라우저 푸시 알림 활성화 여부',
  `alert_threshold` int(11) DEFAULT 3 COMMENT '시간당 최대 알림 수 제한',
  `security_level` enum('low','medium','high') DEFAULT 'medium' COMMENT '알림 보안 수준',
  PRIMARY KEY (`setting_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notification_setting_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='사용자의 알림 설정을 저장하는 테이블';

-- -----------------------------------------------------------------------------
-- 2.5 센서 장치 테이블 생성
-- -----------------------------------------------------------------------------
CREATE TABLE `sensor_device` (
  `device_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '센서 장치 고유 식별자',
  `house_id` int(11) NOT NULL COMMENT '하우스 ID (houses 테이블의 외래키)',
  `type_id` int(11) NOT NULL COMMENT '센서 유형 ID (sensor_types 테이블의 외래키)',
  `name` varchar(100) NOT NULL COMMENT '센서 이름',
  `model` varchar(100) DEFAULT NULL COMMENT '센서 모델명',
  `firmware_version` varchar(50) DEFAULT NULL COMMENT '펌웨어 버전',
  `location` varchar(255) DEFAULT NULL COMMENT '센서 설치 위치',
  `battery_status` varchar(50) DEFAULT NULL COMMENT '배터리 상태',
  `last_maintenance` date DEFAULT NULL COMMENT '마지막 유지보수 일자',
  `status` enum('online','offline','error') DEFAULT 'online' COMMENT '센서 상태',
  `created_at` timestamp NULL DEFAULT current_timestamp() COMMENT '생성 시간',
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '수정 시간',
  PRIMARY KEY (`device_id`),
  KEY `house_id` (`house_id`),
  KEY `type_id` (`type_id`),
  CONSTRAINT `sensor_device_ibfk_1` FOREIGN KEY (`house_id`) REFERENCES `house` (`house_id`),
  CONSTRAINT `sensor_device_ibfk_2` FOREIGN KEY (`type_id`) REFERENCES `sensor_type` (`type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='센서 장치 정보를 저장하는 테이블';

-- -----------------------------------------------------------------------------
-- 2.6 임계값 테이블 생성
-- -----------------------------------------------------------------------------
CREATE TABLE `threshold` (
  `threshold_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '임계값 고유 식별자',
  `device_id` int(11) NOT NULL COMMENT '센서 장치 ID (sensor_devices 테이블의 외래키)',
  `min_value` decimal(10,2) NOT NULL COMMENT '최소 임계값',
  `max_value` decimal(10,2) NOT NULL COMMENT '최대 임계값',
  `is_active` tinyint(1) DEFAULT 1 COMMENT '임계값 활성화 여부',
  `created_at` timestamp NULL DEFAULT current_timestamp() COMMENT '생성 시간',
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '수정 시간',
  PRIMARY KEY (`threshold_id`),
  KEY `device_id` (`device_id`),
  CONSTRAINT `threshold_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `sensor_device` (`device_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='센서 장치별 임계값을 저장하는 테이블';

-- -----------------------------------------------------------------------------
-- 2.7 알림 테이블 생성
-- -----------------------------------------------------------------------------
CREATE TABLE `alert` (
  `alert_id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '알림 고유 식별자',
  `device_id` int(11) NOT NULL COMMENT '센서 장치 ID (sensor_devices 테이블의 외래키)',
  `house_id` int(11) NOT NULL COMMENT '하우스 ID (houses 테이블의 외래키)',
  `alert_type` enum('warning','error','info') DEFAULT 'warning' COMMENT '알림 유형',
  `message` text NOT NULL COMMENT '알림 메시지 내용',
  `is_read` tinyint(1) DEFAULT 0 COMMENT '읽음 여부',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`alert_id`),
  KEY `device_id` (`device_id`),
  KEY `house_id` (`house_id`),
  CONSTRAINT `alert_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `sensor_device` (`device_id`),
  CONSTRAINT `alert_ibfk_2` FOREIGN KEY (`house_id`) REFERENCES `house` (`house_id`)
) ENGINE=InnoDB AUTO_INCREMENT=136 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='센서 이상 감지 및 알림을 저장하는 테이블';

-- -----------------------------------------------------------------------------
-- 2.8 센서 데이터 테이블 생성
-- -----------------------------------------------------------------------------
CREATE TABLE `sensor_data` (
  `data_id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '센서 데이터 고유 식별자',
  `device_id` int(11) NOT NULL COMMENT '센서 장치 ID (sensor_devices 테이블의 외래키)',
  `value` decimal(10,2) NOT NULL COMMENT '측정된 센서 값',
  `recorded_at` timestamp NULL DEFAULT current_timestamp() COMMENT '데이터 기록 시간',
  PRIMARY KEY (`data_id`),
  KEY `device_id` (`device_id`),
  CONSTRAINT `sensor_data_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `sensor_device` (`device_id`)
) ENGINE=InnoDB AUTO_INCREMENT=147211 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='센서 데이터를 저장하는 테이블';

-- 외래키 체크 활성화
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 마이그레이션 완료
-- =============================================================================
