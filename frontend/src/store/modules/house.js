import axios from '@/plugins/axios'

export default {
  namespaced: true,

  state: {
    houses: {},
    selectedHouse: null,
    loading: false,
    error: null,
    userId: 1,
  },

  mutations: {
    SET_HOUSES(state, houses) {
      state.houses = houses
    },
    SET_SELECTED_HOUSE(state, house) {
      state.selectedHouse = house
    },
    SET_LOADING(state, status) {
      state.loading = status
    },
    SET_ERROR(state, error) {
      state.error = error
    },
  },

  actions: {
    async fetchHouses({ commit, state }) {
      try {
        commit('SET_LOADING', true)
        const response = await axios.get(`/house/${state.userId}`)
        if (typeof response.data === 'object' && response.data !== null) {
          commit('SET_HOUSES', response.data)
        } else {
          console.error('API 응답이 객체가 아닙니다:', response.data)
          commit('SET_HOUSES', {})
        }
      } catch (error) {
        commit('SET_ERROR', error.message)
        console.error('하우스 목록 조회 실패:', error)
        commit('SET_HOUSES', {})
      } finally {
        commit('SET_LOADING', false)
      }
    },

    selectHouse({ commit }, house) {
      commit('SET_SELECTED_HOUSE', house)
    },
  },
}
