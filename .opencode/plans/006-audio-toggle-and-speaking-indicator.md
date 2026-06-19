# Audio Toggle + Speaking Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace push-to-talk with a mute toggle and add a live remote speaking
indicator using AudioContext analyser.

**Architecture:** New `useAudioAnalyser` composable detects audio levels on the
remote stream via `AudioContext` + `AnalyserNode`. ChatArea.vue uses it to show
a speaking indicator. Mic button changes from PTT (pointerdown/up) to click
toggle.

**Tech Stack:** Vue 3 Composition API, Web Audio API (`AudioContext`,
`AnalyserNode`), Element Plus, Tailwind CSS

---

## File Structure

| File                                      | Action     | Purpose                                                                          |
| ----------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| `app/src/composables/useAudioAnalyser.ts` | **Create** | Audio level detection composable                                                 |
| `app/src/store/app.ts:49-63`              | **Modify** | Add `isRemoteSpeaking` to `IAppState`                                            |
| `app/src/store/app.ts:65-79`              | **Modify** | Initialize `isRemoteSpeaking: false`                                             |
| `app/src/store/app.ts:81-97`              | **Modify** | Reset `isRemoteSpeaking` in `resetApp()`                                         |
| `app/src/components/ChatArea.vue:11`      | **Modify** | Add `onUnmounted` to vue import                                                  |
| `app/src/components/ChatArea.vue:48`      | **Modify** | Import `useAudioAnalyser`, destructure `isSpeaking`                              |
| `app/src/components/ChatArea.vue:116-134` | **Modify** | Replace PTT handlers with `toggleMute`, add `watchEffect` for `isRemoteSpeaking` |
| `app/src/components/ChatArea.vue:163-173` | **Modify** | Replace local-only pulsing dot with remote speaking indicator                    |
| `app/src/components/ChatArea.vue:333-351` | **Modify** | Replace PTT events with `@click="toggleMute"`                                    |

---

### Task 1: Create `useAudioAnalyser` composable

**Files:**

- Create: `app/src/composables/useAudioAnalyser.ts`

- [ ] **Step 1: Write the composable**

```typescript
import { onUnmounted, type Ref, ref, watch } from "vue";

export function useAudioAnalyser(stream: Ref<MediaStream | null>) {
  const isSpeaking = ref(false);

  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let rafId: number | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;

  const SILENCE_THRESHOLD = 15;
  const SILENCE_DELAY = 300;

  function start() {
    if (!stream.value) return;

    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    source = audioCtx.createMediaStreamSource(stream.value);
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      if (!analyser) return;

      analyser.getByteTimeDomainData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] - 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);

      if (rms > SILENCE_THRESHOLD) {
        isSpeaking.value = true;
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      } else if (isSpeaking.value && !silenceTimer) {
        silenceTimer = setTimeout(() => {
          isSpeaking.value = false;
          silenceTimer = null;
        }, SILENCE_DELAY);
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    source?.disconnect();
    source = null;
    analyser = null;
    if (audioCtx && audioCtx.state !== "closed") {
      audioCtx.close();
    }
    audioCtx = null;
    isSpeaking.value = false;
  }

  watch(stream, (newStream, oldStream) => {
    if (oldStream) stop();
    if (newStream) start();
  });

  onUnmounted(() => {
    stop();
  });

  return { isSpeaking };
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd app && pnpm exec vue-tsc --noEmit` Expected: PASS (exit 0)

- [ ] **Step 3: Commit**

```bash
git add app/src/composables/useAudioAnalyser.ts
git commit -m "feat: add useAudioAnalyser composable for remote speaking detection"
```

---

### Task 2: Add `isRemoteSpeaking` to app state

**Files:**

- Modify: `app/src/store/app.ts:49-63` (IAppState interface)
- Modify: `app/src/store/app.ts:65-79` (appState reactive)
- Modify: `app/src/store/app.ts:81-97` (resetApp)

- [ ] **Step 1: Add to IAppState interface**

At line 62, after `micDenied: boolean;`, add:

```typescript
isRemoteSpeaking: boolean;
```

- [ ] **Step 2: Initialize in appState**

At line 78, after `micDenied: false,`, add:

```typescript
isRemoteSpeaking: false,
```

- [ ] **Step 3: Reset in resetApp**

At line 96, after `appState.micDenied = false;`, add:

```typescript
appState.isRemoteSpeaking = false;
```

- [ ] **Step 4: Verify typecheck passes**

Run: `cd app && pnpm exec vue-tsc --noEmit` Expected: PASS (exit 0)

- [ ] **Step 5: Commit**

```bash
git add app/src/store/app.ts
git commit -m "feat: add isRemoteSpeaking to app state"
```

---

### Task 3: Replace PTT with toggle + add speaking indicator in ChatArea.vue

**Files:**

- Modify: `app/src/components/ChatArea.vue:11` (vue import)
- Modify: `app/src/components/ChatArea.vue:48` (usePeer destructure)
- Modify: `app/src/components/ChatArea.vue:116-134` (audio section)
- Modify: `app/src/components/ChatArea.vue:163-173` (mobile header indicator)
- Modify: `app/src/components/ChatArea.vue:333-351` (mic button)

- [ ] **Step 1: Add `onUnmounted` to vue import**

Change line 11 from:

```typescript
import { computed, ref, watch, watchEffect } from "vue";
```

To:

```typescript
import { computed, onUnmounted, ref, watch, watchEffect } from "vue";
```

- [ ] **Step 2: Import useAudioAnalyser and wire it up**

After line 48 (`const { setMuted } = usePeer();`), add:

```typescript
import { useAudioAnalyser } from "../composables/useAudioAnalyser";
```

Wait — imports must be at the top. Move the import to line 17 (after other
imports):

```typescript
import { useAudioAnalyser } from "../composables/useAudioAnalyser";
```

Then after line 48, add:

```typescript
const remoteStream = computed(() => appState.remoteStream);
const { isSpeaking } = useAudioAnalyser(remoteStream);

watchEffect(() => {
  appState.isRemoteSpeaking = isSpeaking.value;
});
```

- [ ] **Step 3: Replace PTT handlers with toggleMute**

Replace lines 127-134 (handlePTTStart/handlePTTEnd) with:

```typescript
function toggleMute() {
  if (isChatDisabled.value || micDenied.value) return;
  setMuted(!isMuted.value);
}
```

- [ ] **Step 4: Replace mobile header indicator**

Replace lines 163-173 (the pulsing dot block) with the remote speaking
indicator:

```html
<span
  v-if="isSpeaking && chatState === 'connected'"
  class="relative flex h-2 w-2"
>
  <span
    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
  />
  <span
    class="relative inline-flex rounded-full h-2 w-2 bg-green-400"
  />
</span>

<span
  v-if="!isMuted && chatState === 'connected'"
  class="relative flex h-2 w-2"
>
  <span
    class="relative inline-flex rounded-full h-2 w-2 bg-blue-400"
  />
</span>
```

- [ ] **Step 5: Replace mic button events**

Replace lines 333-351 (the mic button) with:

```html
<el-button
  class="!ml-0"
  type="primary"
  plain
  circle
  :disabled="isChatDisabled || micDenied"
  :icon="PhMicrophone"
  @click="toggleMute"
  :class="{ 'ring-2 ring-green-400': !isMuted && !isChatDisabled }"
/>
```

- [ ] **Step 6: Add speaking indicator in desktop chat header**

Find the desktop chat header (the one with `hidden md:flex` classes). Look for
the `<el-badge>` block that starts around line 188. After the `chatUser.name`
text and before the close button, add the speaking indicator:

```html
<span
  v-if="isSpeaking && chatState === 'connected'"
  class="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200"
>
  <span class="flex gap-0.5 items-center h-4">
    <span
      class="w-0.5 bg-green-500 rounded-full animate-pulse"
      style="animation: speakBar 0.5s ease-in-out infinite alternate; height: 8px"
    />
    <span
      class="w-0.5 bg-green-500 rounded-full animate-pulse"
      style="animation: speakBar 0.5s ease-in-out 0.1s infinite alternate; height: 14px"
    />
    <span
      class="w-0.5 bg-green-500 rounded-full animate-pulse"
      style="animation: speakBar 0.5s ease-in-out 0.2s infinite alternate; height: 6px"
    />
    <span
      class="w-0.5 bg-green-500 rounded-full animate-pulse"
      style="animation: speakBar 0.5s ease-in-out 0.15s infinite alternate; height: 12px"
    />
    <span
      class="w-0.5 bg-green-500 rounded-full animate-pulse"
      style="animation: speakBar 0.5s ease-in-out 0.05s infinite alternate; height: 10px"
    />
  </span>
  <span class="text-xs text-green-600 font-medium">Speaking</span>
</span>
```

- [ ] **Step 7: Add speakBar keyframes to style block**

At the end of the file, inside the `<style>` block, add:

```css
@keyframes speakBar {
  from {
    height: 4px;
  }
  to {
    height: 16px;
  }
}
```

- [ ] **Step 8: Verify typecheck passes**

Run: `cd app && pnpm exec vue-tsc --noEmit` Expected: PASS (exit 0)

- [ ] **Step 9: Verify build passes**

Run: `cd app && pnpm exec vite build` Expected: PASS (exit 0)

- [ ] **Step 10: Commit**

```bash
git add app/src/components/ChatArea.vue
git commit -m "feat: replace PTT with mute toggle, add remote speaking indicator"
```

---

## Verification

After all tasks:

1. `cd app && pnpm exec vue-tsc --noEmit` — must exit 0
2. `cd app && pnpm exec vite build` — must exit 0
3. Manual test: open two browser tabs, connect, verify:
   - Mic button toggles mute on click (green ring when unmuted)
   - Speaking indicator appears when remote peer talks
   - Pulsing green dot shows in mobile header when remote speaks
   - Static blue dot shows in mobile header when local mic is unmuted
