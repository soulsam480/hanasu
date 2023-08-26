<script setup lang="ts">
import { ElAvatar, ElButton, ElInput } from 'element-plus';
import { computed, ref, toRefs, watch } from 'vue';
import { IMessage, appState, localUserId } from '../store/app';

const emit = defineEmits<{
  (e: 'send-message', message: IMessage): void;
}>();

const { messages, chatState, chatUser } = toRefs(appState);

const message = ref('');

const chatContainerRef = ref<HTMLDivElement | null>(null);

function scrollOnMessage() {
  if (chatContainerRef.value === null) return;

  chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
}

watch(messages, scrollOnMessage, { immediate: true });

const isChatDisabled = computed(
  () =>
    localUserId.value === null ||
    chatState.value !== 'connected' ||
    chatUser.value === null,
);

function handleSendMessage() {
  if (isChatDisabled.value || localUserId.value === null) return;

  const payload: IMessage = {
    content: message.value,
    owner: localUserId.value.id,
    timestamp: Date.now(),
  };

  messages.value.push(payload);

  emit('send-message', payload);

  message.value = '';
}
</script>
<template>
  <div class="relative h-full flex flex-col max-h-full">
    <div class="p-1 flex-grow overflow-scroll">
      <div
        :key="message.timestamp"
        v-for="message in messages"
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
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-0.5 p-1 flex-shrink-0">
      <el-input
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
      >
        <i-ph-paper-plane-tilt-duotone class="text-xs" />
      </el-button>
    </div>
  </div>
</template>

<style>
.hanasu-chat-input .el-input__wrapper {
  @apply rounded-full;
}
</style>
