<script setup lang="ts">
import { useSound } from '@vueuse/sound';
import {
  ElAvatar,
  ElBadge,
  ElButton,
  ElImage,
  ElInput,
  ElPopover,
} from 'element-plus';
import { computed, ref, watch } from 'vue';
import PhImageSquareDuotone from '~icons/ph/image-square-duotone';
import PhLinkSimpleDuotone from '~icons/ph/link-simple-duotone';
import PhPaperPlaneTilt from '~icons/ph/paper-plane-tilt-duotone';
import PhClose from '~icons/ph/x-circle-duotone';
import { useImageAsset } from '../composables/useImageAsset';
import { IMessage, appSettings, appState, localUserId } from '../store/app';
import ChatMessage from './ChatMessage.vue';

const emit = defineEmits<{
  (e: 'send-message', message: IMessage): void;
  (e: 'close-chat', event: MouseEvent): void;
  (e: 'cancel-call'): void;
}>();

const chatSoundFile = computed(() => appSettings.value.chatSoundFile);
const chatSoundVolume = computed(() => appSettings.value.chatSoundVolume);

const { play } = useSound(chatSoundFile, { volume: chatSoundVolume });

function playChatSound() {
  if (appSettings.value.chatSounds) {
    play({ forceSoundEnabled: true });
  }
}

const {
  open,
  imageAsFileURL,
  reset,
  imageFile,
  toBase64Image,
  isLoading: isProcessingImage,
} = useImageAsset();

const chatState = computed(() => appState.chatState);
const chatUser = computed(() => appState.chatUser);
const userRole = computed(() => appState.userRole);

const message = ref('');

function handleMessageChange(value: IMessage[]) {
  if (value.length === 0) return;

  playChatSound();

  // account for suspense
  window.setTimeout(() => {
    const chatContainer = document.querySelector<HTMLElement>(
      '#hanasu-chat-messages',
    );

    if (chatContainer === null) return;

    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, 100);
}

watch(() => appState.messages, handleMessageChange, {
  flush: 'post',
  deep: true,
});

const isChatDisabled = computed(
  () =>
    localUserId.value === null ||
    chatState.value !== 'connected' ||
    chatUser.value === null,
);

const chatInput = ref<typeof ElInput | null>(null);

async function handleSendMessage() {
  if (
    isChatDisabled.value ||
    localUserId.value === null ||
    (message.value.length === 0 && imageFile.value === null)
  )
    return;

  const payload: IMessage = {
    content:
      imageFile.value !== null
        ? await toBase64Image(imageFile.value)
        : message.value,
    owner: localUserId.value.id,
    timestamp: Date.now(),
  };

  appState.messages.push(payload);
  emit('send-message', payload);

  reset();
  message.value = '';
  chatInput.value?.focus();
}

function handleAssetClick() {
  open();
}
</script>
<template>
  <div class="relative h-full flex flex-col max-h-full">
    <div
      v-if="chatUser !== null"
      class="p-2 bg-gray-200 rounded-b-md md:hidden"
    >
      <el-badge
        is-dot
        :type="
          chatState === 'connected'
            ? 'success'
            : chatState === 'connecting' || chatState === 'sent'
            ? 'warning'
            : 'danger'
        "
        class="w-full inline-flex items-center gap-2"
      >
        <el-avatar
          size="small"
          :src="`https://source.boringavatars.com/pixel/120/${chatUser.id}?colors=264653,f4a261,e76f51`"
        />

        <div class="text-sm">
          {{ chatUser.name }}
        </div>

        <el-button
          v-if="chatState === 'connected'"
          size="small"
          title="Close chat"
          class="ml-auto"
          @click="$emit('close-chat', $event)"
          type="danger"
          circle
          :icon="PhClose"
        />
      </el-badge>
    </div>

    <div
      v-if="chatState === 'connected'"
      :class="[
        'p-1 overflow-scroll flex flex-col gap-2',
        appState.messages.length !== 0 ? 'mt-auto' : 'h-full',
      ]"
      id="hanasu-chat-messages"
    >
      <template v-if="appState.messages.length !== 0">
        <chat-message
          :key="message.timestamp"
          v-for="message in appState.messages"
          :message="message"
          :is-owner="message.owner === localUserId?.id"
          :chat-user-name="chatUser?.name ?? ''"
          v-memo="[message.timestamp, message.owner === localUserId?.id]"
        />
      </template>

      <div v-else class="h-full flex flex-col justify-center mx-auto gap-2">
        <div class="flex items-center gap-2 text-sm text-gray-400">
          <span>You can only talk to one </span>
          <i-ph-user-circle-gear-duotone />
          <span> person at a time</span>
        </div>

        <div class="flex items-center gap-2 text-sm text-gray-400">
          <span>Click on the image </span> <PhImageSquareDuotone />
          <span> button to send an image</span>
        </div>

        <div class="flex items-center gap-2 text-sm text-gray-400">
          <span>Links </span> <ph-link-simple-duotone />
          <span> are auto anchored</span>
        </div>
      </div>
    </div>

    <div v-else class="h-full flex items-center justify-center">
      <div
        v-if="chatState === 'connecting' || chatState === 'sent'"
        class="flex flex-col gap-2"
      >
        <div class="text-sm text-gray-400 inline-flex gap-2 items-center">
          <i-ph-spiral-duotone class="animate-spin" />

          <span v-if="userRole === 'caller'"
            >Please wait for
            <span class="font-semibold text-gray-500">{{
              chatUser?.name
            }}</span>
            to accept request</span
          >

          <span v-else>
            Accepted
            <span class="font-semibold text-gray-500"
              >{{ chatUser?.name }}'s</span
            >
            request. Waiting for connection</span
          >
        </div>

        <el-button
          v-if="userRole === 'caller' && chatState === 'sent'"
          class="self-center"
          size="small"
          type="danger"
          :icon="PhClose"
          @click="$emit('cancel-call')"
        >
          Cancel
        </el-button>
      </div>

      <div v-else class="text-sm text-gray-500 inline-flex gap-2">
        <i-ph-chats-teardrop-duotone />

        <span>Send a chat request to someone to start chatting!</span>
      </div>
    </div>

    <div class="flex items-center gap-1 p-1 flex-shrink-0">
      <el-input
        ref="chatInput"
        v-model="message"
        class="flex-grow hanasu-chat-input"
        :placeholder="
          isChatDisabled ? 'Connect with someone to continue' : 'Message'
        "
        name="message"
        :disabled="isChatDisabled || imageAsFileURL !== null"
        @keydown.enter="handleSendMessage"
      />

      <el-popover
        :visible="imageAsFileURL !== null"
        placement="top"
        :width="250"
      >
        <div class="flex flex-col gap-3">
          <el-image
            v-if="imageAsFileURL !== null"
            style="width: 226px; height: 226px"
            :src="imageAsFileURL"
            fit="cover"
          />

          <div class="flex items-center gap-2 justify-end">
            <el-button
              class="!ml-0"
              type="danger"
              plain
              size="small"
              :icon="PhClose"
              @click="reset"
              >Cancel</el-button
            >

            <el-button
              class="!ml-0"
              type="primary"
              plain
              size="small"
              @click="handleSendMessage"
              :icon="PhPaperPlaneTilt"
              :loading="isProcessingImage"
              >Send</el-button
            >
          </div>
        </div>

        <template #reference>
          <el-button
            :icon="PhImageSquareDuotone"
            @click="handleAssetClick"
            type="primary"
            plain
            circle
            :disabled="isChatDisabled || imageAsFileURL !== null"
            :loading="isProcessingImage"
          />
        </template>
      </el-popover>

      <el-button
        class="!ml-0"
        type="primary"
        plain
        circle
        :disabled="
          isChatDisabled || message.length === 0 || imageAsFileURL !== null
        "
        @click="handleSendMessage"
        :icon="PhPaperPlaneTilt"
      />
    </div>
  </div>
</template>

<style>
.hanasu-chat-input .el-input__wrapper {
  @apply rounded-full;
}
</style>
