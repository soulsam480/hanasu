<script setup lang="ts">
import { ElAvatar, ElImage } from 'element-plus';
import { IMessage } from '../store/app';
import { dateFormat } from '../utils/date';

const BASE64_REGEX =
  /data:image\/[bmp,gif,ico,jpg,png,svg,webp,x\-icon,svg+xml]+;base64,[a-zA-Z0-9,+,/]+={0,2}/gm;

const props = defineProps<{
  message: IMessage;
  isOwner: boolean;
  chatUserName: string;
}>();

function isBase64UrlImage(base64String: string) {
  return BASE64_REGEX.test(base64String);
}

const isImage = isBase64UrlImage(props.message.content);
</script>
<template>
  <div
    :class="[
      'flex',
      {
        'justify-end': isOwner,
      },
    ]"
  >
    <div
      :class="[
        'flex items-start max-w-[80%] gap-2 bg-gray-100 rounded w-max hover:bg-gray-200 p-2',
        {
          'flex-row-reverse justify-end': isOwner,
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
          {{ isOwner ? 'me' : chatUserName }}
        </div>

        <div class="text-sm">
          <el-image
            v-if="isImage"
            style="max-width: 226px; max-height;: 226px"
            :src="message.content"
            fit="contain"
          />

          <template v-else>
            {{ message.content }}
          </template>
        </div>

        <div class="text-[10px] text-gray-400">
          {{ dateFormat(new Date(message.timestamp), 'hh:mm aaa') }}
        </div>
      </div>
    </div>
  </div>
</template>
