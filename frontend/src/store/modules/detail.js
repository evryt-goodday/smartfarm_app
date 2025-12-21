import axios from '@/plugins/axios'
import monitoringService from '@/services/monitoringService'

export default {
  namespaced: true,

  state: {
    selectSensorData: {},
    loading: false,
    error: null,
    selectedDeviceId: null,
    detailDataPointLimit: 30,
    currentPeriod: 'hourly',
  },

  mutations: {
    SET_CURRENT_PERIOD(state, period) {
      state.currentPeriod = period
    },
    SET_LOADING(state, status) {
      state.loading = status
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    SET_SELECTED_SENSOR(state, deviceId) {
      state.selectedDeviceId = deviceId
    },
    SET_SENSOR_DATA(state, { type, data }) {
      if (!state.selectSensorData[state.selectedDeviceId]) {
        state.selectSensorData[state.selectedDeviceId] = {}
      }

      state.selectSensorData[state.selectedDeviceId] = {
        ...state.selectSensorData[state.selectedDeviceId],
        [type]: data,
      }
    },
    UPDATE_SENSOR_THRESHOLD(state, { deviceId, maxValue, minValue }) {
      const sensorData = state.selectSensorData[deviceId]
      if (sensorData && sensorData.day_stats) {
        sensorData.day_stats.max_value = maxValue
        sensorData.day_stats.min_value = minValue
      }
    },
    CLEAR_SENSOR_DATA(state) {
      state.selectSensorData = {}
    },
    CLEAR_TIME_SERIES_DATA(state, deviceId) {
      if (state.selectSensorData[deviceId]) {
        const periods = ['hourly', 'daily', 'monthly']
        const newData = { ...state.selectSensorData[deviceId] }

        periods.forEach((period) => {
          delete newData[`time_series_${period}`]
        })

        state.selectSensorData[deviceId] = newData
      }
    },
  },

  actions: {
    async fetchDetailDayData({ state, commit, rootState }) {
      const selectedHouse = rootState.house?.selectedHouse.house_id
      commit('SET_LOADING', true)
      try {
        const response = await axios.get(`/detail/${state.selectedDeviceId}`, {
          params: {
            house_id: selectedHouse,
          },
        })

        commit('SET_SENSOR_DATA', {
          type: 'day_stats',
          data: response.data,
        })
        return response.data
      } catch (error) {
        commit('SET_ERROR', error)
        return null
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async fetchDetailData({ commit, state }, period) {
      commit('SET_LOADING', true)

      try {
        const currentPeriod = period || state.currentPeriod || 'hourly'
        const endpoint = `/detail/current/timeframe/${state.selectedDeviceId}`
        const response = await axios.get(endpoint, {
          params: {
            timeframe: currentPeriod,
          },
        })

        if (response.data) {
          commit('SET_SENSOR_DATA', {
            type: `time_series_${currentPeriod}`,
            data: response.data,
          })
        }

        return response.data
      } catch (error) {
        commit('SET_ERROR', error.message)
        console.error('상세 데이터 로딩 중 오류 발생:', error)
        return null
      } finally {
        commit('SET_LOADING', false)
      }
    },

    selectSensor({ commit }, deviceId) {
      commit('SET_SELECTED_SENSOR', deviceId)
    },

    async updateThreshold({ commit, state }, { deviceId, maxValue, minValue }) {
      commit('SET_LOADING', true)
      try {
        const response = await axios.patch(`/detail/range/${deviceId}/`, {
          max_value: maxValue,
          min_value: minValue,
        })

        if (response.data && response.status === 200) {
          commit('UPDATE_SENSOR_THRESHOLD', {
            deviceId,
            maxValue,
            minValue,
          })

          // 임계값 변경 후 현재 센서 값이 새 임계값을 벗어나는지 확인
          const sensorData = state.selectSensorData[deviceId]?.day_stats
          if (sensorData) {
            // 현재 최신 값으로 임계값 체크
            monitoringService.monitorSensorData(deviceId, {
              ...sensorData,
              min_value: minValue,
              max_value: maxValue,
            })
          }

          return response.data
        }
      } catch (error) {
        console.error('임계값 업데이트 실패:', error)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async selectSensorAndLoadData({ commit, dispatch }, deviceId) {
      commit('SET_SELECTED_SENSOR', deviceId)

      await dispatch('fetchDetailDayData')
      await dispatch('fetchDetailData')

      return true
    },

    async updatePeriod({ commit, dispatch, state }, period) {
      commit('SET_CURRENT_PERIOD', period)
      // day_stats를 유지하기 위해 CLEAR_SENSOR_DATA 대신 CLEAR_TIME_SERIES_DATA 사용
      commit('CLEAR_TIME_SERIES_DATA', state.selectedDeviceId)
      await dispatch('fetchDetailData')
    },

    resetDetailData({ commit }) {
      // 선택된 센서 ID 초기화
      commit('SET_SELECTED_SENSOR', null) // Fix mutation name

      // 센서 상세 데이터 초기화 (모든 기간 데이터 포함)
      commit('CLEAR_SENSOR_DATA') // Use CLEAR_SENSOR_DATA to reset all sensor specific data

      // 로딩 상태 및 오류 초기화
      commit('SET_LOADING', false)
      commit('SET_ERROR', null) // Reset error state
      commit('SET_CURRENT_PERIOD', 'hourly') // Optionally reset period to default
    },
  },

  getters: {
    timeSeriesData: (state) => {
      if (!state.selectedDeviceId) return []
      return (
        state.selectSensorData[state.selectedDeviceId]?.[`time_series_${state.currentPeriod}`] || []
      )
    },
  },
}
