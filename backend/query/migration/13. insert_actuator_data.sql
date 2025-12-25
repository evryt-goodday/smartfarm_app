-- =============================================================================
-- Actuator 샘플 데이터 삽입
-- 생성일: 2025-12-25
-- 설명: house_id = 1에 대한 기본 액추에이터 3개 생성
-- =============================================================================

-- 1. 액추에이터 장치 추가
INSERT INTO `actuator_device` 
    (`house_id`, `device_id`, `actuator_type`, `name`, `model`, `location`, `status`) 
VALUES
    (1, 2, 'fan', '팬-101', 'DC-MOTOR-12V', 'A구역 천장', 'online'),
    (1, 3, 'pump', '워터펌프-201', 'WATER-PUMP-5V', 'B구역 하단', 'online'),
    (1, NULL, 'led', 'LED조명-301', 'NEOPIXEL-WS2812', 'C구역 상단', 'online');

-- 2. 액추에이터 초기 상태 설정 (모두 OFF, AUTO 모드)
INSERT INTO `actuator_status` 
    (`actuator_id`, `is_on`, `mode`, `brightness`) 
VALUES
    (1, FALSE, 'auto', 100),
    (2, FALSE, 'auto', 100),
    (3, FALSE, 'auto', 100);
