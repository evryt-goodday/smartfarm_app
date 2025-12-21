<script setup>
import { useStore } from 'vuex'

import EastTopIcon from '@/assets/icons/common/east-top.svg'
import ArrowBackIcon from '@/assets/icons/home/arrow_back.svg'
import ArrowForwardIcon from '@/assets/icons/home/arrow_forward.svg'
import VideoIcon from '@/assets/icons/home/video.svg'
import CaptureIcon from '@/assets/icons/home/capture.svg'
import CheckCircleIcon from '@/assets/icons/home/check_circle.svg'
import CircleIcon from '@/assets/icons/home/circle.svg'
import CameraImage from '@/assets/images/camera.png'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { SENSOR_TYPES, SENSOR_TYPE_MAPPING } from '@/constants/sensors'

const store = useStore()
const sensorList = computed(() => store.state.sensor.sensorList)
const sensorRealtime = computed(() => store.state.sensor.sensorRealtime)
const sensorCount = computed(() => Object.keys(sensorList.value).length)
const isLoading = ref(true)
const isLoadingData = ref(false)
const hasApiError = ref(false)
const errorMessage = ref('')
let timer = null

const selectedHouse = computed(() => store.state.house.selectedHouse)
const isHouseSelected = computed(() => selectedHouse.value && selectedHouse.value !== '')
const isNoSensorData = computed(
  () => isHouseSelected.value && (sensorCount.value === 0 || hasApiError.value) && !isLoading.value,
)

watch(selectedHouse, async (newValue) => {
  if (newValue) {
    isLoading.value = true
    hasApiError.value = false
    errorMessage.value = ''

    // 타이머 정지 및 초기화
    if (timer) {
      clearInterval(timer)
      timer = null
    }

    try {
      await store.dispatch('sensor/fetchSensorList')
      if (!timer) {
        startRealTimeUpdates()
      }
    } catch (error) {
      console.error('센서 데이터 로드 실패:', error)

      // 에러 정보 기록
      hasApiError.value = true
      errorMessage.value = error.response?.data?.message || '센서 데이터를 불러올 수 없습니다.'

      // 센서 목록 초기화 - 서버에서 데이터를 가져오지 못했으므로
      store.commit('sensor/SET_SENSOR_LIST', {})
    } finally {
      isLoading.value = false
    }
  }
})

const startRealTimeUpdates = () => {
  // 기존 타이머가 있으면 제거
  if (timer) clearInterval(timer)

  timer = setInterval(async () => {
    if (!isHouseSelected.value) return

    try {
      isLoadingData.value = true
      await store.dispatch('sensor/fetchSensorList')
      // 성공 시 에러 상태 초기화
      hasApiError.value = false
      errorMessage.value = ''
    } catch (error) {
      console.error('센서 데이터 업데이트 실패:', error)
      hasApiError.value = true
      errorMessage.value = error.response?.data?.message || '센서 데이터를 불러올 수 없습니다.'

      // 실시간 업데이트 중 오류 발생 시 타이머 정지
      clearInterval(timer)
      timer = null
    } finally {
      isLoadingData.value = false
    }
  }, 1000 * 60) // 1분마다 업데이트
}

onMounted(async () => {
  try {
    isLoading.value = true
    hasApiError.value = false

    if (isHouseSelected.value) {
      await store.dispatch('sensor/fetchSensorList')
      startRealTimeUpdates()
    }
  } catch (error) {
    console.error('센서 목록 로딩 실패:', error)
    hasApiError.value = true
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const getSensorInfo = (type) => {
  const mappedType = SENSOR_TYPE_MAPPING[type?.toLowerCase()]
  return SENSOR_TYPES[mappedType] || {}
}
</script>

<template>
  <!-- 하우스 선택 요청 메시지 -->
  <div v-if="!isHouseSelected" class="house-selection-message">
    <div class="message-container">
      <div class="message-icon">🏠</div>
      <h2>하우스를 선택해주세요</h2>
      <p>상단 메뉴에서 하우스를 선택하면 센서 데이터를 확인할 수 있습니다.</p>
    </div>
  </div>

  <!-- 센서 데이터 없음 메시지 -->
  <div v-else-if="isNoSensorData" class="house-selection-message">
    <div class="message-container">
      <div class="message-icon">⚠️</div>
      <h2>센서 데이터가 없습니다</h2>
      <p>선택하신 하우스({{ selectedHouse.name }})에 등록된 센서가 없습니다.</p>
      <p v-if="hasApiError" class="error-message">
        {{ errorMessage || '센서 데이터를 불러오는 중 오류가 발생했습니다.' }}
      </p>
      <p>다른 하우스를 선택하거나, 관리자에게 센서 등록을 요청해주세요.</p>
    </div>
  </div>

  <!-- 로딩 화면 -->
  <div v-else-if="isLoading" class="loading-container">
    <div class="loading-spinner"></div>
    <div class="loading-text">데이터 불러오는 중...</div>
  </div>

  <div v-else class="layout-dashboard">
    <!-- 지도 섹션 -->
    <section class="section-map">
      <div class="section-map__view"></div>
      <ul class="section-map__indicators">
        <li v-for="sensor in sensorList" :key="sensor.device_id" class="indicator-item">
          <div class="sensor-card">
            <div class="sensor-card__header">
              <div class="sensor-card__title">
                <div class="sensor-card__icon">
                  <img
                    :src="getSensorInfo(sensor.sensor_type).icon"
                    width="24"
                    height="24"
                    :alt="sensor.sensor_type"
                  />
                </div>
                <div class="sensor-card__label">{{ sensor.description }}</div>
              </div>
            </div>
            <div>
              <div class="sensor-card__value">
                {{ sensorRealtime[sensor.device_id]?.value || '-' }}
                <span>{{ getSensorInfo(sensor.sensor_type).unit }}</span>
              </div>
              <div class="sensor-card__description">
                {{ sensor.description }}
              </div>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- 센서 섹션 -->
    <section class="section-sensor">
      <div class="section-content">
        <!-- 센서 총 개수 카드 -->
        <div class="device-card">
          <div class="device-card__header">
            <div class="device-card__title">Device</div>
            <RouterLink to="/chart" class="device-card__link">
              <img :src="EastTopIcon" width="24" height="24" alt="east" />
            </RouterLink>
          </div>
          <div class="device-card__content">
            <div class="device-card__item">
              <span class="device-card__label">Sensor</span>
              <span class="device-card__value">{{ sensorCount }}</span>
            </div>
            <div class="device-card__item">
              <span class="device-card__label">Camera</span>
              <span class="device-card__value">5</span>
            </div>
          </div>
        </div>

        <!-- 센서 목록 -->
        <div class="content-body">
          <div
            v-for="sensor in sensorList"
            :key="sensor.device_id"
            :value="sensor.device_id"
            :class="[
              'sensor-card',
              sensor.last_alert_type === 'warning'
                ? 'sensor-card--warning'
                : sensor.last_alert_type === 'error'
                  ? 'sensor-card--error'
                  : 'sensor-card--normal',
            ]"
          >
            <div class="sensor-card__header">
              <span
                class="sensor-card__status-indicator"
                :class="{
                  'sensor-card__status-indicator--orange': sensor.last_alert_type === 'warning',
                  'sensor-card__status-indicator--yellow': sensor.last_alert_type === 'error',
                  'sensor-card__status-indicator--green':
                    sensor.last_alert_type === 'info' || !sensor.last_alert_type,
                }"
              ></span>
              <div class="sensor-card__title">{{ sensor.name }}</div>
            </div>
            <div class="sensor-card__meta">
              <span>{{ sensor.model }}</span> &middot; <span>{{ sensor.description }} 센서</span>
            </div>
            <div
              v-if="sensor.last_alert_type"
              :class="['sensor-card__alert', `sensor-card__alert--${sensor.last_alert_type}`]"
            >
              {{ sensor.last_alert_message }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 모니터링 섹션 -->
    <section class="section-monitor">
      <div class="section-content">
        <!-- 카메라 섹션 -->
        <div class="monitor-camera">
          <div class="monitor-camera__header">
            <div class="monitor-camera__title">
              <span>Camera 1</span>
            </div>
            <div class="monitor-camera__link">
              <img :src="EastTopIcon" width="24" height="24" alt="east" />
            </div>
          </div>
          <div class="monitor-camera__image">
            <img :src="CameraImage" alt="Camera View" />
          </div>
          <div class="monitor-camera__actions">
            <button class="action-button">
              <img :src="ArrowBackIcon" width="24" height="24" alt="arrow_back" />
            </button>
            <button class="action-button">
              <img :src="CaptureIcon" width="24" height="24" alt="capture" />
            </button>
            <button class="action-button">
              <img :src="VideoIcon" width="24" height="24" alt="video" />
            </button>
            <button class="action-button">
              <img :src="ArrowForwardIcon" width="24" height="24" alt="arrow_forward" />
            </button>
          </div>
        </div>

        <!-- 작업 섹션 -->
        <div class="monitor-tasks">
          <div class="monitor-tasks__header">
            <div class="monitor-tasks__title">
              <span>Task</span>
            </div>
            <div class="monitor-tasks__progress">
              <span>40%</span>
              <span>2/5 Task Completed</span>
            </div>
          </div>
          <div class="monitor-tasks__list">
            <!-- 작업 항목 -->
            <div class="task-item task-item--completed">
              <div class="task-item__header">
                <span class="task-item__title">자동 관수 작업</span>
                <span class="task-item__status"
                  ><img :src="CheckCircleIcon" width="24" height="24" alt="arrow_forward"
                /></span>
              </div>
              <div class="task-item__body">
                <span class="task-item__description">
                  토양 수분 센서 기반 스마트 관수 시스템 가동
                </span>
                <span class="task-item__time">06:30 AM - 07:00 AM</span>
              </div>
            </div>

            <div class="task-item task-item--pending">
              <div class="task-item__header">
                <span class="task-item__title">환경 제어</span>
                <span class="task-item__status"
                  ><img :src="CircleIcon" width="24" height="24" alt="arrow_forward"
                /></span>
              </div>
              <div class="task-item__body">
                <span class="task-item__description">
                  온실 내부 온도 및 습도 최적화를 위한 환기 시스템 작동
                </span>
                <span class="task-item__time">10:00 AM - 10:30 AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
// 하우스 선택 메시지 스타일
.house-selection-message {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: calc(100vh - var(--header-height) - 11px);
  background-color: var(--body-bg-color);
}

.message-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background-color: var(--item-bg-white);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;

  .error-message {
    font-size: 14px;
    color: var(--item-red-color);
    margin-top: 6px;
    margin-bottom: 12px;
    max-width: 400px;
    font-weight: 500;
    padding: 8px;
    background-color: #fae5e5;
    border-radius: 4px;
  }
}

.message-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.message-container h2 {
  font-size: 24px;
  color: #1e293b;
  margin-bottom: 16px;
}

.message-container p {
  font-size: 14px;
  color: #64748b;
  max-width: 400px;
}

// 로딩 화면 스타일
.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: calc(100vh - var(--header-height) - 11px);
  background-color: var(--body-bg-color);
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--item-blue-color);
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 20px;
}

.loading-text {
  color: #1e293b;
  font-size: 1.2rem;
  font-weight: 500;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.layout-dashboard {
  display: flex;
  height: calc(100vh - var(--header-height) - 11px); // 임시 방편 11px
  overflow: hidden;
  background-color: var(--body-bg-color);

  .section-map,
  .section-sensor,
  .section-monitor {
    flex: 1;
    margin: 5px 5px 0 5px;
    border-radius: var(--default-border-radius);
  }

  .section-map {
    margin-left: 10px;
    &__view {
      width: 850px;
      height: 370px;
      margin-bottom: 10px;
      border-radius: var(--default-border-radius);
      background: url('@/assets/images/map2.png') no-repeat center center;
      background-color: var(--item-bg-lighter);
    }

    &__indicators {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;

      .indicator-item {
        height: 220px;
        border-radius: var(--default-border-radius);

        .sensor-card {
          width: 100%;
          height: 100%;
          padding: 15px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          border-radius: var(--default-border-radius);
          background-color: var(--item-bg-white);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

          &__header {
            display: flex;
            justify-content: space-between;
          }

          &__title {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          &__icon {
            display: flex;
            align-items: center;
            justify-content: center;

            img {
              width: 24px;
              height: 24px;
            }
          }

          &__label {
            font-weight: 600;
            font-size: 1.1em;
            color: #1e293b;
          }

          &__link {
            width: 32px;
            height: 32px;
            background-color: var(--item-bg-lighter);
            border-radius: var(--default-border-radius);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
              background-color: #e2e8f0;
            }
          }

          &__value {
            font-size: 2.8em;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 10px;

            & > span {
              color: #64748b;
              font-weight: normal;
              font-size: 0.9em;
            }
          }

          &__description {
            font-size: 0.85em;
            color: #64748b;
            line-height: 1.4;
          }
        }
      }
    }
  }

  .section-sensor {
    background-color: var(--home-bg-color);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    .section-content {
      display: flex;
      flex-direction: column;
      height: calc(100% - 30px);
      gap: 15px;
      padding: 15px;

      .device-card {
        border-radius: var(--default-border-radius);
        display: flex;
        flex-direction: column;
        gap: 15px;
        background-color: var(--item-bg-white);
        padding: 15px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

        &__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        &__title {
          font-size: 1.1em;
          font-weight: bold;
          color: #1e293b;
        }

        &__link {
          width: 32px;
          height: 32px;
          background-color: var(--item-bg-lighter);
          border-radius: var(--default-border-radius);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background-color: #e2e8f0;
          }
        }

        &__content {
          display: flex;
          justify-content: space-between;
        }

        &__item {
          display: flex;
          flex-direction: column;
        }

        &__label {
          font-size: 0.85em;
          color: #64748b;
          margin-bottom: 4px;
        }

        &__value {
          font-size: 1.2em;
          font-weight: bold;
          color: #1e293b;
        }
      }

      .content-body {
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;

        .sensor-card {
          padding: 15px;
          border-radius: var(--default-border-radius);
          background-color: var(--item-bg-white);
          display: flex;
          flex-direction: column;
          gap: 15px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

          &--normal {
            border-left: 5px solid var(--item-blue-color);
          }

          &--warning {
            border-left: 5px solid var(--item-orange-color);
          }

          &--error {
            border-left: 5px solid var(--item-red-color);
          }

          &__header {
            display: flex;
            align-items: center;
            gap: 10px;

            .sensor-card__status-indicator {
              width: 10px;
              height: 10px;
              border-radius: 50%;

              &--green {
                background-color: var(--item-blue-color);
              }

              &--orange {
                background-color: var(--item-orange-color);
              }

              &--yellow {
                background-color: var(--item-red-color);
              }
            }

            .sensor-card__title {
              font-size: 1em;
              font-weight: bold;
              color: #1e293b;
            }
          }

          &__meta {
            font-size: 0.9em;
            color: #64748b;
            margin-top: auto;
            display: flex;
            gap: 5px;

            span {
              font-weight: normal;
            }
          }

          &__alert {
            padding: 8px 5px;
            font-size: 0.85em;
            color: var(--item-blue-color);
            background-color: #f2f5fe;
            border-radius: var(--default-border-radius);
            display: flex;
            align-items: center;

            &:before {
              content: '☑︎';
              margin-right: 5px;
              font-size: 1.2em;
            }

            &--warning {
              color: var(--item-orange-color);
              background-color: #fef6e7;

              &:before {
                content: '⚠︎';
                margin-right: 5px;
                font-size: 1.2em;
              }
            }

            &--error {
              color: var(--item-red-color);
              background-color: #fef2f2;

              &:before {
                content: '✖︎';
                margin-right: 5px;
                font-size: 1.2em;
              }
            }
          }

          &__value {
            font-size: 2.8em;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 10px;

            & > span {
              color: #64748b;
              font-weight: normal;
              font-size: 0.9em;
            }
          }
        }
      }
    }
  }

  .section-monitor {
    margin-right: 10px;
    .section-content {
      display: flex;
      flex-direction: column;
      gap: 10px;
      height: 100%;
      overflow: hidden;

      .monitor-camera {
        background-color: var(--item-bg-lighter);
        border-radius: var(--default-border-radius);
        padding: 15px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

        &__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        &__title {
          display: flex;
          align-items: center;
          font-size: 1.1em;
          font-weight: bold;
          color: #1e293b;
        }

        &__link {
          width: 32px;
          height: 32px;
          border-radius: var(--default-border-radius);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background-color: var(--item-bg-lighter);
          transition: all 0.2s ease;

          &:hover {
            background-color: #e2e8f0;
          }
        }

        &__image {
          width: 100%;
          height: 330px;
          border-radius: var(--default-border-radius);
          background-color: var(--item-bg-lighter);
          overflow: hidden;
          margin-bottom: 10px;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }

        &__actions {
          display: flex;
          gap: 5px;

          .action-button {
            padding: 8px;
            border: none;
            border-radius: var(--default-border-radius);
            background-color: var(--item-bg-lighter);
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
              background-color: #e2e8f0;
            }

            & > img {
              width: 24px;
              height: 24px;
            }
          }
        }
      }

      .monitor-tasks {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
        border-radius: var (--default-border-radius);
        padding: 15px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        background-color: var(--home-bg-color);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

        &__header {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        &__title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.1em;
          font-weight: bold;
          color: #1e293b;
        }

        &__progress {
          display: flex;
          justify-content: space-between;

          span {
            &:first-child {
              font-weight: bold;
              color: var(--item-blue-color);
            }
            &:last-child {
              font-size: 0.9em;
              color: #64748b;
            }
          }
        }

        &__list {
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;

          .task-item {
            padding: 12px;
            border-radius: var (--default-border-radius);
            background-color: var(--item-bg-white);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

            &--completed {
              border-left: 5px solid var(--item-blue-color);
              background-color: var(--item-bg-white);

              .task-item__status img {
                filter: invert(45%) sepia(98%) saturate(1234%) hue-rotate(199deg) brightness(97%)
                  contrast(96%);
              }
            }

            &--pending {
              border-left: 5px solid #cbd5e1;
              background-color: var(--item-bg-white);

              .task-item__status img {
                filter: brightness(0);
              }
            }

            &__header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }

            &__body {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }

            &__title {
              font-size: 1em;
              font-weight: bold;
              color: #1e293b;
            }

            &__status {
              cursor: pointer;
              img {
                width: 24px;
                height: 24px;
              }
            }

            &__description {
              font-size: 0.85em;
              color: #64748b;
            }

            &__time {
              font-size: 0.8em;
              color: #64748b;
            }
          }
        }
      }
    }
  }
}
</style>
