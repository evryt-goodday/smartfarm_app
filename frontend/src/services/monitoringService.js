import store from '@/store'
import axios from '@/plugins/axios'
import toast from '@/utils/toast'

class MonitoringService {
  constructor() {
    // 로그 중복 방지를 위한 최근 로그 저장 객체
    this.recentLogs = {
      messages: new Set(),
      maxSize: 100,
      expirationMs: 60000, // 1분
    }

    // 세션 스토리지에서 이전 로그 메시지 복원
    this.loadLogsFromStorage()

    // 로그 정리를 위한 타이머 (메모리 관리)
    this.logCleanupTimer = setInterval(() => this.cleanupLogs(), 30000) // 30초마다 실행

    // 하우스 선택 상태 복원
    this.restoreHouseSelection()

    // 이미 알림이 발생한 센서 데이터를 추적하는 객체
    this.processedAlerts = {
      // key: `${deviceId}_${value}_${timestamp}`, value: true
    }

    // 알림 상태 초기화를 위한 타이머 (1시간마다 초기화)
    this.alertResetTimer = setInterval(() => this.resetProcessedAlerts(), 3600000)
  }

  /**
   * 세션 스토리지에서 로그 메시지 불러오기
   */
  loadLogsFromStorage() {
    try {
      const storedLogs = sessionStorage.getItem('monitoringServiceLogs')
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs)
        // 현재 시간과 비교하여 만료되지 않은 로그만 복원
        const now = Date.now()
        parsedLogs.forEach((item) => {
          if (now - item.timestamp < this.recentLogs.expirationMs) {
            this.recentLogs.messages.add(item.message)
          }
        })
      }
    } catch (e) {
      // 스토리지 접근 오류는 무시하고 새로 시작
    }
  }

  /**
   * 세션 스토리지에 로그 메시지 저장
   */
  saveLogsToStorage() {
    try {
      const logsToSave = Array.from(this.recentLogs.messages).map((message) => ({
        message,
        timestamp: Date.now(),
      }))
      sessionStorage.setItem('monitoringServiceLogs', JSON.stringify(logsToSave))
    } catch (e) {
      // 스토리지 접근 오류는 무시
    }
  }

  /**
   * 오래된 로그 메시지 정리
   */
  cleanupLogs() {
    const messagesArray = Array.from(this.recentLogs.messages)
    let changed = false

    messagesArray.forEach((message) => {
      if (Math.random() < 0.3) {
        // 임의로 30% 확률로 메시지 삭제 (데모용)
        this.recentLogs.messages.delete(message)
        changed = true
      }
    })

    if (changed) {
      this.saveLogsToStorage()
    }
  }

  /**
   * 알림 토스트 표시
   * @param {Object} alert - 알림 객체
   */
  showAlertNotification(alert) {
    if (!alert || !alert.message) return

    // 알림을 warning으로 표시
    toast.warning(alert.message, '경계값 알림')

    // 브라우저 알림 기능이 활성화되어 있으면 브라우저 알림도 표시
    this.showBrowserNotification(alert)
  }

  /**
   * 브라우저 알림 표시
   * @param {Object} alert - 알림 객체
   */
  showBrowserNotification(alert) {
    if (!alert || !alert.message) return

    // 브라우저 알림 설정 확인
    const browserNotificationsEnabled = store.state.user?.push_notifications === 1

    if (browserNotificationsEnabled && 'Notification' in window) {
      // 알림 권한 요청 및 알림 표시
      if (Notification.permission === 'granted') {
        new Notification('스마트팜 알림', {
          body: alert.message,
          icon: '/favicon.ico',
        })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('스마트팜 알림', {
              body: alert.message,
              icon: '/favicon.ico',
            })
          }
        })
      }
    }
  }

  /**
   * 하우스 선택 상태 복원
   */
  restoreHouseSelection() {
    try {
      const savedHouseId = localStorage.getItem('selectedHouseId')
      const savedHouseName = localStorage.getItem('selectedHouseName')

      if (savedHouseId && savedHouseName && store.state.house) {
        // 새로고침 후에도 선택된 하우스 정보 복원
        store.commit('house/setSelectedHouse', {
          house_id: savedHouseId,
          name: savedHouseName,
        })
      }
    } catch (e) {
      // 로컬 스토리지 오류는 무시
    }
  }

  /**
   * 하우스 선택 저장
   * @param {Object} house - 선택된 하우스 정보
   */
  saveHouseSelection(house) {
    if (house && house.house_id) {
      localStorage.setItem('selectedHouseId', house.house_id)
      localStorage.setItem('selectedHouseName', house.name || '')
    }
  }

  /**
   * 날짜 형식을 한국 시간대로 변환
   * @param {string|Date} date - 변환할 날짜
   * @returns {string} - 변환된 날짜 문자열
   */
  formatDate(date) {
    if (!date) return ''

    const d = new Date(date)

    // 유효한 날짜인지 확인
    if (isNaN(d.getTime())) return ''

    // 한국 시간대로 포맷팅
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d)
  }

  /**
   * 중복 로그 방지를 위한 로그 출력 메서드
   * @param {string} message - 로그 메시지
   * @param {string} type - 로그 타입 ('error', 'warn', 'log')
   * @returns {boolean} - 로그 출력 여부
   */
  uniqueLog(message, type = 'error') {
    // 이미 최근에 출력된 메시지인지 확인
    if (this.recentLogs.messages.has(message)) {
      return false
    }

    // 새 메시지 저장
    this.recentLogs.messages.add(message)

    // 스토리지에도 저장
    this.saveLogsToStorage()

    // 오래된 메시지 정리 (주기적으로 Set 크기 관리)
    if (this.recentLogs.messages.size > this.recentLogs.maxSize) {
      // 가장 오래된 것부터 일부를 제거
      this.cleanupLogs()
    }
    return true
  }

  /**
   * 센서 데이터 모니터링 및 임계값 체크
   * @param {string} deviceId - 센서 장치 ID
   * @param {Object} sensorData - 센서 데이터 객체
   * @param {boolean} force - 강제 알림 발생 여부 (테스트용)
   */
  monitorSensorData(deviceId, sensorData, force = false) {
    if (!deviceId || !sensorData) return

    // 임계값 확인을 위한 데이터 추출
    const value = parseFloat(sensorData.value)
    const minValue = parseFloat(sensorData.min_value)
    const maxValue = parseFloat(sensorData.max_value)

    // 값이 유효하지 않은 경우 처리하지 않음
    if (isNaN(value)) return

    // 알림 생성 여부 결정
    let alertType = null
    let alertMessage = null

    // 임계값 체크
    if (!isNaN(maxValue) && value > maxValue) {
      alertType = 'warning'
      alertMessage = `${sensorData.name || '센서'} 측정값(${value})이 최대 임계값(${maxValue})을 초과했습니다.`
    } else if (!isNaN(minValue) && value < minValue) {
      alertType = 'warning'
      alertMessage = `${sensorData.name || '센서'} 측정값(${value})이 최소 임계값(${minValue})보다 낮습니다.`
    }

    // 알림이 필요한 경우
    if ((alertType && alertMessage) || force) {
      if (force) {
        alertType = 'warning'
        alertMessage = `${sensorData.name || '센서'} 테스트 알림입니다.`
      }

      // 알림 객체 생성
      const alert = {
        device_id: deviceId,
        alert_type: alertType,
        message: alertMessage,
        name: sensorData.name || '센서 알림',
        timestamp: new Date().toISOString(),
      }

      // 이미 처리한 알림인지 확인 (테스트 알림은 항상 표시)
      const alertKey = `${deviceId}_${value}_${alert.timestamp.split('T')[0]}`
      if (force || !this.processedAlerts[alertKey]) {
        // 처리된 알림으로 표시
        this.processedAlerts[alertKey] = true

        // 알림 표시 (로컬 UI에만 표시)
        this.showAlertNotification(alert)

        // 로그 기록
        this.uniqueLog(`[알림 생성] ${alertMessage}`, 'warn')
      }
    }
  }

  /**
   * 리소스 정리 (메모리 누수 방지)
   */
  cleanup() {
    if (this.logCleanupTimer) {
      clearInterval(this.logCleanupTimer)
      this.logCleanupTimer = null
    }

    if (this.alertResetTimer) {
      clearInterval(this.alertResetTimer)
      this.alertResetTimer = null
    }
  }

  /**
   * 이미 처리된 알림 상태 초기화
   */
  resetProcessedAlerts() {
    this.processedAlerts = {}
    this.uniqueLog('알림 처리 상태가 초기화되었습니다.', 'log')
  }

  /**
   * 하우스 선택 시 센서 알림 초기화 및 설정
   * @param {Object} house - 선택된 하우스 정보
   */
  initHouseAlerts(house) {
    if (house && house.house_id) {
      // 하우스 선택 시 알림 상태 초기화
      this.resetProcessedAlerts()
      this.saveHouseSelection(house)
      this.uniqueLog(`하우스 '${house.name}' 선택됨, 알림 시스템 준비 완료`, 'log')
    }
  }
}

export default new MonitoringService()
