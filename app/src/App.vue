<script setup lang="ts">
import { useWindowSize } from '@vueuse/core';
import { ElButton, ElDrawer } from 'element-plus';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import InitModal from './components/InitModal.vue';
import UsersList from './components/UsersList.vue';
import { appState, localUserId } from './store/app';
import { usePeer } from './store/peer';
import { IUser, createConnection, wsState } from './store/ws';

const { width } = useWindowSize();

const initModalOpen = ref(false);

function handleConnInit(userId: Omit<IUser, 'connectedAt'>) {
  initModalOpen.value = false;

  createConnection(userId);
}

onMounted(() => {
  if (localUserId.value !== null) {
    initModalOpen.value = false;
    handleConnInit(localUserId.value);
  }
});

const { makeCall, chatState } = usePeer();

function handleUserCall(user: IUser) {
  if (chatState.value !== 'disconnected') return;

  makeCall(user);
}

onBeforeUnmount(() => {
  appState.peer?.destroy();
});
</script>

<template>
  <main class="h-full w-full flex items-center justify-center">
    <init-modal
      :open="localUserId === null || wsState.state === 'disconnected'"
      @submit="handleConnInit"
    />

    <div
      class="md:w-4/5 lg:w-7/12 md:h-2/3 h-full w-full relative border border-gray-200 rounded flex flex-col divide-y overflow-hidden"
      id="drawer-target"
    >
      <!-- header -->
      <div class="p-3 flex items-center gap-2">
        <div class="bold text-lg">Hanasu</div>
      </div>

      <!-- body -->
      <div class="flex-grow grid grid-cols-5 divide-x divide-gray-200 relative">
        <div v-if="width > 768" class="col-span-2 hidden md:block">
          <users-list :users="wsState.users" @call-user="handleUserCall" />
        </div>

        <div class="col-span-5 md:col-span-3">Hello</div>

        <div class="absolute bottom-4 right-4 z-10 !border-0">
          <el-button
            size="large"
            class="md:hidden"
            type="primary"
            circle
            @click="initModalOpen = !initModalOpen"
          >
            <i-ph-chat-teardrop-duotone />
          </el-button>
        </div>
      </div>

      <!-- footer -->
      <div class="p-3">Copy right &copy; {{ new Date().getFullYear() }}</div>
    </div>

    <template v-if="width <= 768">
      <el-drawer
        v-model="initModalOpen"
        size="250px"
        direction="ltr"
        :show-close="false"
        :with-header="false"
      >
        <users-list :users="wsState.users" />
      </el-drawer>
    </template>
  </main>
</template>
