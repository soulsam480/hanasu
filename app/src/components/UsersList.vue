<script setup lang="ts">
import { IUser } from '@hanasu/shared';
import { ElAvatar, ElBadge, ElButton, ElScrollbar, ElTag } from 'element-plus';
import PhClose from '~icons/ph/x-circle-duotone';
import { appState } from '../store/app';
import { dateFormat } from '../utils/date';

defineProps<{
  users: IUser[];
}>();

defineEmits<{
  (e: 'call-user', user: IUser): void;
  (e: 'close-chat', event: MouseEvent): void;
}>();
</script>
<template>
  <div class="flex flex-col gap-1">
    <div
      class="px-2 py-3 text-sm inline-flex justify-between items-center text-gray-600 border-b border-gray-200"
    >
      <div class="inline-flex gap-2 items-center">
        <i-ph-user-circle-gear-duotone /> <span>Active users</span>
      </div>

      <el-tag round type="info">{{ users.length }}</el-tag>
    </div>

    <el-scrollbar view-class="flex flex-col gap-2 px-1" class="flex-grow">
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
              : appState.chatState === 'connecting' ||
                appState.chatState === 'sent'
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

          <el-button
            v-if="
              appState.chatState === 'connected' &&
              appState.chatUser?.id === user.id
            "
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
    </el-scrollbar>
  </div>
</template>
