import axios from '@/plugins/axios'

export default {
  namespaced: true,

  state: {
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    profile_image: '',
    last_login: '',
    created_at: '',
    email_notifications: '',
    sms_notifications: '',
    push_notifications: '',
    userDevices: [],
    loading: false,
    error: null,
    userId: 1,
  },

  mutations: {
    SET_USER(state, user) {
      Object.assign(state, user)
    },
    SET_USER_DEVICES(state, userDevices) {
      state.userDevices = userDevices
    },
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    UPDATE_NOTIFICATION(state, { type, value }) {
      state[`${type}_notifications`] = value
    },
  },

  actions: {
    async fetchUserProfile({ commit, state }) {
      try {
        const response = await axios.get(`/user/${state.userId}`)
        commit('SET_USER', response.data)
      } catch (error) {
        console.error('사용자 정보 조회 실패:', error)
        throw error
      }
    },
    async fetchUserDevices({ commit, state }) {
      try {
        const response = await axios.get(`/user/device/${state.userId}`)
        commit('SET_USER_DEVICES', response.data)
      } catch (error) {
        console.error('사용자 정보 조회 실패:', error)
        throw error
      }
    },
    async updateNotificationSettings({ commit, state }, { type, value }) {
      try {
        const response = await axios.patch(`/user/notifications/${state.userId}`, {
          type,
          value,
        })
        commit('UPDATE_NOTIFICATION', { type, value })

        return response.data
      } catch (error) {
        console.error('알림 설정 업데이트 실패:', error)
        throw error
      }
    },
  },

  getters: {},

  modules: {},
}
