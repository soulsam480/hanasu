<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import {
  ElButton,
  ElInput,
  ElNotification,
  ElOption,
  ElSelect,
  ElSlider,
  ElSwitch,
} from 'element-plus';
import { computed, h, ref, watch, watchEffect } from 'vue';
import PhShareNetworkDuotone from '~icons/ph/share-network-duotone';
import PhSkullDuotone from '~icons/ph/skull-duotone';
import PhClose from '~icons/ph/x-circle-duotone';
import { appSettings, appState, localUserId } from '../store/app';
import { wsState } from '../store/ws';

function handleReset() {
  localUserId.value = null;
  appState.isSettingsDrawerOpen = false;

  appState.peer?.destroy();
  wsState.conn?.close();
}

const CHAT_SOUNDS = [
  {
    label: 'Sudden',
    value: '/chat-sound-1.mp3',
  },
  {
    label: 'Apple',
    value: '/chat-sound-2.mp3',
  },
  {
    label: 'Android charge',
    value: '/chat-sound-3.mp3',
  },
];

watch(
  () => appSettings.value.chatSoundFile,
  (value, oldValue) => {
    if (value.length > 0 && oldValue.length > 0 && value !== oldValue) {
      ElNotification.warning({
        message: h('div', { clas: 'text-xs text-gray-400' }, [
          'Chat sound changed. You need to reload the app for changes to take effect.',
        ]),
      });
    }
  },
);

const friendName = ref('');

const memberLink = computed(() => {
  return `${window.location.origin}/?member_name=${friendName.value}`;
});

const { copied, copy } = useClipboard({ source: memberLink });

watchEffect(() => {
  if (copied.value) {
    ElNotification.success({
      message: 'Link copied to clipboard. Share it with your friend.',
    });

    friendName.value = '';
  }
});
</script>
<template>
  <div class="flex flex-col gap-2">
    <div class="inline-flex gap-2 items-center justify-between mb-3">
      <div class="text-lg">Settings</div>

      <el-button
        circle
        plain
        size="small"
        @click="appState.isSettingsDrawerOpen = false"
        :icon="PhClose"
      />
    </div>

    <div
      class="flex flex-col gap-1 p-2 bg-gray-100 rounded"
      v-if="localUserId !== null"
    >
      <div class="text-sm mb-2">My Hansu ID</div>
      <div class="text-sm">{{ localUserId?.name }}</div>
      <div class="text-xs text-gray-400">
        {{ localUserId?.id }}
      </div>
    </div>

    <div class="flex flex-col gap-1 p-2 bg-gray-100 rounded">
      <div class="text-sm mb-2">Reset Hansu ID</div>
      <div class="text-xs text-gray-400">
        Your Hanasu ID is your name, we store it in browser after initial setup.
        if you want to change your name, you can reset it here or clearing
        browser storage will also reset it.
      </div>

      <el-button
        type="danger"
        size="small"
        class="mt-2"
        title="Settings"
        @click="handleReset"
        :icon="PhSkullDuotone"
      >
        Reset
      </el-button>
    </div>

    <div class="flex flex-col gap-1 p-2 bg-gray-100 rounded">
      <div class="text-sm mb-2">Chat sounds</div>

      <div class="text-xs text-gray-400">
        Play tune when new message is reveived ?
      </div>

      <div>
        <el-switch size="small" v-model="appSettings.chatSounds" />
      </div>

      <div class="text-xs text-gray-400">Choose a tune to play</div>
      <el-select
        placeholder="Select a sound"
        v-model="appSettings.chatSoundFile"
        class="m-2"
        size="small"
        :disabled="!appSettings.chatSounds"
      >
        <el-option
          v-for="item in CHAT_SOUNDS"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <div class="text-xs text-gray-400">
        Volume ({{ appSettings.chatSoundVolume }})
      </div>

      <el-slider
        size="small"
        v-model="appSettings.chatSoundVolume"
        :step="0.1"
        :min="0.1"
        :max="1"
        show-stops
        :disabled="!appSettings.chatSounds"
      />
    </div>

    <div class="flex flex-col gap-1 p-2 bg-gray-100 rounded">
      <div class="text-sm mb-2">Invite a friend to Hanasu</div>

      <div class="text-xs text-gray-400">
        You can send them a sharable link to join Hanasu.
      </div>

      <el-input
        v-model="friendName"
        placeholder="Type their name"
        size="small"
        @keydown.enter="() => copy()"
      >
        <template #append>
          <el-button
            type="primary"
            title="Copy link"
            :disabled="friendName.length === 0"
            :icon="PhShareNetworkDuotone"
            size="small"
            @click="() => copy()"
          />
        </template>
      </el-input>
    </div>
  </div>
</template>
