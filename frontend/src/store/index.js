import { createStore } from 'vuex'
import user from './modules/user'
import detail from './modules/detail'
import house from './modules/house'
import sensor from './modules/sensor'
import alert from './modules/alert'

export default createStore({
  modules: {
    user,
    detail,
    house,
    sensor,
    alert,
  },
})
