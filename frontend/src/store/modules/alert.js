import axios from '@/plugins/axios'

export default {
  namespaced: true,

  state: {
    alerts: {},
    currentDeviceAlerts: {},
    loading: false,
    error: null,
  },

  mutations: {
    SET_ALERTS(state, alerts) {
      state.alerts = alerts
    },
    SET_DEVICE_ALERTS(state, currentDeviceAlerts) {
      state.currentDeviceAlerts = currentDeviceAlerts
    },
    SET_LOADING(state, status) {
      state.loading = status
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    ADD_ALERT(state, alert) {
      // 배열인지 확인하고 추가
      if (Array.isArray(state.alerts)) {
        state.alerts = [alert, ...state.alerts]
      } else {
        state.alerts = [alert]
      }

      // 디바이스 별 알림도 업데이트
      if (alert.device_id && Array.isArray(state.currentDeviceAlerts)) {
        state.currentDeviceAlerts = [alert, ...state.currentDeviceAlerts]
      }
    },
    // 알림 초기화 뮤테이션 추가
    CLEAR_ALERTS(state) {
      state.currentDeviceAlerts = {}
    },

    CLEAR_ALL_ALERTS(state) {
      state.alerts = {}
      state.currentDeviceAlerts = {}
    },
  },

  actions: {
    async fetchAlerts({ commit, rootState }) {
      const selectedHouse = rootState.house?.selectedHouse.house_id

      commit('SET_LOADING', true)
      try {
        const response = await axios.get(`/alert/${selectedHouse}`)
        commit('SET_ALERTS', response.data)
      } catch (error) {
        commit('SET_ERROR', error)
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async fetchDeviceAlerts({ commit, rootState }, deviceId) {
      try {
        const selectedHouse = rootState.house?.selectedHouse.house_id

        // 하우스나 장치 ID가 없으면 API 호출 자체를 스킵
        if (!selectedHouse || !deviceId) {
          commit('SET_DEVICE_ALERTS', [])
          return []
        }

        const response = await axios.get(`/alert/device/${deviceId}`, {
          params: {
            house_id: selectedHouse,
          },
          // 추가 설정: 이 요청에서 발생하는 오류는 글로벌 핸들러로 전달하지 않음
          silentError: true,
        })

        if (response.data) {
          commit('SET_DEVICE_ALERTS', response.data)
          return response.data
        }
        return []
      } catch (error) {
        // 오류 발생 시 상태 초기화만 하고 로그는 남기지 않음
        commit('SET_DEVICE_ALERTS', [])
        return []
      }
    },

    async createAlert({ commit }, alertData) {
      commit('SET_LOADING', true)
      try {
        const response = await axios.post('/alert', alertData)

        if (response.data && response.status === 201) {
          commit('ADD_ALERT', response.data)
          return response.data
        }
      } catch (error) {
        commit('SET_ERROR', error)
        console.error('알림 생성 실패:', error)
      } finally {
        commit('SET_LOADING', false)
      }
    },
    // 현재 디바이스 알림 초기화 액션 추가
    clearAlerts({ commit }) {
      commit('CLEAR_ALERTS')
    },

    // 모든 알림 초기화 액션 추가
    clearAllAlerts({ commit }) {
      commit('CLEAR_ALL_ALERTS')
    },
  },
}
