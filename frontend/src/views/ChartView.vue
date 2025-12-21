<script setup>
import { onMounted, computed } from 'vue'
import { useStore } from 'vuex'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import 'chartjs-adapter-moment'
import moment from 'moment'
import 'moment/locale/ko'
import toast from '@/utils/toast'
import router from '@/router'

moment.locale('ko')

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
)

const store = useStore()
const sensorList = computed(() => store.state.sensor.sensorList)
const currentPeriod = computed(() => store.state.sensor.currentPeriod)
const averageData = computed(() => store.state.sensor.currentAverageData)
const alerts = computed(() => store.state.alert.alerts)

const hasAlerts = computed(() => {
  return Array.isArray(alerts.value) && alerts.value.length > 0
})

const getTimeUnit = (period) => {
  toast.dataQuery(period)

  switch (period) {
    case 'hourly':
      return 'hour'
    case 'daily':
      return 'day'
    case 'monthly':
      return 'month'
  }
}
const getTooltipFormat = (period) => {
  switch (period) {
    case 'hourly':
      return 'YYYY-MM-DD HH:mm'
    case 'daily':
      return 'YYYY-MM-DD'
    case 'monthly':
      return 'YYYY-MM'
  }
}

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      type: 'time',
      time: {
        unit: getTimeUnit(currentPeriod.value),
        displayFormats: {
          hour: 'HH:mm',
          day: 'MM/DD',
          month: 'YYYY년 MM월',
        },
        tooltipFormat: getTooltipFormat(currentPeriod.value),
      },
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: function (context) {
          const value = context.parsed.y.toFixed(1)
          const unit = context.dataset.unit || ''
          return `${value}${unit}`
        },
      },
    },
  },
}))

const getChartData = (sensor) => {
  const periodData = store.getters['sensor/getCurrentPeriodData'](sensor.device_id)
  if (!periodData?.length) return { datasets: [] }

  const processedData = periodData
    .map((item) => {
      if (!item?.timestamp || !item?.value) return null

      let date
      if (currentPeriod.value === 'monthly') {
        date = moment(item.timestamp, 'YYYY-MM')
      } else {
        date = moment(item.timestamp, 'YYYY-MM-DD HH:mm:ss')
      }

      const value = Number(item.value)

      if (!date.isValid() || isNaN(value)) {
        return null
      }

      if (currentPeriod.value === 'daily') {
        return {
          x: date.startOf('day').toDate(),
          y: value,
        }
      }

      return {
        x: date.toDate(),
        y: value,
      }
    })
    .filter(Boolean)

  return {
    datasets: [
      {
        label: sensor.description,
        data: processedData,
        borderColor: getColorForSensor(sensor.sensor_type),
        backgroundColor: `${getColorForSensor(sensor.sensor_type)}33`,
        tension: 0.4,
        fill: true,
        unit: sensor.unit,
      },
    ],
  }
}

const getColorForSensor = (type) => {
  const colors = {
    temperature: '#e74c3c',
    humidity: '#3498db',
    rain: '#2ecc71',
    wind: '#f1c40f',
    cloud: '#9b59b6',
    pressure: '#795548',
  }
  return colors[type] || '#95a5a6'
}

const handlePeriodChange = async (period) => {
  try {
    await store.dispatch('sensor/updatePeriod', period)
  } catch (error) {
    console.error('기간 변경 실패:', error)
  }
}

const getSensorListStatusClass = (sensor) => {
  if (sensor.value > sensor.max_value) return 'status-high'
  if (sensor.value < sensor.min_value) return 'status-low'
  return 'status-normal'
}

// 컴포넌트 코드 예시
const navigateToDetail = (deviceId) => {
  store.dispatch('detail/selectSensor', deviceId)
  router.push({ name: 'detail', params: { id: deviceId } })
}

onMounted(async () => {
  try {
    await store.dispatch('sensor/fetchChartData')
    if (!Object.keys(sensorList.value).length) {
      console.warn('센서 데이터가 없습니다.')
      return
    }

    try {
      await store.dispatch('alert/fetchAlerts')
    } catch (error) {
      console.warn('알림 데이터를 불러올 수 없습니다:', error.message)
    }
  } catch (error) {
    console.error('데이터 로딩 실패:', error)
  }
})
</script>

<template>
  <div class="sensor-dashboard">
    <header class="dashboard-header">
      <h1>센서 모니터링 차트</h1>
      <div class="time-controls">
        <button
          v-for="period in ['hourly', 'daily', 'monthly']"
          :key="period"
          :class="['time-btn', { active: currentPeriod === period }]"
          @click="handlePeriodChange(period)"
        >
          {{ period === 'hourly' ? '시간별' : period === 'daily' ? '일별' : '월별' }}
        </button>
      </div>
    </header>

    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-icon temperature">🌡️</div>
        <div class="stat-value">{{ averageData.temperature }}°C</div>
        <div class="stat-label">평균 온도</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon humidity">💧</div>
        <div class="stat-value">{{ averageData.humidity }}%</div>
        <div class="stat-label">평균 습도</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon wind">🌀</div>
        <div class="stat-value">{{ averageData.wind }} lux</div>
        <div class="stat-label">평균 풍속</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon pressure">🧭</div>
        <div class="stat-value">{{ averageData.pressure }}%</div>
        <div class="stat-label">평균 기압</div>
      </div>
    </div>

    <div class="sensor-overview">
      <div
        v-for="sensor in sensorList"
        :key="sensor.device_id"
        class="sensor-card"
        :class="{ alert: sensor.value > sensor.max_value || sensor.value < sensor.min_value }"
      >
        <div class="sensor-header">
          <h3>{{ sensor.description }} 센서</h3>
          <span class="sensor-status" :class="getSensorListStatusClass(sensor)"></span>
        </div>

        <div class="sensor-value">
          {{ sensor.value }}{{ sensor.unit }}
          <span class="trend-indicator" :class="sensor.trend">
            {{ sensor.trend === 'up' ? '↑' : sensor.trend === 'down' ? '↓' : '→' }}
          </span>
        </div>

        <div class="sensor-thresholds">
          <span class="min">Min: {{ sensor.min_value }}{{ sensor.unit }}</span>
          <span class="max">Max: {{ sensor.max_value }}{{ sensor.unit }}</span>
        </div>

        <div class="sensor-chart">
          <Line :data="getChartData(sensor)" :options="chartOptions" />
        </div>
        <button class="view-details-btn" @click="navigateToDetail(sensor.device_id)">
          상세 보기
        </button>
      </div>
    </div>

    <div class="alerts-section">
      <h2>최근 알림</h2>
      <div class="alert-list">
        <template v-if="hasAlerts">
          <div class="alert-item" v-for="(alert, index) in alerts" :key="index">
            <div class="alert-icon" :class="alert.alert_type"></div>
            <div class="alert-content">
              <div class="alert-title">{{ alert.name }}</div>
              <div class="alert-message">{{ alert.message }}</div>
              <div class="alert-time">{{ alert.timestamp }}</div>
            </div>
          </div>
        </template>
        <div v-else class="no-alerts-message">현재 표시할 알림이 없습니다.</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sensor-dashboard {
  padding: 20px;
  background-color: var(--body-bg-color);
  min-height: calc(100vh - var(--header-height));

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h1 {
      color: #2c3e50;
      margin: 0;
      font-size: 1.4em;
    }

    .time-controls {
      display: flex;
      gap: 10px;

      .time-btn {
        background-color: var(--item-bg-white);
        border: 1px solid #ddd;
        padding: 8px 15px;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.3s ease;

        &.active,
        &:hover {
          background-color: var(--item-blue-color);
          color: white;
          border-color: var(--item-blue-color);
        }
      }
    }
  }

  .sensor-overview {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 30px;

    .sensor-card {
      background-color: var(--item-bg-white);
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      height: 400px;

      &.alert {
        border-left: 4px solid var(--item-red-color);
        background-color: #fff5f5;
      }

      .sensor-status {
        width: 10px;
        height: 10px;
        border-radius: 50%;

        &.status-normal {
          background-color: var(--item-green-color);
        }

        &.status-high {
          background-color: var(--item-red-color);
        }

        &.status-low {
          background-color: var(--item-orange-color);
        }
      }

      .sensor-value {
        font-size: 2em;
        font-weight: bold;
        color: #2c3e50;
        margin-bottom: 10px;

        .trend-indicator {
          font-size: 0.6em;
          margin-left: 5px;

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
      }

      .sensor-thresholds {
        display: flex;
        justify-content: space-between;
        font-size: 0.85em;
        color: #7f8c8d;
        margin-bottom: 15px;
      }

      .sensor-chart {
        flex: 1;
        background-color: #fff;
        border-radius: 5px;
        margin: 15px 0;
        padding: 10px;
        min-height: 200px;
      }

      .view-details-btn {
        width: 100%;
        padding: 8px;
        background-color: var(--item-blue-color);
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        font-size: 0.9em;

        &:hover {
          background-color: #2980b9;
        }
      }
    }
  }

  .dashboard-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 30px;

    .stat-card {
      background-color: var(--item-bg-white);
      border-radius: 10px;
      padding: 25px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      text-align: center;

      .stat-icon {
        width: 50px;
        height: 50px;
        margin: 0 auto 15px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8em;
        color: white;

        &.temperature {
          background-color: var(--item-red-color);
        }

        &.humidity {
          background-color: var(--item-blue-color);
        }

        &.wind {
          background-color: var(--item-grey-color);
        }

        &.pressure {
          background-color: #e5336d;
        }
      }

      .stat-value {
        font-size: 2em;
        font-weight: bold;
        color: #2c3e50;
        margin-bottom: 8px;
      }

      .stat-label {
        color: #7f8c8d;
        font-size: 1em;
      }
    }
  }

  .alerts-section {
    background-color: var(--item-bg-white);
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    margin-top: 20px;

    h2 {
      margin-top: 0;
      color: #2c3e50;
      margin-bottom: 15px;
      font-size: 1.5em;
    }

    .alert-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;

      .alert-item {
        display: flex;
        padding: 15px;
        border-radius: 5px;
        background-color: var(--item-bg-lighter);
        transition: transform 0.3s ease;

        &:hover {
          transform: translateY(-2px);
        }

        .alert-icon {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          margin-right: 15px;
          flex-shrink: 0;

          &.warning {
            background-color: var(--item-orange-color);
          }

          &.error {
            background-color: var(--item-red-color);
          }

          &.info {
            background-color: var(--item-blue-color);
          }
        }

        .alert-content {
          flex: 1;

          .alert-title {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 1.1em;
          }

          .alert-message {
            font-size: 0.95em;
            color: #7f8c8d;
            margin-bottom: 5px;
          }

          .alert-time {
            font-size: 0.85em;
            color: #95a5a6;
          }
        }
      }

      .no-alerts-message {
        padding: 20px;
        text-align: center;
        color: #7f8c8d;
        background-color: var(--item-bg-lighter);
        border-radius: 8px;
        margin-top: 10px;
        font-size: 1.1em;
      }
    }
  }
}
</style>
