<script setup lang="ts">
import { useWindowSize } from '@vueuse/core';
import { ElButton, ElDialog, ElDrawer } from 'element-plus';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import ChatArea from './components/ChatArea.vue';
import InitModal from './components/InitModal.vue';
import SettingsDrawer from './components/SettingsDrawer.vue';
import UsersList from './components/UsersList.vue';
import { appState, localUserId } from './store/app';
import { usePeer } from './store/peer';
import { IUser, createConnection, wsState } from './store/ws';

const { width } = useWindowSize();

function handleConnInit(userId: Omit<IUser, 'connectedAt'>) {
  appState.isDrawerOpen = false;

  createConnection(userId);
}

onMounted(() => {
  if (localUserId.value !== null) {
    appState.isDrawerOpen = false;
    handleConnInit(localUserId.value);
  }
});

const { makeCall, chatState, sendMessage, chatUser, peer } = usePeer();

function handleUserCall(user: IUser) {
  if (chatState.value !== 'disconnected') {
    if (chatState.value === 'connected' && user.id !== chatUser.value?.id) {
      isOverwritingWithUser.value = user;
    }

    return;
  }

  appState.isDrawerOpen = false;
  makeCall(user);
}

onBeforeUnmount(() => {
  appState.peer?.destroy();
});

const isOverwritingWithUser = ref<IUser | null>(null);

function handleOverwriteChat() {
  peer.value?.destroy();

  const newUser = isOverwritingWithUser.value;
  isOverwritingWithUser.value = null;

  window.setTimeout(() => {
    if (newUser !== null) {
      handleUserCall(newUser);
    }
  }, 500);
}

function handleCloseChat(e: MouseEvent) {
  e.stopPropagation();

  peer.value?.destroy();
}
</script>

<template>
  <main class="h-full w-full flex items-center justify-center">
    <init-modal
      :open="localUserId === null || wsState.state === 'disconnected'"
      @submit="handleConnInit"
    />

    <div
      class="md:w-4/5 lg:w-7/12 md:h-2/3 h-full w-full relative border border-gray-200 rounded flex flex-col divide-y"
      id="drawer-target"
    >
      <!-- header -->
      <div class="p-3 flex items-center gap-2 justify-between">
        <div class="bold text-base">Hanasu</div>

        <div class="inline-flex gap-2 items-center">
          <el-button
            size="default"
            class="md:hidden"
            type="primary"
            circle
            @click="appState.isDrawerOpen = !appState.isDrawerOpen"
          >
            <i-ph-chat-teardrop-duotone class="text-xs" />
          </el-button>

          <el-button
            circle
            plain
            @click="
              appState.isSettingsDrawerOpen = !appState.isSettingsDrawerOpen
            "
          >
            <i-ph-dots-three-outline-vertical-thin class="text-xs" />
          </el-button>
        </div>
      </div>

      <!-- body -->
      <div
        class="h-full overflow-hidden grid grid-cols-5 divide-x divide-gray-200 relative"
      >
        <div v-if="width > 768" class="col-span-2 hidden md:block">
          <users-list
            :users="wsState.users"
            @call-user="handleUserCall"
            @close-chat="handleCloseChat"
          />
        </div>

        <div class="col-span-5 md:col-span-3 overflow-scroll">
          <chat-area
            @send-message="sendMessage"
            @close-chat="handleCloseChat"
          />
        </div>
      </div>

      <!-- footer -->
      <div class="p-1 md:p-3 text-center text-xs text-gray-400">
        MIT License. &copy; Sambit Sahoo {{ new Date().getFullYear() }}
        <a class="underline" href="https://github.com/soulsam480/hanasu"
          >source</a
        >
      </div>
    </div>

    <template v-if="width <= 768">
      <el-drawer
        v-model="appState.isDrawerOpen"
        size="250px"
        direction="ltr"
        :show-close="false"
        :with-header="false"
      >
        <users-list @call-user="handleUserCall" :users="wsState.users" />
      </el-drawer>
    </template>

    <el-drawer
      v-model="appState.isSettingsDrawerOpen"
      size="300px"
      direction="rtl"
      :with-header="false"
    >
      <settings-drawer />
    </el-drawer>

    <el-dialog
      :model-value="isOverwritingWithUser !== null"
      width="400px"
      @close="isOverwritingWithUser = null"
      title="Close current chat ?"
    >
      <div class="flex flex-col gap-4">
        <div class="text-sm">
          You're currently in a chat with
          <span class="font-semibold">{{ chatUser?.name }}</span> and you're
          trying to call
          <span class="font-semibold"> {{ isOverwritingWithUser?.name }} </span
          >. If you continue, your current chat will be closed.
        </div>

        <div class="flex items-center gap-2 justify-end">
          <el-button type="danger" @click="handleOverwriteChat">
            <div class="inline-flex gap-2 items-center">
              <i-ph-check-circle-duotone />
              <span>Continue</span>
            </div>
          </el-button>

          <el-button type="success" @click="isOverwritingWithUser = null">
            <div class="inline-flex gap-2 items-center">
              <i-ph-x-circle-duotone />
              <span> Cancel </span>
            </div>
          </el-button>
        </div>
      </div>
    </el-dialog>
  </main>
</template>
