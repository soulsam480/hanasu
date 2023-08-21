<script setup lang="ts">
import {
  FormRules,
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NModal,
} from 'naive-ui';
import { ref } from 'vue';

defineProps<{
  open: boolean;
}>();

const formValue = ref({
  name: '',
});

const formRules: FormRules = {
  name: {
    required: true,
    trigger: 'input',
  },
};
</script>

<template>
  <n-modal
    :show="open"
    class="custom-card"
    style="width: 300px"
    :bordered="false"
  >
    <n-form
      :label-width="80"
      :model="formValue"
      :rules="formRules"
      size="small"
    >
      <n-card title="Welcome to Hanasu !" size="small">
        <div class="flex flex-col gap-2">
          <div>To get started, please enter your name</div>

          <n-form-item label="Name" path="name">
            <n-input v-model:value="formValue.name" placeholder="Name" />
          </n-form-item>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <n-button attr-type="submit" size="small">Begin</n-button>
          </div>
        </template>
      </n-card>
    </n-form>
  </n-modal>
</template>
