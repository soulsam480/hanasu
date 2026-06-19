import { useFileDialog } from '@vueuse/core';
import imageCompression from 'browser-image-compression';
import { ElNotification } from 'element-plus';
import { computed, ref } from 'vue';
import PhSkull from '~icons/ph/skull-duotone';

const MAX_FILE_SELECT_SIZE = 3 * 1024 * 1024; // 3MB

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

  let lastObjectURL: string | null = null;

  const imageAsFileURL = computed(() => {
    if (imageFile.value === null) return null;

    if (lastObjectURL !== null) {
      URL.revokeObjectURL(lastObjectURL);
    }

    lastObjectURL = URL.createObjectURL(imageFile.value);
    return lastObjectURL;
  });

  async function compressAndValidate(file: File): Promise<File | null> {
    if (file.size > MAX_FILE_SELECT_SIZE) {
      reset();
      ElNotification.error({
        icon: PhSkull,
        message: 'Image size should be less than 3 MB',
      });
      return null;
    }

    isLoading.value = true;

    let compressedFile: File;
    try {
      compressedFile = await imageCompression(file, {
        useWebWorker: true,
        maxSizeMB: 0.065535,
        fileType: 'image/jpeg',
      });
    } catch {
      isLoading.value = false;
      ElNotification.error({
        icon: PhSkull,
        message: 'Failed to process image, please try another one',
      });
      return null;
    }

    if (compressedFile.size > 192421) {
      reset();
      ElNotification.error({
        icon: PhSkull,
        message:
          'Image is too large even after compression, please choose smaller image!',
      });
      return null;
    }

    return compressedFile;
  }

  async function handleChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return null;
    const compressedFile = await compressAndValidate(file);
    if (!compressedFile) return null;
    imageFile.value = compressedFile;
    isLoading.value = false;
    return compressedFile;
  }

  async function loadFile(file: File) {
    const compressedFile = await compressAndValidate(file);
    if (!compressedFile) return;
    imageFile.value = compressedFile;
    isLoading.value = false;
  }

  onChange(handleChange);

  function reset() {
    resetFileState();

    if (lastObjectURL !== null) {
      URL.revokeObjectURL(lastObjectURL);
      lastObjectURL = null;
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
        } else {
          isLoading.value = false;
          reject(new Error('FileReader returned no result'));
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
    loadFile,
  };
}
