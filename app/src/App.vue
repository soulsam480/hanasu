<script setup lang="ts">
import { NButton, NConfigProvider, NDrawer, NDrawerContent } from 'naive-ui';
import { ref, watchEffect } from 'vue';
import InitModal from './components/InitModal.vue';
import { wsState } from './composables/useWs';

// onMounted(() => {
//   createConnection('sambit');
// });

const open = ref(false);

watchEffect(() => {
  console.log(wsState);
});
</script>

<template>
  <n-config-provider abstract preflight-style-disabled>
    <main class="main">
      <init-modal :open="wsState.conn === null" />

      <div
        class="container relative border border-gray-200 rounded flex flex-col divide-y overflow-hidden"
        id="drawer-target"
      >
        <!-- header -->
        <div class="p-3">
          <div class="bold">Hanasu</div>

          <n-button class="sm:hidden" @click="open = !open">Open</n-button>
        </div>

        <!-- body -->
        <div class="flex-grow p-3">body</div>

        <!-- footer -->
        <div class="p-3">Copy right &copy; {{ new Date().getFullYear() }}</div>
      </div>

      <n-drawer
        v-model:show="open"
        :width="250"
        placement="left"
        :trap-focus="false"
        to="#drawer-target"
      >
        <n-drawer-content title="Hanasu" closable>
          Stoner is a 1965 novel by the American writer John Williams.
        </n-drawer-content>
      </n-drawer>
    </main>
  </n-config-provider>
</template>

<style lang="scss">
.main {
  @apply h-full w-full flex items-center justify-center;
}

.container {
  @apply sm:w-2/3 sm:h-2/3 h-full w-full;
}
</style>
