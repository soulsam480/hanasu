import { useFileDialog } from '@vueuse/core';
import imageCompression from 'browser-image-compression';
import { ElNotification } from 'element-plus';
import { computed, ref } from 'vue';
import PhSkull from '~icons/ph/skull-duotone';

const MAX_FILE_SELECT_SIZE = 5 * 1024 * 1024; // 5MB

export function useImageAsset() {
  const {
    onChange,
    open,
    reset: resetFileState,
  } = useFileDialog({
    accept: 'image/*',
    multiple: false,
    reset: true,
  });

  const imageFile = ref<File | null>(null);
  const isLoading = ref(false);

  const imageAsFileURL = computed(() => {
    if (imageFile.value === null) return null;

    return URL.createObjectURL(imageFile.value);
  });

  async function handleChange(files: FileList | null) {
    const file = files?.[0];

    if (file === undefined || file.size > MAX_FILE_SELECT_SIZE) {
      resetFileState();

      ElNotification.error({
        icon: PhSkull,
        message: 'Image size should be less that 5 MB',
      });

      return;
    }

    isLoading.value = true;

    const compressedFile = await imageCompression(file, {
      useWebWorker: true,
      maxSizeMB: 0.065535,
    });

    imageFile.value = compressedFile;

    isLoading.value = false;

    return compressedFile;
  }

  onChange(handleChange);

  function reset() {
    resetFileState();

    if (imageAsFileURL.value !== null) {
      URL.revokeObjectURL(imageAsFileURL.value);
    }

    imageFile.value = null;
    isLoading.value = false;
  }

  function toBase64Image(file: File) {
    return new Promise<string>((resolve, reject) => {
      isLoading.value = true;

      const reader = new FileReader();

      reader.onload = (e) => {
        const dataURL = e.target?.result;

        if (dataURL) {
          isLoading.value = false;
          resolve(dataURL.toString());
        }
      };

      reader.onerror = (e) => {
        isLoading.value = false;
        reject(e);
      };

      reader.readAsDataURL(file);
    });
  }

  return {
    imageFile,
    imageAsFileURL,
    open,
    reset,
    toBase64Image,
    isLoading,
  };
}
