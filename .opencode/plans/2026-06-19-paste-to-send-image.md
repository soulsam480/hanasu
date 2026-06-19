# Paste to Send Image — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add clipboard paste support so users can paste images (Ctrl+V / Cmd+V) into the chat input area to attach and send them.

**Architecture:** Extend the existing `useImageAsset` composable with a public `loadFile(file)` method, then add a `@paste` event handler in `ChatArea.vue` that extracts images from clipboard data and feeds them into the composable.

**Tech Stack:** Vue 3, TypeScript, `browser-image-compression`, Element Plus

---

### Task 1: Add `loadFile()` to `useImageAsset` composable

**Files:**
- Modify: `app/src/composables/useImageAsset.ts` (add method after `handleChange`, update return)

- [ ] **Step 1: Add `loadFile` method after `handleChange` (after line 90)**

```typescript
async function loadFile(file: File) {
  if (file.size > MAX_FILE_SELECT_SIZE) {
    reset();
    ElNotification.error({
      icon: PhSkull,
      message: 'Image size should be less than 3 MB',
    });
    return;
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
    return;
  }

  if (compressedFile.size > 192421) {
    reset();
    ElNotification.error({
      icon: PhSkull,
      message:
        'Image is too large even after compression, please choose smaller image!',
    });
    return;
  }

  imageFile.value = compressedFile;
  isLoading.value = false;
}
```

- [ ] **Step 2: Expose `loadFile` in the return statement (line 133-140)**

```typescript
return {
  imageFile,
  imageAsFileURL,
  open,
  reset,
  toBase64Image,
  isLoading,
  loadFile,
};
```

- [ ] **Step 3: Verify type-check passes**

- [ ] **Step 4: Commit**

```bash
git add app/src/composables/useImageAsset.ts
git commit -m "feat: add loadFile() to useImageAsset for external callers"
```

---

### Task 2: Add paste handler to `ChatArea.vue`

**Files:**
- Modify: `app/src/components/ChatArea.vue` (destructure `loadFile`, add `handlePaste`, add `@paste`)

- [ ] **Step 1: Destructure `loadFile` from `useImageAsset` (line 40-47)**

```typescript
const {
  open,
  imageAsFileURL,
  reset,
  imageFile,
  toBase64Image,
  isLoading: isProcessingImage,
  loadFile,
} = useImageAsset();
```

- [ ] **Step 2: Add `handlePaste` function after `handleSendMessage` (after line 117)**

```typescript
function handlePaste(event: ClipboardEvent) {
  if (isChatDisabled.value || imageAsFileURL.value !== null) return;

  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        event.preventDefault();
        loadFile(file);
      }
      return;
    }
  }
}
```

- [ ] **Step 3: Add `@paste="handlePaste"` to the input container div (line 296)**

```html
<div class="flex items-center gap-1 p-1 flex-shrink-0" @paste="handlePaste">
```

- [ ] **Step 4: Verify type-check passes**

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ChatArea.vue
git commit -m "feat: add paste-to-send-image support in chat input"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start dev server**

- [ ] **Step 2: Test paste with image**

1. Open two browser tabs, connect a call
2. Copy an image to clipboard (screenshot, right-click > copy image)
3. Focus the chat input, press Cmd+V / Ctrl+V
4. Verify: preview popover appears with compressed image
5. Click Send -> verify image message appears in chat

- [ ] **Step 3: Test paste with text**

1. Copy text to clipboard
2. Focus chat input, press Cmd+V / Ctrl+V
3. Verify: text pastes into input normally

- [ ] **Step 4: Test edge cases**

1. Paste image when disconnected -> no-op
2. Paste image when preview already open -> no-op
3. Paste a large image (>3 MB) -> error notification
