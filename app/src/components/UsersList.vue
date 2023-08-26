<script setup lang="ts">
import { ElAvatar, ElBadge, ElScrollbar } from 'element-plus';
import { appState } from '../store/app';
import { IUser } from '../store/ws';
import { dateFormat } from '../utils/date';

defineProps<{
  users: IUser[];
}>();

defineEmits<{
  (e: 'call-user', user: IUser): void;
}>();
</script>
<template>
  <el-scrollbar class="divide-y divide-gray-100 p-2">
    <div
      class="bg-gray-100 rounded hover:bg-gray-200 p-2 cursor-pointer"
      @click="$emit('call-user', user)"
      v-for="user in users"
      :key="user.id"
      :title="user.id"
    >
      <el-badge
        :is-dot="appState.chatUser?.id === user.id"
        :type="
          appState.chatState === 'connected'
            ? 'success'
            : appState.chatState === 'connecting'
            ? 'warning'
            : 'danger'
        "
        class="w-full flex items-center gap-2"
      >
        <el-avatar
          size="small"
          :src="`https://source.boringavatars.com/pixel/120/${user.id}?colors=264653,f4a261,e76f51`"
        />

        <div>
          <div class="text-sm">
            {{ user.name }}
          </div>

          <div class="text-[10px] text-gray-500">
            since: {{ dateFormat(new Date(user.connectedAt), 'hh:mm aaa') }}
          </div>
        </div>
      </el-badge>
    </div>
  </el-scrollbar>
</template>
