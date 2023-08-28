<script setup lang="ts">
import { ElAvatar, ElImage, ElLink } from 'element-plus';
import { Text, VNode, defineComponent, h } from 'vue';
import { IMessage } from '../store/app';
import { dateFormat } from '../utils/date';

const BASE64_REGEX =
  /data:image\/[bmp,gif,ico,jpg,png,svg,webp,x\-icon,svg+xml]+;base64,[a-zA-Z0-9,+,/]+={0,2}/gm;

const URL_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;

const props = defineProps<{
  message: IMessage;
  isOwner: boolean;
  chatUserName: string;
}>();

function isBase64UrlImage(base64String: string) {
  return BASE64_REGEX.test(base64String);
}

const isImage = isBase64UrlImage(props.message.content);

function wrapInternalLinksWithAnchors(content: string) {
  const matches = Array.from(content.matchAll(URL_REGEX)).map((match) => {
    return {
      match: match[0],
      start: match.index as number,
      end: (match.index as number) + match[0].length,
    };
  });

  const chunks = content.split('');
  const vnodes: VNode[] = [];

  let lastEnd = 0;

  chunks.forEach((char, index) => {
    if (index >= lastEnd) {
      const match = matches.find((match) => match.start === index);

      if (match) {
        vnodes.push(
          h(
            ElLink,
            {
              type: 'primary',
              class: 'font-normal',
              href: match.match,
              target: '_blank',
              underline: false,
              rel: 'noopener noreferrer',
            },
            () => match.match,
          ),
        );

        lastEnd = match.end;
      } else {
        const lastText = vnodes.at(-1);

        if (lastText !== undefined && lastText.type === Text) {
          vnodes.splice(-1, 1, h(Text, (lastText.children as string) + char));
        } else {
          vnodes.push(h(Text, char));
        }
      }
    }
  });

  return vnodes;
}

const ChatMessageWithLink = defineComponent(
  () => {
    return () => {
      if (isImage) return null;

      return h('span', {}, wrapInternalLinksWithAnchors(props.message.content));
    };
  },
  {
    name: 'ChatMessageWithLink',
    inheritAttrs: false,
  },
);
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
        'flex items-start max-w-[80%] gap-2 bg-gray-100 rounded w-max p-2',
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
            <chat-message-with-link />
          </template>
        </div>

        <div class="text-[10px] text-gray-400">
          {{ dateFormat(new Date(message.timestamp), 'hh:mm aaa') }}
        </div>
      </div>
    </div>
  </div>
</template>
