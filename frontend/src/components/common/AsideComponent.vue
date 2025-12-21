<script setup>
import DetailIcon from '@/assets/icons/aside/detail.svg'
import HomeIcon from '@/assets/icons/aside/home.svg'
import ChartIcon from '@/assets/icons/aside/chart.svg'
import SettingIcon from '@/assets/icons/common/setting.svg'
import { useStore } from 'vuex'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const store = useStore()
const router = useRouter()

const deviceId = computed(() => store.state.detail.selectedDeviceId)
const sensorList = computed(() => store.state.sensor.sensorList)

const goToHome = () => {
  router.push('/')
}
</script>

<template>
  <aside>
    <div class="logo" @click="goToHome">
      <h1>스마트팜</h1>
    </div>

    <div class="menu">
      <RouterLink to="/" class="menu-item">
        <img :src="HomeIcon" width="24" height="24" alt="home" />
        <span>홈</span>
      </RouterLink>

      <RouterLink to="/chart" class="menu-item">
        <img :src="ChartIcon" width="24" height="24" alt="chart" />
        <span>차트</span>
      </RouterLink>

      <RouterLink :to="deviceId ? `/detail/${deviceId}` : '/detail/1'" class="menu-item">
        <img :src="DetailIcon" width="24" height="24" alt="detail" />
        <span>상세정보</span>
      </RouterLink>
    </div>

    <!-- 설정 메뉴를 분리하여 하단에 배치 -->
    <div class="bottom-menu">
      <RouterLink to="/setting" class="menu-item">
        <img :src="SettingIcon" width="24" height="24" alt="setting" />
        <span>설정</span>
      </RouterLink>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
aside {
  width: var(--aside-width);
  height: 100vh;
  background-color: var(--item-bg-white);
  position: fixed;
  left: 0;
  top: 0;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.03);
  z-index: 10;
  display: flex;
  flex-direction: column;

  .logo {
    height: var(--header-height);
    display: flex;
    justify-content: center;
    align-items: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--item-bg-lighter);
    }

    h1 {
      display: block;
      width: 45px;
      height: 45px;
      text-indent: -9999px;
      background-size: cover;
      background-repeat: no-repeat;
      background-position: center;
      background-image: var(--logo-image);
    }
  }

  .menu {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 30px 15px;
    gap: 20px;
    flex: 1;

    .menu-item {
      margin-bottom: 5px;
      text-decoration: none;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 15px 0;
      border-radius: var(--default-border-radius);
      color: #7f8c8d;
      transition: all 0.2s ease;

      img {
        filter: opacity(0.7);
        transition: all 0.2s ease;
      }

      span {
        margin-top: 8px;
        font-size: 12px;
        text-align: center;
      }

      &:hover {
        background-color: var(--item-bg-lighter);
        transform: translateY(-2px);
        color: var(--item-blue-color);

        img {
          filter: opacity(1) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.1));
        }
      }

      &.router-link-active {
        background-color: var(--item-bg-lighter);
        color: var(--item-blue-color);
        font-weight: bold;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);

        img {
          filter: opacity(1) drop-shadow(0 2px 3px rgba(52, 152, 219, 0.3));
        }
      }
    }
  }

  /* 하단 메뉴 스타일 추가 */
  .bottom-menu {
    padding: 15px;
    margin-bottom: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;

    .menu-item {
      margin-bottom: 5px;
      text-decoration: none;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 15px 0;
      border-radius: var(--default-border-radius);
      color: #7f8c8d;
      transition: all 0.2s ease;

      img {
        filter: opacity(0.7);
        transition: all 0.2s ease;
      }

      span {
        margin-top: 8px;
        font-size: 12px;
        text-align: center;
      }

      &:hover {
        background-color: var(--item-bg-lighter);
        transform: translateY(-2px);
        color: var (--item-blue-color);

        img {
          filter: opacity(1) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.1));
        }
      }

      &.router-link-active {
        background-color: var(--item-bg-lighter);
        color: var(--item-blue-color);
        font-weight: bold;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);

        img {
          filter: opacity(1) drop-shadow(0 2px 3px rgba(52, 152, 219, 0.3));
        }
      }
    }
  }
}
</style>
