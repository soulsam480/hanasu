<script setup lang="ts">
import { ElButton, ElDrawer } from 'element-plus';
import { onMounted, ref } from 'vue';
import InitModal from './components/InitModal.vue';
import UsersList from './components/UsersList.vue';
import { createConnection, wsState } from './composables/useWs';
import { ILocalUserId, localUserId } from './store/app';

const initModalOpen = ref(false);

function handleConnInit(userId: ILocalUserId) {
  initModalOpen.value = false;

  createConnection(userId);
}

onMounted(() => {
  if (localUserId.value !== null) {
    initModalOpen.value = false;
    handleConnInit(localUserId.value);
  }
});
</script>

<template>
  <main class="main">
    <init-modal
      :open="localUserId === null || wsState.state === 'disconnected'"
      @submit="handleConnInit"
    />

    <div
      class="container relative border border-gray-200 rounded flex flex-col divide-y overflow-hidden"
      id="drawer-target"
    >
      <!-- header -->
      <div class="p-3">
        <div class="bold">Hanasu</div>

        <el-button class="sm:hidden" @click="initModalOpen = !initModalOpen"
          >Open</el-button
        >
      </div>

      <!-- body -->
      <div class="flex-grow grid grid-cols-5 divide-x divide-gray-200">
        <div class="col-span-2 hidden sm:block">
          <users-list :users="wsState.users" />
        </div>

        <div class="col-span-3">Hello</div>
      </div>

      <!-- footer -->
      <div class="p-3">Copy right &copy; {{ new Date().getFullYear() }}</div>
    </div>

    <el-drawer v-model="initModalOpen" size="250px" direction="ltr">
      <div>Hello</div>
    </el-drawer>
  </main>
</template>

<style lang="scss">
.main {
  @apply h-full w-full flex items-center justify-center;
}

.container {
  @apply sm:w-2/3 sm:h-2/3 h-full w-full;
}
</style>
