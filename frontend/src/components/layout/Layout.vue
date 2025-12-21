<template>
  <div class="layout">
    <AsideComponent />

    <div class="main-content">
      <HeaderComponent />
      <div class="content-container">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<script setup>
import AsideComponent from '@/components/common/AsideComponent.vue'
import HeaderComponent from '@/components/common/HeaderComponent.vue'
</script>

<style lang="scss" scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: var(--body-bg-color);

  .main-content {
    flex: 1;
    margin-left: var(--aside-width);
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .content-container {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      margin: 0;
      height: calc(100vh - var(--header-height));
    }
  }
}
</style>
