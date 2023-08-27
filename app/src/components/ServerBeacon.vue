<script setup lang="ts">
import { ElTooltip } from 'element-plus';
import { computed } from 'vue';
import { wsState } from '../store/ws';

const colorForState = computed(() => {
  return wsState.state === 'connected'
    ? 'bg-green-400'
    : wsState.state === 'connecting'
    ? 'bg-blue-400'
    : wsState.state === 'reconnecting'
    ? 'bg-orange-400'
    : 'bg-red-400';
});
</script>
<template>
  <el-tooltip :content="wsState.state" placement="right">
    <span class="relative flex h-1.5 w-1.5">
      <span
        :class="[
          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
          colorForState,
        ]"
      />

      <span
        :class="[
          'relative inline-flex rounded-full h-1.5 w-1.5',
          colorForState,
        ]"
      />
    </span>
  </el-tooltip>
</template>
