<script setup lang="ts">
import { ElScrollbar } from 'element-plus';
import { IUser } from '../composables/useWs';

defineProps<{ users: IUser[] }>();
</script>
<template>
  <el-scrollbar class="divide-y divide-gray-100 p-2">
    <div
      class="flex flex-col bg-gray-100 rounded hover:bg-gray-200 p-2 cursor-pointer"
      v-for="user in users"
      :key="user.id"
    >
      <div class="text text-sm">
        {{ user.name }}
      </div>
    </div>
  </el-scrollbar>
</template>
