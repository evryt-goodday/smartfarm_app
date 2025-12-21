<template>
  <div class="setting-view">
    <header class="setting-header">
      <h1>환경설정</h1>
      <div class="setting-actions">
        <button class="action-btn" @click="saveSettings"><i class="icon-save"></i>설정 저장</button>
        <button class="action-btn" @click="resetSettings">
          <i class="icon-reset"></i>기본값으로 초기화
        </button>
        <button class="action-btn" @click="goBack"><i class="icon-back"></i>대시보드</button>
      </div>
    </header>

    <div class="settings-container">
      <!-- 탭 메뉴 -->
      <div class="settings-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon"></i>{{ tab.name }}
        </button>
      </div>

      <!-- 탭 컨텐츠 -->
      <div class="settings-content">
        <!-- 일반 설정 탭 -->
        <div v-if="activeTab === 'general'" class="tab-content">
          <h2>일반 설정</h2>

          <div class="settings-section">
            <h3>시스템 정보</h3>
            <div class="settings-grid">
              <div class="setting-item">
                <div class="setting-label">시스템 버전</div>
                <div class="setting-value">v{{ systemInfo.version }}</div>
              </div>
              <div class="setting-item">
                <div class="setting-label">마지막 업데이트</div>
                <div class="setting-value">{{ systemInfo.lastUpdate }}</div>
              </div>
              <div class="setting-item">
                <div class="setting-label">데이터베이스 상태</div>
                <div
                  class="setting-value"
                  :class="systemInfo.dbStatus === '정상' ? 'status-normal' : 'status-error'"
                >
                  {{ systemInfo.dbStatus }}
                </div>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h3>사용자 인터페이스</h3>
            <div class="settings-group">
              <div class="setting-control">
                <label class="control-label">테마 선택</label>
                <select v-model="settings.theme" class="control-input">
                  <option value="light">라이트 모드</option>
                  <option value="dark">다크 모드</option>
                  <option value="system">시스템 설정에 따름</option>
                </select>
              </div>
              <div class="setting-control">
                <label class="control-label">언어 설정</label>
                <select v-model="settings.language" class="control-input">
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div class="setting-control">
                <label class="control-label">데이터 갱신 주기</label>
                <select v-model="settings.refreshInterval" class="control-input">
                  <option value="30">30초</option>
                  <option value="60">1분</option>
                  <option value="300">5분</option>
                  <option value="600">10분</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- 알림 설정 탭 -->
        <div v-if="activeTab === 'notifications'" class="tab-content">
          <h2>알림 설정</h2>

          <div class="settings-section">
            <h3>푸시 알림</h3>
            <div class="settings-group">
              <div class="setting-switch">
                <div class="switch-label">
                  <span>푸시 알림 사용</span>
                  <span class="switch-description">중요 이벤트 발생 시 브라우저 알림 표시</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="settings.notifications.push" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="setting-switch">
                <div class="switch-label">
                  <span>소리 알림</span>
                  <span class="switch-description">알림 발생 시 소리 재생</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="settings.notifications.sound" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h3>알림 유형</h3>
            <div class="settings-group">
              <div
                class="setting-switch"
                v-for="(value, key) in settings.notificationTypes"
                :key="key"
              >
                <div class="switch-label">
                  <span>{{ getNotificationTypeName(key) }}</span>
                  <span class="switch-description">{{ getNotificationTypeDescription(key) }}</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="settings.notificationTypes[key]" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 센서 설정 탭 -->
        <div v-if="activeTab === 'sensors'" class="tab-content">
          <h2>센서 설정</h2>

          <div class="settings-section">
            <h3>데이터 수집</h3>
            <div class="settings-group">
              <div class="setting-control">
                <label class="control-label">데이터 저장 기간</label>
                <select v-model="settings.sensorData.retentionPeriod" class="control-input">
                  <option value="30">30일</option>
                  <option value="60">60일</option>
                  <option value="90">90일</option>
                  <option value="180">6개월</option>
                  <option value="365">1년</option>
                </select>
              </div>
              <div class="setting-control">
                <label class="control-label">샘플링 빈도</label>
                <select v-model="settings.sensorData.samplingRate" class="control-input">
                  <option value="1">1분</option>
                  <option value="5">5분</option>
                  <option value="15">15분</option>
                  <option value="30">30분</option>
                  <option value="60">1시간</option>
                </select>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h3>임계값 설정</h3>
            <div class="threshold-list">
              <div class="threshold-item" v-for="(sensor, index) in sensorConfigs" :key="index">
                <div class="threshold-header">
                  <span class="sensor-name">{{ sensor.name }}</span>
                  <span class="sensor-type">{{ sensor.type }}</span>
                </div>
                <div class="threshold-controls">
                  <div class="threshold-control">
                    <label>최소값</label>
                    <input type="number" v-model="sensor.minValue" :step="sensor.step" />
                    <span class="unit">{{ sensor.unit }}</span>
                  </div>
                  <div class="threshold-control">
                    <label>최대값</label>
                    <input type="number" v-model="sensor.maxValue" :step="sensor.step" />
                    <span class="unit">{{ sensor.unit }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 시스템 탭 -->
        <div v-if="activeTab === 'system'" class="tab-content">
          <h2>시스템 설정</h2>

          <div class="settings-section">
            <h3>백업 및 복원</h3>
            <div class="action-buttons">
              <button class="action-btn" @click="backupSystem">
                <i class="icon-backup"></i> 시스템 백업
              </button>
              <button class="action-btn" @click="restoreSystem">
                <i class="icon-restore"></i> 백업에서 복원
              </button>
            </div>
          </div>

          <div class="settings-section danger-zone">
            <h3>위험 지역</h3>
            <div class="settings-group">
              <div class="danger-action">
                <div class="danger-details">
                  <div class="danger-title">모든 데이터 초기화</div>
                  <div class="danger-description">
                    모든 센서 데이터와 설정을 초기화합니다. 이 작업은 취소할 수 없습니다.
                  </div>
                </div>
                <button class="danger-btn" @click="resetData">데이터 초기화</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import toast from '@/utils/toast'

const router = useRouter()

// 활성화된 탭
const activeTab = ref('general')

// 탭 메뉴 정의
const tabs = [
  { id: 'general', name: '일반 설정', icon: 'icon-general' },
  { id: 'notifications', name: '알림', icon: 'icon-notification' },
  { id: 'sensors', name: '센서', icon: 'icon-sensor' },
  { id: 'system', name: '시스템', icon: 'icon-system' },
]

// 시스템 정보 객체
const systemInfo = reactive({
  version: '1.0.2',
  lastUpdate: '2025년 4월 20일',
  dbStatus: '정상',
})

// 설정 값 객체
const settings = reactive({
  theme: 'light',
  language: 'ko',
  refreshInterval: '60',
  notifications: {
    push: true,
    sound: false,
  },
  notificationTypes: {
    error: true,
    warning: true,
    info: false,
  },
  sensorData: {
    retentionPeriod: '90',
    samplingRate: '5',
  },
})

// 센서 설정 목록
const sensorConfigs = reactive([
  { name: '온도 센서', type: '온도', minValue: 15, maxValue: 30, step: 0.1, unit: '°C' },
  { name: '습도 센서', type: '습도', minValue: 40, maxValue: 80, step: 1, unit: '%' },
  { name: '토양 수분', type: '수분', minValue: 20, maxValue: 65, step: 1, unit: '%' },
  { name: '조도 센서', type: '조도', minValue: 200, maxValue: 850, step: 10, unit: 'lux' },
  { name: 'CO2 센서', type: '농도', minValue: 350, maxValue: 1000, step: 10, unit: 'ppm' },
])

// 알림 유형 이름 매핑
const getNotificationTypeName = (type) => {
  const names = {
    error: '오류 알림',
    warning: '경고 알림',
    info: '정보 알림',
  }
  return names[type] || type
}

// 알림 유형 설명 매핑
const getNotificationTypeDescription = (type) => {
  const descriptions = {
    error: '시스템 오류 및 긴급 상황 알림',
    warning: '주의가 필요한 상황 알림',
    info: '일반 정보 및 상태 업데이트',
  }
  return descriptions[type] || ''
}

// 설정 저장
const saveSettings = () => {
  // 실제로는 API 호출 등을 통해 서버에 저장할 수 있음
  localStorage.setItem('smartfarm-settings', JSON.stringify(settings))
  toast.success('설정이 저장되었습니다.')
}

// 설정 초기화
const resetSettings = () => {
  const defaultSettings = {
    theme: 'light',
    language: 'ko',
    refreshInterval: '60',
    notifications: {
      push: true,
      sound: false,
    },
    notificationTypes: {
      error: true,
      warning: true,
      info: false,
    },
    sensorData: {
      retentionPeriod: '90',
      samplingRate: '5',
    },
  }

  Object.assign(settings, defaultSettings)
  toast.warning('설정이 기본값으로 초기화되었습니다.')
}

// 뒤로 가기
const goBack = () => {
  router.push('/')
}

// 시스템 백업
const backupSystem = () => {
  // 실제로는 백업 파일 다운로드 등을 구현
  toast.success('시스템 백업이 완료되었습니다.')
}

// 시스템 복원
const restoreSystem = () => {
  // 실제로는 백업 파일 업로드 및 복원 과정 구현
  toast.info('복원 기능은 준비 중입니다.')
}

// 데이터 초기화
const resetData = () => {
  if (confirm('정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
    // 실제로는 데이터 초기화 API 호출
    toast.success('데이터가 초기화되었습니다.')
  }
}

// 컴포넌트 마운트 시 로컬 스토리지에서 설정 불러오기
onMounted(() => {
  const savedSettings = localStorage.getItem('smartfarm-settings')
  if (savedSettings) {
    try {
      const parsedSettings = JSON.parse(savedSettings)
      // 깊은 병합을 위한 재귀 함수를 구현할 수도 있지만,
      // 간단한 방법으로 최상위 속성만 병합
      Object.keys(parsedSettings).forEach((key) => {
        if (settings[key] && typeof settings[key] === 'object') {
          Object.assign(settings[key], parsedSettings[key])
        } else {
          settings[key] = parsedSettings[key]
        }
      })
    } catch (error) {
      console.error('설정 로딩 중 오류:', error)
    }
  }
})
</script>

<style lang="scss" scoped>
.setting-view {
  padding: 20px;
  background-color: var(--body-bg-color);
  min-height: calc(100vh - var(--header-height));
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background-color: var(--item-bg-white);
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);

  h1 {
    font-size: 1.5em;
    color: #2c3e50;
    font-weight: bold;
  }

  .setting-actions {
    display: flex;
    gap: 15px;
  }

  .action-btn {
    background-color: var(--item-bg-white);
    border: 1px solid #ddd;
    padding: 8px 15px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95em;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--item-bg-lighter);
      transform: translateY(-2px);
    }

    i {
      font-size: 1.1em;
    }
  }
}

.settings-container {
  background-color: var(--item-bg-white);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.settings-tabs {
  display: flex;
  background-color: var(--item-bg-lighter);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  overflow-x: auto;

  .tab-btn {
    padding: 15px 20px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.95em;
    color: #7f8c8d;
    transition: all 0.2s;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 8px;

    &:hover {
      color: var(--item-blue-color);
    }

    &.active {
      color: var(--item-blue-color);
      border-bottom: 2px solid var(--item-blue-color);
      background-color: rgba(52, 152, 219, 0.05);
      font-weight: bold;
    }

    i {
      font-size: 1.1em;
    }
  }
}

.settings-content {
  padding: 25px;

  .tab-content h2 {
    font-size: 1.3em;
    color: #2c3e50;
    margin-bottom: 25px;
    font-weight: bold;
    padding-bottom: 15px;
    border-bottom: 2px solid var(--item-bg-lighter);
  }
}

.settings-section {
  margin-bottom: 30px;
  background-color: var(--item-bg-lighter);
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  h3 {
    font-size: 1.1em;
    color: #2c3e50;
    margin-bottom: 20px;
    font-weight: 600;
  }

  &.danger-zone {
    background-color: #fee2e2;

    h3 {
      color: #b91c1c;
    }
  }
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;

  .setting-item {
    .setting-label {
      font-size: 0.9em;
      color: #7f8c8d;
      margin-bottom: 8px;
    }

    .setting-value {
      font-size: 1em;
      color: #2c3e50;
      font-weight: 500;
      padding: 10px 15px;
      background-color: var(--item-bg-white);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

      &.status-normal {
        color: var(--item-green-color);
      }

      &.status-error {
        color: var(--item-red-color);
      }
    }
  }
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-control {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .control-label {
    font-size: 0.95em;
    color: #7f8c8d;
    font-weight: 500;
  }

  .control-input {
    padding: 10px 15px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    background-color: var(--item-bg-white);
    font-size: 0.95em;
    color: #2c3e50;
    width: 100%;
    max-width: 300px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: var(--item-blue-color);
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }
  }
}

.setting-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: var(--item-bg-white);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .switch-label {
    display: flex;
    flex-direction: column;
    gap: 5px;

    span {
      &:first-child {
        font-size: 0.95em;
        color: #2c3e50;
        font-weight: 500;
      }

      &.switch-description {
        font-size: 0.85em;
        color: #7f8c8d;
      }
    }
  }
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 30px;

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .slider {
      background-color: var(--item-green-color);

      &:before {
        transform: translateX(30px);
      }
    }
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 34px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);

    &:before {
      position: absolute;
      content: '';
      height: 22px;
      width: 22px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }
}

.threshold-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.threshold-item {
  background-color: var(--item-bg-white);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  }

  .threshold-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);

    .sensor-name {
      font-weight: 500;
      color: #2c3e50;
    }

    .sensor-type {
      font-size: 0.9em;
      color: #7f8c8d;
      background-color: var(--item-bg-lighter);
      padding: 5px 10px;
      border-radius: 20px;
    }
  }

  .threshold-controls {
    display: flex;
    gap: 20px;

    .threshold-control {
      display: flex;
      align-items: center;
      gap: 8px;

      label {
        font-size: 0.9em;
        color: #7f8c8d;
        width: 50px;
      }

      input {
        width: 80px;
        padding: 8px 12px;
        border: 1px solid rgba(0, 0, 0, 0.05);
        border-radius: 6px;
        text-align: right;
        background-color: var(--item-bg-lighter);
        transition: all 0.2s ease;

        &:focus {
          outline: none;
          border-color: var(--item-blue-color);
          background-color: var(--item-bg-white);
        }
      }

      .unit {
        font-size: 0.9em;
        color: #7f8c8d;
      }
    }
  }
}

.action-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.danger-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px;
  padding: 20px;
  background-color: rgba(220, 38, 38, 0.1);

  .danger-details {
    .danger-title {
      font-weight: 600;
      color: #b91c1c;
      margin-bottom: 8px;
    }

    .danger-description {
      font-size: 0.9em;
      color: #64748b;
      max-width: 400px;
    }
  }

  .danger-btn {
    background-color: var(--item-red-color);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95em;
    transition: all 0.2s ease;

    &:hover {
      background-color: #b91c1c;
      transform: translateY(-2px);
    }
  }
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .threshold-controls {
    flex-direction: column;
  }

  .setting-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;

    .setting-actions {
      align-self: stretch;
      justify-content: space-between;
    }
  }
}
</style>
