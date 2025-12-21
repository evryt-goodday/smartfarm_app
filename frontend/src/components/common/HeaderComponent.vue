<script setup>
import { useStore } from 'vuex'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import toast from '@/utils/toast'

const store = useStore()
const router = useRouter()

const profileStyle = computed(() => ({
  backgroundImage: `url(${store.state.user.profile_image})`,
}))

const houses = computed(() => store.state.house.houses || {})
const selectedHouse = computed(() => store.state.house.selectedHouse)
const selectedHouseId = computed({
  get: () => selectedHouse.value?.house_id || '',
  set: (value) => handleHouseChange(value),
})

// 로고 클릭 시 홈으로 이동하는 함수
const goToHome = () => {
  router.push('/')
}

const handleHouseChange = (value) => {
  if (!houses.value) {
    console.error('하우스 목록이 유효하지 않습니다:', houses.value)
    return
  }

  // 다른 하우스 선택 시 데이터 초기화
  if (selectedHouseId.value !== value) {
    // Vuex Store 직접 접근하여 상태 초기화 (mutation 오류 방지)
    if (store.state.sensor) {
      store.state.sensor.sensorList = {}
      store.state.sensor.sensorRealtime = {}
      store.state.sensor.loading = false
    }

    if (store.state.detail) {
      store.state.detail.selectedDeviceId = null
      store.state.detail.selectSensorData = {}
      store.state.detail.periodData = []
      store.state.detail.loading = false
    }

    if (store.state.alert) {
      // clearAlerts 액션은 정상 작동하므로 그대로 사용
      store.dispatch('alert/clearAlerts')
    }
  }

  const house = houses.value[value]
  if (house) {
    // 센서, 알림, 상세 데이터 초기화 (필요한 경우)
    store.dispatch('sensor/resetSensorData').catch((e) => console.error('센서 초기화 오류:', e))
    store.dispatch('alert/clearAlerts').catch((e) => console.error('알림 초기화 오류:', e))
    store.dispatch('detail/resetDetailData').catch((e) => console.error('상세 초기화 오류:', e))

    // 하우스 선택 액션 호출
    store.dispatch('house/selectHouse', house)
    toast.houseSelected(house.name)
  }
}

onMounted(async () => {
  try {
    await store.dispatch('house/fetchHouses')
  } catch (error) {
    console.error('하우스 목록 로딩 실패:', error)
  }
})
</script>

<template>
  <header class="header">
    <div class="wrapper">
      <nav class="main-nav">
        <div class="service-title" @click="goToHome" role="button">스마트팜 관리 시스템</div>
        <div>선택된 하우스 :</div>
        <select class="house-selector" v-model="selectedHouseId">
          <option value="">하우스 선택</option>
          <option v-for="(house, id) in houses" :key="id" :value="id">
            {{ house.name }}
          </option>
        </select>
        <RouterLink to="/profile" class="profile-link" :style="profileStyle" />
      </nav>
    </div>
  </header>
</template>

<style lang="scss" scoped>
header {
  height: var(--header-height);
  padding: 0 20px;
  background-color: var(--item-bg-white);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);

  .wrapper {
    display: flex;
    justify-content: space-between;
    height: 100%;

    .main-nav {
      display: flex;
      align-items: center;
      width: 100%;

      .service-title {
        flex: 1;
        font-size: 1.1em;
        font-weight: bold;
        color: #2c3e50;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          color: var(--item-blue-color);
        }
      }

      .house-selector {
        margin-left: 10px;
        background-color: var(--item-bg-lighter);
        border: none;
        border-radius: var(--default-border-radius);
        padding: 8px 15px;
        font-size: 0.9em;
        color: #2c3e50;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

        &:hover {
          background-color: #eff2f7;
          transform: translateY(-2px);
        }

        &:focus {
          outline: none;
          background-color: #eff2f7;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
      }

      option {
        padding: 8px;
        background-color: var(--item-bg-white);
        color: #2c3e50;
      }

      .profile-link {
        width: 38px;
        height: 38px;
        margin-left: 15px;
        padding: 5px;
        border-radius: 50%;
        background-repeat: no-repeat;
        background-position: center;
        background-size: cover;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        border: 3px solid white;
        transition: all 0.2s ease;

        &:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }
      }
    }
  }
}
</style>
