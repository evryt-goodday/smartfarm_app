-- ==========================================
-- Arduino 제어 명령 테스트 쿼리
-- ==========================================
-- 이 파일은 Arduino를 수동으로 제어하기 위한 테스트 쿼리입니다.
-- Arduino가 5초마다 polling하여 pending 상태의 명령을 가져가 실행합니다.
--
-- 사용 방법:
-- 1. 먼저 MANUAL 모드로 전환
-- 2. 원하는 액추에이터 제어 명령 실행
-- 3. 5초 이내에 Arduino가 자동으로 실행
-- ==========================================

-- ==========================================
-- 1. 모드 전환
-- ==========================================

-- MANUAL 모드로 전환 (웹 제어 활성화)
INSERT INTO control_command (actuator_id, command, requested_by, status)
VALUES (1, 'manual', 1, 'pending');

-- AUTO 모드로 전환 (센서 자동 제어)
INSERT INTO control_command (actuator_id, command, requested_by, status)
VALUES (1, 'auto', 1, 'pending');

-- ==========================================
-- 2. 팬 제어 (actuator_id = 1)
-- ==========================================

-- 팬 켜기
INSERT INTO control_command (actuator_id, command, requested_by, status)
VALUES (1, 'on', 1, 'pending');

-- 팬 끄기
INSERT INTO control_command (actuator_id, command, requested_by, status)
VALUES (1, 'off', 1, 'pending');

-- ==========================================
-- 3. 펌프 제어 (actuator_id = 2)
-- ==========================================

-- 펌프 켜기
INSERT INTO control_command (actuator_id, command, requested_by, status)
VALUES (2, 'on', 1, 'pending');

-- 펌프 끄기
INSERT INTO control_command (actuator_id, command, requested_by, status)
VALUES (2, 'off', 1, 'pending');

-- ==========================================
-- 4. LED 제어 (actuator_id = 3)
-- ==========================================

-- LED 켜기
INSERT INTO control_command (actuator_id, command, requested_by, status)
VALUES (3, 'on', 1, 'pending');

-- LED 끄기
INSERT INTO control_command (actuator_id, command, requested_by, status)
VALUES (3, 'off', 1, 'pending');

-- ==========================================
-- 5. 명령 실행 확인
-- ==========================================

-- 최근 명령 조회
SELECT command_id, actuator_id, command, status, created_at, executed_at
FROM control_command
ORDER BY command_id DESC
LIMIT 10;

-- pending 상태 명령 조회
SELECT command_id, actuator_id, command, status, created_at
FROM control_command
WHERE status = 'pending'
ORDER BY command_id DESC;

-- 실행된 명령 조회
SELECT command_id, actuator_id, command, status, created_at, executed_at,
       TIMESTAMPDIFF(SECOND, created_at, executed_at) AS execution_time_sec
FROM control_command
WHERE status = 'executed'
ORDER BY command_id DESC
LIMIT 10;
