<script setup lang="ts">
import { ElButton } from 'element-plus';
// @ts-expect-error bad types
import PhClose from '~icons/ph/x-circle-duotone';
import { appState, localUserId } from '../store/app';
import { wsState } from '../store/ws';

function handleReset() {
  localUserId.value = null;
  appState.isSettingsDrawerOpen = false;

  wsState.conn?.close();
}
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
      <div class="text-sm">My Hansu ID</div>
      <div class="text-sm">{{ localUserId?.name }}</div>
      <div class="text-xs text-gray-400">
        {{ localUserId?.id }}
      </div>
    </div>

    <div class="flex flex-col gap-1 p-2 bg-gray-100 rounded">
      <div class="text-sm">Reset Hansu ID</div>
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
      >
        <div class="flex gap-2 items-center">
          <i-ph-skull-duotone />
          <span>Reset</span>
        </div>
      </el-button>
    </div>
  </div>
</template>
