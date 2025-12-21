<script setup>
import { useStore } from 'vuex'
import { onMounted, ref } from 'vue'

const store = useStore()
const isLoading = ref(false)
const error = ref(null)

import Layout from '@/components/layout/Layout.vue'

const fetchProfile = async () => {
  try {
    isLoading.value = true
    await store.dispatch('user/fetchUserProfile')
  } catch (err) {
    error.value = '프로필 정보를 불러오는데 실패했습니다.'
    console.error('프로필 로딩 에러:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div>
    <Layout />
  </div>
</template>
