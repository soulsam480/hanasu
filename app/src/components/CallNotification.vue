<script setup lang="ts">
import { ElButton, ElNotification } from 'element-plus';
import PhChat from '~icons/ph/chat-teardrop-duotone';
import PhSkull from '~icons/ph/skull-duotone';
import { appState } from '../store/app';
import { usePeer } from '../store/peer';

type TCallNotificationType =
  | 'outgoing'
  | 'incoming'
  | 'accepted'
  | 'rejected'
  | 'cancelled';

defineProps<{
  message: string;
  subMessage?: string;
  type: TCallNotificationType;
}>();

const { acceptCall, rejectCall } = usePeer();

function handleAcceptCall() {
  if (appState.incomingCall !== null) {
    acceptCall(appState.incomingCall);
  }

  ElNotification.closeAll();
}

function handleRejectCall() {
  if (appState.incomingCall !== null) {
    rejectCall(appState.incomingCall);
  }

  ElNotification.closeAll();
}
</script>
<template>
  <div class="flex flex-col gap-2">
    <div class="text-sm bold inline-flex gap-2 items-center">
      <i-ph-chat-teardrop-dots-duotone
        class="text-blue-400"
        v-if="type === 'outgoing'"
      />

      <i-ph-chat-teardrop-duotone
        class="text-blue-400"
        v-if="type === 'incoming'"
      />

      <i-ph-chats-teardrop-duotone
        class="text-green-400"
        v-if="type === 'accepted'"
      />

      <i-ph-skull-duotone class="text-red-400" v-if="type === 'rejected'" />

      <i-ph-smiley-sad-duotone
        class="text-orange-400"
        v-if="type === 'cancelled'"
      />

      <span>{{ message }}</span>
    </div>

    <div v-if="subMessage !== undefined" class="text-[8px] text-gray-400">
      {{ subMessage }}
    </div>

    <template v-if="type === 'incoming'">
      <div class="flex items-center gap-2">
        <el-button
          size="small"
          type="primary"
          @click="handleAcceptCall"
          :icon="PhChat"
        >
          Accept
        </el-button>

        <el-button
          type="danger"
          size="small"
          @click="handleRejectCall"
          :icon="PhSkull"
          >Decline
        </el-button>
      </div>
    </template>
  </div>
</template>
