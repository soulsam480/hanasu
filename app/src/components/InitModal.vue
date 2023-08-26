<script setup lang="ts">
import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  FormRules,
} from 'element-plus';
import { markRaw, reactive } from 'vue';
import { localUserId } from '../store/app';
import { IUser } from '../store/ws';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', localUserId: Omit<IUser, 'connectedAt'>): void;
}>();

interface IInitFormValue {
  name: string;
}

const formValue = reactive<IInitFormValue>({
  name: '',
});

const rules = markRaw<FormRules<IInitFormValue>>({
  name: {
    required: true,
    message: 'Please enter your name',
    trigger: 'change',
  },
});

function handleSubmit() {
  const newUser = {
    name: formValue.name,
    id: window.crypto.randomUUID() as string,
  };

  localUserId.value = newUser;
  emit('submit', localUserId.value);
}
</script>

<template>
  <el-dialog
    :model-value="open"
    width="400px"
    title="Welcome to Hanasu!"
    :close-on-press-escape="false"
    :show-close="false"
    :close-on-click-modal="false"
  >
    <el-form
      :model="formValue"
      :rules="rules"
      label-width="120px"
      class="flex flex-col gap-3"
      size="small"
      @submit.prevent="handleSubmit"
    >
      <el-form-item prop="name" label-width="0px">
        <el-input
          placeholder="To get started, please enter your name"
          v-model="formValue.name"
          autocomplete="off"
          size="default"
        />
      </el-form-item>

      <div class="flex items-center justify-end">
        <el-button
          type="primary"
          native-type="submit"
          size="default"
          :disabled="formValue.name.length === 0"
        >
          Begin
        </el-button>
      </div>
    </el-form>
  </el-dialog>
</template>
