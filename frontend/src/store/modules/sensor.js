import axios from '@/plugins/axios'
import monitoringService from '@/services/monitoringService'
import socketService from '@/plugins/socket'

export default {
  namespaced: true,

  state: {
    sensorList: {},
    sensorRealtime: {},
    sensorData: {},
    loading: false,
    error: null,
    currentPeriod: 'hourly',
    chartDataPointLimit: 15,
    currentAverageData: {
      temperature: '',
      humidity: '',
      wind: '',
      pressure: '',
    },
		socketConnected: false
  },

  mutations: {
    SET_SENSORLIST(state, sensorList) {
      state.sensorList = sensorList
    },
    SET_LOADING(state, status) {
      state.loading = status
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    UPDATE_SENSOR_VALUES(state, values) {
      Object.entries(values).forEach(([deviceId, data]) => {
        if (state.sensorRealtime[deviceId]) {
          state.sensorRealtime[deviceId] = {
            ...state.sensorRealtime[deviceId],
            value: data.value,
            recorded_at: data.recorded_at,
          }
        } else {
          state.sensorRealtime[deviceId] = data
        }
      })
    },

		UPDATE_SENSOR_REALTIME(state, { deviceId, value, timestamp }) {
      const sensor = Object.values(state.sensorList).find(
        (s) => s.device_id === deviceId
      )

      if (sensor) {
        state.sensorList = {
          ...state.sensorList,
          [deviceId]: {
            ...sensor,
            current_value: value,
            value_recorded_at: timestamp,
          },
        }

        state.sensorRealtime = {
          ...state.sensorRealtime,
          [deviceId]: {
            value,
            recorded_at: timestamp,
          },
        }

        console.log(`실시간 센서 업데이트 (device: ${deviceId}): ${value}`)
      }
    },
    SET_SOCKET_CONNECTED(state, status) {
      state.socketConnected = status
    },

    SET_SENSOR_DATA(state, { deviceId, period, data }) {
      if (!state.sensorData[deviceId]) {
        state.sensorData = {
          ...state.sensorData,
          [deviceId]: {},
        }
      }

      state.sensorData = {
        ...state.sensorData,
        [deviceId]: {
          ...state.sensorData[deviceId],
          [period]: data,
        },
      }
    },
    SET_CURRENT_PERIOD(state, period) {
      state.currentPeriod = period
    },
    SET_CURRENT_AVERAGE_DATA(state, averages) {
      state.currentAverageData = {
        ...state.currentAverageData,
        ...averages,
      }
    },

    UPDATE_DATA_BULK(state, { period, data }) {
      Object.entries(data).forEach(([deviceId, deviceData]) => {
        if (!state.sensorData[deviceId]) {
          state.sensorData = {
            ...state.sensorData,
            [deviceId]: {},
          }
        }

        state.sensorData = {
          ...state.sensorData,
          [deviceId]: {
            ...state.sensorData[deviceId],
            [period]: deviceData,
          },
        }
      })
    },
    CLEAR_SENSOR_DATA(state) {
      state.sensorData = {}
    },
    CLEAR_SENSOR_REALTIME(state) {
      state.sensorRealtime = {}
    },
  },

  actions: {
		initializeSocket({ commit, rootState }) {
      socketService.connect()
      commit('SET_SOCKET_CONNECTED', true)

      socketService.onSensorUpdate((data) => {
        console.log('Socket: 센서 데이터 수신', data)
        commit('UPDATE_SENSOR_REALTIME', {
          deviceId: data.deviceId,
          value: data.value,
          timestamp: data.timestamp,
        })
      })

      socketService.onActuatorUpdate((data) => {
        console.log('Socket: 액추에이터 상태 수신', data)
      })

      socketService.onAlert((alert) => {
        console.log('Socket: 알림 수신', alert)
      })

      console.log('Socket 이벤트 리스너 등록 완료')
    },

    disconnectSocket({ commit }) {
      socketService.disconnect()
      commit('SET_SOCKET_CONNECTED', false)
    },

    subscribeToHouse({ state }, houseId) {
      if (state.socketConnected) {
        socketService.subscribeToHouse(houseId)
      }
    },

    async fetchSensorList({ commit, rootState }) {
      try {
        commit('SET_LOADING', true)
        const selectedHouse = rootState.house?.selectedHouse.house_id

        const response = await axios.get(`/sensor/${selectedHouse}`, {})

        if (response.data && Array.isArray(response.data)) {
          const sensorListMap = response.data.reduce(
            (acc, sensor) => ({
              ...acc,
              [sensor.device_id]: {
                device_id: sensor.device_id,
                name: sensor.name,
                model: sensor.model,
                description: sensor.description,
                sensor_type: sensor.sensor_type,
                last_alert_type: sensor.last_alert_type,
                last_alert_message: sensor.last_alert_message,
                last_alert_at: sensor.last_alert_at,
                max_value: sensor.max_value,
                min_value: sensor.min_value,
                sensor_unit: sensor.sensor_unit,
                battery_status: sensor.battery_status,
                location: sensor.location,
                created_at: sensor.created_at,
                firmware_version: sensor.firmware_version,
              },
            }),
            {},
          )

          const valuesMap = response.data.reduce(
            (acc, sensor) => ({
              ...acc,
              [sensor.device_id]: {
                value: sensor.current_value,
                recorded_at: sensor.value_recorded_at,
              },
            }),
            {},
          )

          commit('SET_SENSORLIST', sensorListMap)
          commit('UPDATE_SENSOR_VALUES', valuesMap)

          // 센서 데이터 모니터링 추가
          Object.entries(sensorListMap).forEach(([deviceId, sensor]) => {
            if (valuesMap[deviceId]) {
              monitoringService.monitorSensorData(deviceId, {
                ...sensor,
                value: valuesMap[deviceId].value,
              })
            }
          })
        }
      } catch (error) {
        // suppressConsole 속성이 없는 경우에만 에러 처리
        if (!error.suppressConsole) {
          // 조용히 오류 상태 설정 (콘솔 출력 없음)
          commit('SET_ERROR', error.message || '센서 데이터 로드 실패')
        }

        // 빈 객체 설정해서 UI에서 에러 처리 가능하게
        commit('SET_SENSORLIST', {})
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async fetchChartData({ commit, state, dispatch, rootState }) {
      commit('SET_LOADING', true)
      commit('CLEAR_SENSOR_DATA')

      try {
        await dispatch('fetchSensorList')

        const selectedHouse = rootState.house?.selectedHouse.house_id
        const endpoint = `/sensor/values/timeframe/${selectedHouse}`

        const response = await axios.get(endpoint, {
          params: {
            timeframe: state.currentPeriod,
            limit: state.chartDataPointLimit,
          },
        })

        if (response.data) {
          const formattedData = response.data.reduce((acc, item) => {
            if (!acc[item.device_id]) {
              acc[item.device_id] = []
            }
            acc[item.device_id].push(item)
            return acc
          }, {})

          commit('UPDATE_DATA_BULK', {
            period: state.currentPeriod,
            data: formattedData,
          })

          dispatch('updateAverageData', formattedData)
        }
      } catch (error) {
        commit('SET_ERROR', error.message || '차트 데이터 로드 실패')
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async updatePeriod({ commit, dispatch }, period) {
      commit('SET_CURRENT_PERIOD', period)
      commit('CLEAR_SENSOR_DATA')
      await dispatch('fetchChartData')
    },

    async updateAverageData({ commit, state }, periodData) {
      const typeSums = {}

      Object.values(periodData)
        .flat()
        .forEach((item) => {
          const sensor = state.sensorList[item.device_id]
          if (!sensor?.sensor_type) return

          const type = sensor.sensor_type
          if (!typeSums[type]) {
            typeSums[type] = { sum: 0, count: 0 }
          }

          if (item.value != null) {
            typeSums[type].sum += Number(item.value)
            typeSums[type].count++
          }
        })

      const averages = {}
      Object.entries(typeSums).forEach(([type, data]) => {
        averages[type] = data.count > 0 ? (data.sum / data.count).toFixed(1) : ''
      })

      commit('SET_CURRENT_AVERAGE_DATA', averages)
    },

    resetSensorData({ commit }) {
      // 센서 목록 초기화
      commit('SET_SENSORLIST', {})

      // 실시간 센서 데이터 초기화
      commit('CLEAR_SENSOR_REALTIME')

      // 차트 및 기간별 데이터 초기화
      commit('CLEAR_SENSOR_DATA')

      // 기타 센서 관련 상태 초기화
      commit('SET_LOADING', false)
      commit('SET_ERROR', null)
    },
  },

  getters: {
    getCurrentPeriodData: (state) => (deviceId) => {
      return state.sensorData[deviceId]?.[state.currentPeriod] || []
    },
  },
}
