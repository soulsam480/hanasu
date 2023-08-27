<script setup lang="ts">
import { useSound } from '@vueuse/sound';
import { ElAvatar, ElBadge, ElButton, ElInput } from 'element-plus';
import { computed, ref, watch } from 'vue';
import PhPaperPlaneTilt from '~icons/ph/paper-plane-tilt-duotone';
import PhClose from '~icons/ph/x-circle-duotone';
import { IMessage, appSettings, appState, localUserId } from '../store/app';
import { dateFormat } from '../utils/date';

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

const chatState = computed(() => appState.chatState);
const chatUser = computed(() => appState.chatUser);

const message = ref('');

function handleMessageChange(value: IMessage[]) {
  if (value.length === 0) return;

  playChatSound();

  const el = document.querySelector('#haansu-chat-container');

  if (el === null) return;

  el.scrollTop = el.scrollHeight;
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

function handleSendMessage() {
  if (
    isChatDisabled.value ||
    localUserId.value === null ||
    message.value.length === 0
  )
    return;

  const payload: IMessage = {
    content: message.value,
    owner: localUserId.value.id,
    timestamp: Date.now(),
  };

  appState.messages.push(payload);

  emit('send-message', payload);

  message.value = '';
  chatInput.value?.focus();
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
      class="p-1 flex-grow overflow-scroll"
      id="haansu-chat-container"
    >
      <div
        :key="message.timestamp"
        v-for="message in appState.messages"
        :class="[
          'flex my-2',
          {
            'justify-end': message.owner === localUserId?.id,
          },
        ]"
      >
        <div
          :class="[
            'flex items-start max-w-[80%] gap-2 bg-gray-100 rounded w-max hover:bg-gray-200 p-2',
            {
              'flex-row-reverse justify-end': message.owner === localUserId?.id,
            },
          ]"
        >
          <el-avatar
            class="flex-shrink-0"
            size="small"
            :src="`https://source.boringavatars.com/pixel/120/${message.owner}?colors=264653,f4a261,e76f51`"
          />

          <div class="flex flex-col">
            <div class="text-xs text-gray-500">
              {{ message.owner === localUserId?.id ? 'me' : chatUser?.name }}
            </div>

            <div class="text-sm">
              {{ message.content }}
            </div>

            <div class="text-[10px] text-gray-400">
              {{ dateFormat(new Date(message.timestamp), 'hh:mm aaa') }}
            </div>
          </div>
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
          <span
            >Please wait for
            <span class="font-semibold text-gray-500">{{
              chatUser?.name
            }}</span>
            to accept request...</span
          >
        </div>

        <el-button
          v-if="chatState === 'sent'"
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

    <div class="flex items-center gap-0.5 p-1 flex-shrink-0">
      <el-input
        ref="chatInput"
        v-model="message"
        class="flex-grow hanasu-chat-input"
        :placeholder="
          isChatDisabled ? 'Connect with someone to continue' : 'Message'
        "
        name="message"
        :disabled="isChatDisabled"
        @keydown.enter="handleSendMessage"
      />

      <el-button
        type="primary"
        plain
        circle
        :disabled="isChatDisabled || message.length === 0"
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
