<script setup lang="ts">
import { ElImage } from 'element-plus';

const props = defineProps<{ message: string }>();

async function isBase64UrlImage(base64String: string) {
  let image = new Image();

  image.src = base64String;

  return await new Promise<boolean>((resolve) => {
    image.onload = function () {
      if (image.height === 0 || image.width === 0) {
        resolve(false);
        return;
      }

      resolve(true);
    };

    image.onerror = () => {
      resolve(false);
    };
  });
}

const isImage = await isBase64UrlImage(props.message);
</script>
<template>
  <div class="text-sm">
    <el-image
      v-if="isImage"
      style="max-width: 226px; max-height;: 226px"
      :src="message"
      fit="contain"
    />

    <template v-else>
      {{ message }}
    </template>
  </div>
</template>
