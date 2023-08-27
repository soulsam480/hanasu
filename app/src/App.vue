<script setup lang="ts">
import { IUser } from '@hanasu/shared';
import { useWindowSize } from '@vueuse/core';
import { ElButton, ElDialog, ElDrawer } from 'element-plus';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import PhChat from '~icons/ph/chat-teardrop-duotone';
import PhThreeDots from '~icons/ph/dots-three-outline-vertical-thin';
import ChatArea from './components/ChatArea.vue';
import InitModal from './components/InitModal.vue';
import SettingsDrawer from './components/SettingsDrawer.vue';
import UsersList from './components/UsersList.vue';
import { appState, localUserId } from './store/app';
import { usePeer } from './store/peer';
import { createConnection, wsState } from './store/ws';

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

const {
  chatState,
  chatUser,
  peer,
  makeCall,
  sendMessage,
  cancelOutgoingCall,
  closeChat,
} = usePeer();

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
  wsState.conn?.close();
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

  closeChat();
}
</script>

<template>
  <main class="h-full w-full flex items-center justify-center">
    <init-modal :open="localUserId === null" @submit="handleConnInit" />

    <div
      class="md:w-4/5 lg:w-7/12 md:h-2/3 h-full w-full relative border border-gray-200 rounded flex flex-col divide-y"
      id="drawer-target"
    >
      <!-- header -->
      <div class="p-3 flex items-center gap-2 justify-between">
        <div class="inline-flex gap-1 items-center">
          <span class="p-1 rounded-full border border-gray-200">
            <i-ph-microphone-stage-duotone class="text-xs text-gray-500" />
          </span>
          <div class="bold text-base">Hanasu</div>
        </div>

        <div class="inline-flex gap-2 items-center">
          <el-button
            size="default"
            class="md:hidden"
            type="primary"
            circle
            @click="appState.isDrawerOpen = !appState.isDrawerOpen"
            :icon="PhChat"
          />

          <el-button
            circle
            plain
            type="primary"
            @click="
              appState.isSettingsDrawerOpen = !appState.isSettingsDrawerOpen
            "
            :icon="PhThreeDots"
          />
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
            @cancel-call="cancelOutgoingCall"
          />
        </div>
      </div>

      <!-- footer -->
      <div
        class="p-1 md:p-3 text-xs text-gray-400 inline-flex items-center justify-center gap-2"
      >
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
