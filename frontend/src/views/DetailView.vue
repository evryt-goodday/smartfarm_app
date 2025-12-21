<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import SettingIcon from '@/assets/icons/common/setting.svg'
import ListIcon from '@/assets/icons/common/list.svg'
import RefreshIcon from '@/assets/icons/chart/refresh.svg'
import TrendUpIcon from '@/assets/icons/common/up.svg'
import TrendDownIcon from '@/assets/icons/common/down.svg'
import TrendStableIcon from '@/assets/icons/common/stable.svg'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import 'chartjs-adapter-moment'
import moment from 'moment'
import { useStore } from 'vuex'
import toast from '@/utils/toast'
import { useRoute } from 'vue-router'

const store = useStore()
const route = useRoute()

const isChartReady = ref(false)

const deviceId = computed(() => route.params.id)

const isDataLoading = computed(() => store.state.detail.loading)
const timeRange = computed(() => store.state.detail.currentPeriod)
const alerts = computed(() => store.state.alert.currentDeviceAlerts)

// alerts 데이터가 유효한지 확인하는 computed 속성 추가
const hasAlerts = computed(() => {
  return Array.isArray(alerts.value) && alerts.value.length > 0
})

const isSavingThreshold = ref(false)
const thresholdValues = ref({
  maxValue: 0,
  minValue: 0,
})

const sensorData = computed(() => {
  const deviceData = store.state.detail.selectSensorData[deviceId.value]
  return deviceData?.day_stats || null
})

const periodData = computed(() => store.getters['detail/timeSeriesData'])

const handlePeriodChange = async (period) => {
  toast.dataQuery(period)
  await store.dispatch('detail/updatePeriod', period)
}

const formatDate = (date) => {
  if (!date) return '-'
  return moment(date).format('YYYY년 MM월 DD일')
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, TimeScale)

const getTimeFormat = (timeRangeValue) => {
  switch (timeRangeValue) {
    case 'hourly':
      return 'HH:mm'
    case 'daily':
      return 'MM-DD'
    case 'monthly':
      return 'YYYY-MM'
    default:
      return 'HH:mm'
  }
}

const getTooltipFormat = (timeRangeValue) => {
  switch (timeRangeValue) {
    case 'hourly':
      return 'YYYY-MM-DD HH:mm'
    case 'daily':
      return 'YYYY-MM-DD'
    case 'monthly':
      return 'YYYY-MM'
    default:
      return 'YYYY-MM-DD HH:mm'
  }
}

const chartData = computed(() => {
  const format = getTimeFormat(timeRange.value)

  if (!periodData.value || !periodData.value.length) {
    return {
      labels: [],
      datasets: [{ data: [] }],
    }
  }

  const formattedLabels = periodData.value.map((item) => {
    let date = moment(item.recorded_at || item.timestamp, 'YYYY-MM-DD HH:mm:ss')

    if (timeRange.value === 'daily') {
      return date.format('MM-DD')
    } else if (timeRange.value === 'monthly') {
      return date.format('YYYY-MM')
    } else {
      return date.format(format)
    }
  })

  return {
    labels: formattedLabels,
    datasets: [
      {
        label: sensorData.value?.name || '센서 데이터',
        data: periodData.value.map((item) => item.value),
        backgroundColor: 'rgba(52, 152, 219, 0.5)',
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      type: 'category',
      grid: {
        display: false,
      },
      reverse: true,
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: {
    tooltip: {
      callbacks: {
        title: (context) => {
          const index = context[0].dataIndex
          if (!periodData.value[index]) return ''
          return moment(periodData.value[index].timestamp).format(getTooltipFormat(timeRange.value))
        },
      },
    },
  },
}))

const getStatusClass = (sensorDetail) => {
  return {
    'status-active': sensorDetail === 'active',
    'status-warning': sensorDetail === 'warning',
    'status-error': sensorDetail === 'error',
  }
}

const getStatusText = (sensorDetail) => {
  const statusMap = {
    info: '정상 작동 중',
    warning: '주의 필요',
    error: '오류 발생',
  }
  return statusMap[sensorDetail] || sensorDetail
}

const range = computed(() => {
  if (!sensorData.value) return 0

  const max = parseFloat(sensorData.value?.max_value || '0')
  const min = parseFloat(sensorData.value?.min_value || '0')
  return (max - min) * 2
})

const trendData = computed(() => {
  const trendIcons = {
    up: TrendUpIcon,
    down: TrendDownIcon,
    stable: TrendStableIcon,
  }

  if (!sensorData.value) {
    return {
      icon: trendIcons.stable,
      text: '데이터 로드 중...',
      trendClass: 'stable',
    }
  }

  const midpoint =
    (Number(sensorData.value?.min_value || 0) + Number(sensorData.value?.max_value || 0)) / 2

  let trend = ''
  if (midpoint < Number(sensorData.value?.value || 0)) {
    trend = 'up'
  } else if (midpoint > Number(sensorData.value?.value || 0)) {
    trend = 'down'
  } else {
    trend = 'stable'
  }

  const trendText = (trend) => {
    const trendMap = {
      up: '상승 중',
      down: '하락 중',
      stable: '안정적',
    }
    return trendMap[trend] || '알 수 없음'
  }

  return {
    icon: trendIcons[trend],
    text: trendText(trend),
    trendClass: trend,
  }
})

const goBack = () => {
  history.go(-1)
  toast.custom('success', '뒤로가기')
}

const saveThreshold = async () => {
  if (!sensorData.value) return

  try {
    isSavingThreshold.value = true

    await store.dispatch('detail/updateThreshold', {
      deviceId: deviceId.value,
      maxValue: thresholdValues.value.maxValue.toString(),
      minValue: thresholdValues.value.minValue.toString(),
    })

    toast.custom('success', '임계값이 저장되었습니다.')
  } catch (error) {
    console.error('임계값 저장 실패:', error)
    toast.custom('error', '임계값 저장에 실패했습니다.')
  } finally {
    isSavingThreshold.value = false
  }
}

const initThresholdValues = () => {
  if (!sensorData.value) return

  // 센서의 최소값/최대값 가져오기
  let maxValue = parseFloat(sensorData.value.max_value)
  let minValue = parseFloat(sensorData.value.min_value)

  // NaN 체크 및 기본값 설정
  const defaultRange = maxValue - minValue

  // 기본값 설정 로직 개선
  if (isNaN(maxValue) || isNaN(minValue)) {
    // 기본값 설정
    minValue = isNaN(minValue) ? 0 : minValue
    maxValue = isNaN(maxValue) ? minValue + 100 : maxValue
  }

  // 최소값이 최대값보다 크면 조정
  if (minValue > maxValue) {
    if (maxValue === 0) {
      minValue = 0
      maxValue = 100
    } else {
      minValue = maxValue - Math.max(10, defaultRange * 0.2)
    }
  }

  // 최소값과 최대값이 같으면 범위 생성
  if (minValue === maxValue) {
    maxValue = minValue + 100
  }

  thresholdValues.value = {
    maxValue,
    minValue,
  }
}

const handleMaxValueChange = (event) => {
  if (!sensorData.value) return

  let value = Math.round(parseFloat(event.target.value))

  value = Math.max(value, thresholdValues.value.minValue)
  thresholdValues.value.maxValue = value
}

const handleMinValueChange = (event) => {
  if (!sensorData.value) return

  let value = Math.round(parseFloat(event.target.value))

  value = Math.min(value, thresholdValues.value.maxValue)
  thresholdValues.value.minValue = value
}

// 슬라이더의 최소/최대값 계산 로직 개선
const sliderMinValue = computed(() => {
  if (!sensorData.value) return 0
  const minVal = parseFloat(sensorData.value?.min_value || '0')
  // 최소값에서 30% 더 낮은 값을 최소 범위로 설정
  const extendedMin = isNaN(minVal) ? 0 : Math.max(0, minVal - Math.abs(minVal * 0.3))
  return Math.floor(extendedMin)
})

const sliderMaxValue = computed(() => {
  if (!sensorData.value) return 100
  const maxVal = parseFloat(sensorData.value?.max_value || '100')
  // 최대값에서 30% 더 높은 값을 최대 범위로 설정
  const extendedMax = isNaN(maxVal) ? 100 : maxVal + Math.abs(maxVal * 0.3)
  return Math.ceil(extendedMax)
})

// 백분율 계산 함수 추가
const calculatePercentage = (value, min, max) => {
  if (min === max) return 50 // 최소값과 최대값이 같으면 중앙에 표시
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

// 현재 값, 최소값, 최대값의 위치를 백분율로 계산하는 computed 속성 추가
const currentValuePosition = computed(() => {
  if (!sensorData.value) return 50
  const value = parseFloat(sensorData.value?.value || '0')
  return calculatePercentage(value, sliderMinValue.value, sliderMaxValue.value)
})

const minThresholdPosition = computed(() => {
  return calculatePercentage(
    thresholdValues.value.minValue,
    sliderMinValue.value,
    sliderMaxValue.value,
  )
})

const maxThresholdPosition = computed(() => {
  return calculatePercentage(
    thresholdValues.value.maxValue,
    sliderMinValue.value,
    sliderMaxValue.value,
  )
})

const sensorValueRange = computed(() => {
  if (!sensorData.value || !sensorData.value.value) return 0
  return Math.round(parseFloat(sensorData.value.value))
})

const minValueRange = computed(() => {
  if (!sensorData.value) return 0
  return Math.max(Math.round(parseFloat(sensorData.value.min_value || '10') * 0.5), 0)
})

const maxValueRange = computed(() => {
  if (!sensorData.value) return 100
  return Math.round(parseFloat(sensorData.value.max_value || '40') * 1.2)
})

const sensorUnit = computed(() => {
  return sensorData.value?.unit || sensorData.value?.sensor_unit || '%'
})

// 페이지 이동 시 알림 상태 초기화를 위한 언마운트 훅 추가
onBeforeUnmount(() => {
  // 컴포넌트가 제거될 때 알림 상태 초기화
  store.dispatch('alert/clearAlerts')
})

watch(
  () => sensorData.value,
  (newVal) => {
    if (newVal) {
      initThresholdValues()
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => deviceId.value,
  (newDeviceId, oldDeviceId) => {
    if (newDeviceId !== oldDeviceId) {
      // 다른 센서로 이동 시 이전 알림 초기화
      store.dispatch('alert/clearAlerts')
    }
  },
)

onMounted(async () => {
  try {
    if (deviceId.value) {
      // 이전 알림 데이터 초기화
      store.dispatch('alert/clearAlerts')

      // 먼저 센서 데이터를 불러옵니다
      await store.dispatch('detail/selectSensorAndLoadData', deviceId.value)

      // 센서 데이터가 성공적으로 로드되었고 알림 기능이 필요한 경우에만 알림을 가져옵니다
      const sensorData = store.state.detail.selectSensorData[deviceId.value]
      if (sensorData && sensorData.day_stats) {
        // 알림 기능이 활성화된 센서인지 확인 (예: warning, error 상태가 있는 센서)
        const alertTypes = ['warning', 'error', 'info']
        const hasAlertFeature =
          sensorData.day_stats.last_alert_type &&
          alertTypes.includes(sensorData.day_stats.last_alert_type)

        if (hasAlertFeature) {
          try {
            await store.dispatch('alert/fetchDeviceAlerts', deviceId.value)
          } catch (error) {
            // 알림 로드 실패는 조용히 무시
          }
        }
      }

      setTimeout(() => {
        initThresholdValues()
        isChartReady.value = true
      }, 500)
    }
  } catch (error) {
    console.error('데이터 로딩 실패:', error)
  }
})
</script>

<template>
  <div class="device-view">
    <div v-if="isDataLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div>데이터 로드 중...</div>
    </div>

    <div class="device-header">
      <div class="device-info">
        <h1>{{ sensorData?.name || '센서 정보' }}</h1>
        <div class="device-meta">
          <span class="device-id">ID: {{ sensorData?.model || '-' }}</span>
          <span class="device-type">{{
            sensorData?.type_name || sensorData?.sensor_type || '-'
          }}</span>
          <span class="device-status" :class="getStatusClass(sensorData?.last_alert_type)">
            {{ getStatusText(sensorData?.last_alert_type) }}
          </span>
        </div>
      </div>
      <div class="device-actions">
        <!-- <button class="action-btn">
          <img :src="SettingIcon" width="24" height="24" alt="setting" />
          설정
        </button>
        <button class="action-btn" @click="refreshSensorData">
          <img :src="RefreshIcon" width="24" height="24" alt="refresh" />
          새로고침
        </button> -->
        <button class="action-btn" @click="goBack">
          <img :src="ListIcon" width="24" height="24" alt="list" />
          목록
        </button>
      </div>
    </div>

    <div class="device-panels">
      <div class="panel chart-panel">
        <div class="panel-header">
          <h2>데이터 추이</h2>
          <div class="time-range">
            <button
              v-for="(label, range) in {
                hourly: '시간별',
                daily: '일별',
                monthly: '월별',
              }"
              :key="range"
              :class="['time-btn', { active: timeRange === range }]"
              @click="handlePeriodChange(range)"
            >
              {{ label }}
            </button>
          </div>
        </div>
        <div class="chart-container">
          <Bar
            v-if="isChartReady && periodData?.length > 0"
            :data="chartData"
            :options="chartOptions"
          />
          <div v-else-if="!isDataLoading" class="no-data-message">표시할 데이터가 없습니다.</div>
          <div v-else class="chart-loading">차트 데이터 로딩 중...</div>
        </div>
      </div>

      <div class="panels-row">
        <div class="panel current-value-panel">
          <h2>현재 값</h2>
          <div class="current-value">
            <span class="value">{{ sensorData?.real_time_data || '-' }}</span>

            <span class="unit">{{ sensorUnit }}</span>
          </div>
          <div class="value-trend" :class="trendData.trendClass">
            <img :src="trendData.icon" class="trend-icon" alt="trend" />
            <span>{{ trendData.text }}</span>
          </div>
          <div class="value-stats">
            <div class="stat-item">
              <span class="stat-label">오늘 평균</span>
              <span class="stat-value"
                >{{ Math.round(parseFloat(sensorData?.day_avg_value || '0'))
                }}{{ sensorUnit }}</span
              >
            </div>
            <div class="stat-item">
              <span class="stat-label">최대값</span>
              <span class="stat-value"
                >{{ Math.round(parseFloat(sensorData?.day_max_value || '0'))
                }}{{ sensorUnit }}</span
              >
            </div>
            <div class="stat-item">
              <span class="stat-label">최소값</span>
              <span class="stat-value"
                >{{ Math.round(parseFloat(sensorData?.day_min_value || '0'))
                }}{{ sensorUnit }}</span
              >
            </div>
          </div>
        </div>

        <div class="panel threshold-panel">
          <h2>임계값 설정</h2>
          <div v-if="sensorData" class="threshold-controls">
            <div class="current-threshold-value">
              <span class="label">현재 센서 값:</span>
              <span class="value">{{ sensorData?.real_time_data || '-' }}{{ sensorUnit }}</span>
            </div>

            <div class="threshold-item" v-if="sensorData">
              <label for="max-value-range"> 최대 임계값 ({{ sensorUnit }}) </label>
              <div class="threshold-input">
                <div class="input-row">
                  <input
                    type="range"
                    id="max-value-range"
                    v-model.number="thresholdValues.maxValue"
                    :min="sliderMinValue"
                    :max="sliderMaxValue"
                    step="1"
                    class="threshold-slider"
                    @input="handleMaxValueChange"
                  />
                  <input
                    type="number"
                    id="max-value-number"
                    v-model.number="thresholdValues.maxValue"
                    :min="sliderMinValue"
                    :max="sliderMaxValue"
                    step="1"
                    @change="handleMaxValueChange"
                  />
                </div>
                <span class="range-description">
                  범위: {{ sliderMinValue }}-{{ sliderMaxValue }}
                  {{ sensorUnit }}
                </span>
              </div>
            </div>
            <div v-else class="loading-message">임계값 데이터 로딩 중...</div>

            <div class="threshold-item" v-if="sensorData">
              <label for="min-value-range"> 최소 임계값 ({{ sensorUnit }}) </label>
              <div class="threshold-input">
                <div class="input-row">
                  <input
                    type="range"
                    id="min-value-range"
                    v-model.number="thresholdValues.minValue"
                    :min="sliderMinValue"
                    :max="sliderMaxValue"
                    step="1"
                    class="threshold-slider"
                    @input="handleMinValueChange"
                  />
                  <input
                    type="number"
                    id="min-value-number"
                    v-model.number="thresholdValues.minValue"
                    :min="sliderMinValue"
                    :max="sliderMaxValue"
                    step="1"
                    @change="handleMinValueChange"
                  />
                </div>
                <span class="range-description">
                  범위: {{ sliderMinValue }}-{{ sliderMaxValue }}
                  {{ sensorUnit }}
                </span>
              </div>
            </div>
            <div v-else class="loading-message">임계값 데이터 로딩 중...</div>
          </div>
          <div v-else class="no-data-message">센서 정보를 불러오는 중입니다...</div>

          <div class="threshold-summary">
            <div class="threshold-comparison">
              <div class="threshold-bar">
                <div class="threshold-range-labels">
                  <span class="min-label">{{ sliderMinValue }}</span>
                  <span class="current-label">{{ sensorValueRange }}</span>
                  <span class="max-label">{{ sliderMaxValue }}</span>
                </div>
                <div
                  class="threshold-current"
                  :style="{
                    left: `${currentValuePosition}%`,
                  }"
                ></div>
                <div
                  class="threshold-min-value"
                  :style="{
                    left: `${minThresholdPosition}%`,
                  }"
                ></div>
                <div
                  class="threshold-max-value"
                  :style="{
                    left: `${maxThresholdPosition}%`,
                  }"
                ></div>
              </div>
            </div>
          </div>

          <button
            class="save-btn"
            :disabled="!sensorData || isSavingThreshold"
            @click="saveThreshold"
          >
            <span v-if="isSavingThreshold">저장 중...</span>
            <span v-else>임계값 저장</span>
          </button>
        </div>
      </div>

      <div class="panels-row">
        <div class="panel alerts-panel">
          <h2>알림 로그</h2>
          <div class="alerts-list">
            <template v-if="hasAlerts">
              <div
                v-for="(alert, index) in alerts"
                :key="index"
                class="alert-item"
                :class="alert.alert_type"
              >
                <div class="alert-time">{{ alert.timestamp }}</div>
                <div class="alert-message">{{ alert.message }}</div>
              </div>
            </template>
            <div v-else class="no-alerts">현재 등록된 알림이 없습니다.</div>
          </div>
        </div>

        <div class="panel device-details-panel">
          <h2>센서 정보</h2>
          <div v-if="sensorData" class="device-details">
            <div class="detail-item">
              <span class="detail-label">모델명</span>
              <span class="detail-value">{{ sensorData?.model || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">설치 위치</span>
              <span class="detail-value">{{ sensorData?.location || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">설치일</span>
              <span class="detail-value">{{ formatDate(sensorData?.created_at) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">펌웨어 버전</span>
              <span class="detail-value">{{ sensorData?.firmware_version || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">배터리 상태</span>
              <span class="detail-value">{{ sensorData?.battery_status || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">마지막 유지보수</span>
              <span class="detail-value">{{
                formatDate(sensorData?.last_maintenance || sensorData?.last_alert_at)
              }}</span>
            </div>
          </div>
          <div v-else class="no-data-message">센서 정보를 불러오는 중입니다...</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.device-view {
  padding: 20px;
  background-color: var(--body-bg-color);
  min-height: 100vh;

  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    background-color: var(--item-bg-white);
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);

    .device-info {
      h1 {
        margin: 0 0 8px 0;
        color: #2c3e50;
        font-size: 1.2em;
      }

      .device-meta {
        display: flex;
        gap: 20px;
        color: #7f8c8d;
        font-size: 0.95em;

        .device-status {
          padding: 5px 12px;
          border-radius: 15px;
          font-size: 0.95em;
          font-weight: 500;

          &.status-active {
            background-color: #e8f5e9;
            color: var(--item-green-color);
          }

          &.status-warning {
            background-color: #fff8e1;
            color: var(--item-orange-color);
          }

          &.status-error {
            background-color: #ffebee;
            color: var(--item-red-color);
          }
        }
      }
    }

    .device-actions {
      display: flex;
      gap: 12px;

      .action-btn {
        padding: 8px 10px;
        background-color: #fff;
        border: 1px solid #ddd;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
        font-size: 0.95em;

        &:hover {
          background-color: #f5f5f5;
          transform: translateY(-2px);
        }

        i {
          font-size: 1.3em;
        }
      }
    }
  }

  .device-panels {
    display: flex;
    flex-direction: column;
    gap: 25px;

    .panel {
      background-color: var(--item-bg-white);
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .panels-row {
      display: flex;
      gap: 25px;

      & > .panel {
        flex: 1;
      }
    }

    .chart-panel {
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        h2 {
          margin: 0;
          color: #2c3e50;
          font-size: 1.2em;
        }

        .time-range {
          display: flex;
          gap: 8px;

          .time-btn {
            padding: 8px 16px;
            border: 1px solid #ddd;
            background-color: #fff;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.95em;
            transition: all 0.2s ease;

            &.active,
            &:hover {
              background-color: var(--item-blue-color);
              color: white;
              border-color: var(--item-blue-color);
              transform: translateY(-2px);
            }
          }
        }
      }

      .chart-container {
        height: 400px;
        position: relative;
        background-color: var(--item-bg-white);
        border-radius: 8px;
        padding: 20px;
        box-sizing: border-box;
      }
    }

    .current-value-panel {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      h2 {
        margin-top: 0;
        color: #2c3e50;
        font-size: 1.2em;
      }

      .current-value {
        margin: 25px 0;

        .value {
          font-size: 2.5em;
          font-weight: bold;
          color: #2c3e50;
        }

        .sensor_unit {
          font-size: 1.3em;
          color: #7f8c8d;
        }
      }

      .value-trend {
        margin-bottom: 25px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        font-size: 1em;

        .trend-icon {
          width: 24px;
          height: 24px;

          &.up {
            filter: invert(40%) sepia(79%) saturate(2404%) hue-rotate(338deg) brightness(100%)
              contrast(91%);
          }

          &.down {
            filter: invert(72%) sepia(41%) saturate(573%) hue-rotate(93deg) brightness(92%)
              contrast(87%);
          }

          &.stable {
            filter: invert(50%) sepia(54%) saturate(2253%) hue-rotate(176deg) brightness(92%)
              contrast(93%);
          }
        }

        &.up {
          color: var(--item-red-color);
        }

        &.down {
          color: var(--item-green-color);
        }

        &.stable {
          color: var(--item-blue-color);
        }
      }

      .value-stats {
        display: flex;
        justify-content: space-between;
        padding: 0 15px;

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 8px;

          .stat-label {
            font-size: 1em;
            color: #7f8c8d;
          }

          .stat-value {
            font-weight: bold;
            color: #2c3e50;
            font-size: 1em;
          }
        }
      }
    }

    .threshold-panel {
      h2 {
        margin-top: 0;
        color: #2c3e50;
        font-size: 1.2em;
        margin-bottom: 25px;
      }

      .current-threshold-value {
        display: flex;
        justify-content: space-between;
        background-color: var(--item-bg-lighter);
        padding: 12px 15px;
        border-radius: 8px;
        margin-bottom: 20px;

        .label {
          color: #7f8c8d;
          font-size: 1.1em;
        }

        .value {
          font-weight: bold;
          font-size: 1.1em;
          color: var(--item-blue-color);
        }
      }

      .threshold-controls {
        margin-bottom: 25px;

        .threshold-item {
          margin-bottom: 20px;

          label {
            display: block;
            margin-bottom: 8px;
            color: #7f8c8d;
            font-size: 1.1em;
          }

          .threshold-input {
            display: flex;
            flex-direction: column;
            gap: 10px;

            .range-description {
              font-size: 0.9em;
              color: #95a5a6;
              text-align: right;
            }

            .input-row {
              display: flex;
              align-items: center;
              gap: 15px;
            }

            .threshold-slider {
              flex: 1;
              height: 8px;
              -webkit-appearance: none;
              appearance: none;
              background: #ddd;
              border-radius: 4px;
              outline: none;

              &::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                background: var(--item-blue-color);
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.2s ease;

                &:hover {
                  transform: scale(1.1);
                }
              }

              &::-moz-range-thumb {
                width: 20px;
                height: 20px;
                background: var(--item-blue-color);
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;

                &:hover {
                  transform: scale(1.1);
                }
              }
            }

            input[type='number'] {
              width: 80px;
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 8px;
              font-size: 1.1em;
            }
          }
        }
      }

      .threshold-summary {
        margin: 30px 0;
        overflow: hidden; /* 넘치는 부분 숨김 처리 */

        .threshold-comparison {
          position: relative;
          height: 50px;
          width: 100%; /* 너비 제한 */

          .threshold-bar {
            position: relative;
            height: 10px;
            background: #ecf0f1;
            border-radius: 5px;
            margin: 20px 0;
            overflow: visible; /* 표시기는 보이도록 함 */

            .threshold-range-labels {
              position: relative;
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
              font-size: 0.5em;
              color: #7f8c8d;

              .min-label,
              .current-label,
              .max-label {
                position: relative;
                padding: 2px 6px;
                background-color: var(--body-bg-color);
                border-radius: 4px;

                &::after {
                  content: '';
                  position: absolute;
                  bottom: -6px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 1px;
                  height: 6px;
                  background-color: #7f8c8d;
                }
              }

              .min-label {
                color: var(--item-orange-color);
              }

              .current-label {
                color: var(--item-blue-color);
                font-weight: bold;
              }

              .max-label {
                color: var(--item-red-color);
              }
            }

            .threshold-current,
            .threshold-min-value,
            .threshold-max-value {
              position: absolute;
              width: 4px;
              height: 20px;
              top: -5px;
              transform: translateX(-50%);
              border-radius: 2px;
              max-width: 100%; /* 최대 너비 제한 */
            }

            .threshold-current {
              background-color: var(--item-blue-color);
              height: 20px;
              width: 6px;
              z-index: 3;
            }

            .threshold-min-value {
              background-color: var(--item-orange-color);
              height: 16px;
              z-index: 2;
            }

            .threshold-max-value {
              background-color: var(--item-red-color);
              height: 16px;
              z-index: 2;
            }
          }
        }
      }

      .save-btn {
        width: 100%;
        padding: 12px;
        background-color: var(--item-blue-color);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 1.1em;
        font-weight: 500;

        &:hover {
          background-color: #2980b9;
          transform: translateY(-2px);
        }

        &:disabled {
          background-color: #bdc3c7;
          transform: none;
          cursor: not-allowed;
        }
      }
    }

    .alerts-panel {
      h2 {
        margin-top: 0;
        color: #2c3e50;
        font-size: 1.2em;
        margin-bottom: 20px;
      }

      .alerts-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 300px;
        overflow-y: auto;

        .alert-item {
          padding: 15px;
          border-radius: 8px;
          position: relative;
          transition: all 0.2s ease;

          &:hover {
            transform: translateX(5px);
          }

          &.warning {
            background-color: #fff8e1;
            border-left: 4px solid var(--item-orange-color);
          }

          &.error {
            background-color: #ffebee;
            border-left: 4px solid var(--item-red-color);
          }

          &.info {
            background-color: #e3f2fd;
            border-left: 4px solid var(--item-blue-color);
          }

          .alert-time {
            font-size: 0.9em;
            color: #7f8c8d;
            margin-bottom: 8px;
          }

          .alert-message {
            font-size: 1.1em;
            color: #2c3e50;
            line-height: 1.4;
          }
        }

        .no-alerts {
          padding: 25px;
          text-align: center;
          color: #7f8c8d;
          font-size: 1.1em;
        }
      }
    }

    .device-details-panel {
      h2 {
        margin-top: 0;
        color: #2c3e50;
        font-size: 1.2em;
        margin-bottom: 20px;
      }

      .device-details {
        display: flex;
        flex-direction: column;
        gap: 15px;

        .detail-item {
          display: flex;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid #ecf0f1;

          &:last-child {
            border-bottom: none;
          }

          .detail-label {
            color: #7f8c8d;
            font-size: 1.1em;
          }

          .detail-value {
            font-weight: 500;
            color: #2c3e50;
            font-size: 1.1em;
          }
        }
      }
    }
  }
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid var(--item-blue-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.no-data-message {
  padding: 30px;
  text-align: center;
  color: #7f8c8d;
  font-size: 1.1em;
  background-color: var(--item-bg-lighter);
  border-radius: 8px;
}

.chart-loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7f8c8d;
  font-size: 1.1em;
}

.loading-message {
  padding: 15px;
  text-align: center;
  color: #7f8c8d;
  font-size: 0.95em;
  background-color: var(--item-bg-lighter);
  border-radius: 8px;
  margin-bottom: 15px;
}
</style>
