# Plan 005: Add push-to-talk audio chat via WebRTC media tracks

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in the "STOP conditions" section occurs, stop and report —
> do not improvise. When done, update the status row for this plan in the plans
> index.
>
> **Drift check (run first)**:
> `git diff --stat 826d547..HEAD -- app/src/store/app.ts app/src/store/peer.ts app/src/components/ChatArea.vue app/src/components/CallNotification.vue`
> If any in-scope file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch, treat
> it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: feature
- **Planned at**: commit `826d547`, 2026-06-19
- **Issue**: omitted

## Why this matters

Hanasu is a peer-to-peer chat app but currently only supports text. Audio chat
is the core value proposition — users want to talk, not just type. The existing
codebase has commented-out audio plumbing (Peer `stream` option, `on('stream')`
handlers) that was abandoned mid-implementation. This plan completes that
feature with a push-to-talk model: mic starts muted, hold button to talk,
release to stop. Remote audio plays automatically. No renegotiation needed —
both peers provide their mic stream in the initial WebRTC offer/answer.

## Current state

- The relevant files:
  - `app/src/store/app.ts` — app state (82 lines); `IAppState` interface and
    `resetApp()`
  - `app/src/store/peer.ts` — WebRTC peer lifecycle (273 lines); `makeCall`,
    `acceptCall`, `setupCommonPeerEventListeners`
  - `app/src/components/ChatArea.vue` — chat UI (315 lines); input bar, message
    list, image handling
  - `app/src/components/CallNotification.vue` — notification component (92
    lines); accept/reject buttons
  - `shared/src/index.ts` — shared types (69 lines); `HANASU_EVENTS`, payload
    interfaces

- Commented-out audio code in `peer.ts`:
  - Line 130: `// stream: stream.value as MediaStream,` (in `makeCall` Peer
    constructor)
  - Line 184: `// stream: stream.value as MediaStream,` (in `acceptCall` Peer
    constructor)
  - Lines 158-173: commented-out `peer.on('stream')` handler in `makeCall`
  - Lines 205-220: commented-out `peer.on('stream')` handler in `acceptCall`
  - Lines 57-59: commented-out mute toggle in `peer.on('close')`

- No `<audio>` element exists in any Vue template
- No mic-related UI exists anywhere
- `simple-peer` supports `stream` option and `stream` event (these are the
  commented-out features)

## Commands you will need

| Purpose   | Command                                 | Expected on success   |
| --------- | --------------------------------------- | --------------------- |
| Typecheck | `cd app && npx vue-tsc@^2.0.0 --noEmit` | exit 0, no new errors |
| Build     | `cd app && pnpm build`                  | exit 0                |

## Scope

**In scope** (files you should modify):

- `app/src/store/app.ts` — add audio state fields, cleanup in `resetApp`
- `app/src/store/peer.ts` — `getUserMedia`, `stream` option, `on('stream')`
  handler, `setMuted` function, remove commented-out blocks
- `app/src/components/ChatArea.vue` — mic button, `<audio>` element,
  `watchEffect` for remote stream, `micDenied` flag
- `app/src/components/CallNotification.vue` — pulsing mic icon when transmitting

**Out of scope** (do NOT touch):

- `shared/src/index.ts` — no new events needed (audio is peer-to-peer via
  WebRTC, not Socket.IO)
- `api/src/index.ts` — server is uninvolved in audio
- Volume controls, speaker switching, video, audio recording
- `app/src/store/ws.ts` — no changes needed

## Git workflow

- Branch: `feat/audio-chat`
- Commit per task (5 commits total)
- Message style: `feat(app): <description>` (matches repo convention)

---

## Task 1: Add audio state fields to app store

**Files:**

- Modify: `app/src/store/app.ts`

### Step 1: Add new fields to `IAppState` interface

In `app/src/store/app.ts`, add three new fields to the `IAppState` interface
(after line 58, before the closing brace):

```typescript
interface IAppState {
  chatState: TChatState;
  chatUser: IUser | null;
  incomingCall: ICallMadeParams | null;
  outgoingCall: IMakeCallPayload | null;
  peer: Peer.Instance | null;
  messages: IMessage[];
  isDrawerOpen: boolean;
  isSettingsDrawerOpen: boolean;
  userRole: TChatUserRole | null;
  isMuted: boolean; // NEW — push-to-talk starts muted
  remoteStream: MediaStream | null; // NEW — remote peer's audio stream
  localStream: MediaStream | null; // NEW — local mic stream
}
```

### Step 2: Initialize new fields in `appState`

In the `reactive<IAppState>({...})` call (lines 61-71), add defaults:

```typescript
export const appState = reactive<IAppState>({
  peer: null,
  chatState: "disconnected",
  chatUser: null,
  incomingCall: null,
  messages: [],
  isDrawerOpen: false,
  isSettingsDrawerOpen: false,
  outgoingCall: null,
  userRole: null,
  isMuted: true, // NEW
  remoteStream: null, // NEW
  localStream: null, // NEW
});
```

### Step 3: Add cleanup for audio streams in `resetApp()`

In `resetApp()` (lines 73-82), add track cleanup before resetting state:

```typescript
export function resetApp() {
  // Stop all audio tracks before destroying peer
  appState.remoteStream?.getTracks().forEach((t) => t.stop());
  appState.localStream?.getTracks().forEach((t) => t.stop());

  appState.peer?.destroy();
  appState.peer = null;
  appState.chatState = "disconnected";
  appState.incomingCall = null;
  appState.outgoingCall = null;
  appState.chatUser = null;
  appState.userRole = null;
  appState.messages = [];
  appState.isMuted = true; // NEW
  appState.remoteStream = null; // NEW
  appState.localStream = null; // NEW
}
```

**Verify**: `cd app && npx vue-tsc@^2.0.0 --noEmit` exits 0

**Commit**: `feat(app): add audio state fields to app store`

---

## Task 2: Capture mic and wire audio through peer connection

**Files:**

- Modify: `app/src/store/peer.ts`

### Step 1: Add `setMuted` function and export it

In `app/src/store/peer.ts`, add a `setMuted` function inside `usePeer()` (after
the `closeChat` function, before the `return` statement):

```typescript
function setMuted(muted: boolean) {
  appState.isMuted = muted;
  appState.localStream?.getAudioTracks().forEach((t) => {
    t.enabled = !muted;
  });
}
```

Add `setMuted` to the return object:

```typescript
return {
  peer,
  chatUser,
  chatState,
  makeCall,
  acceptCall,
  rejectCall,
  sendMessage,
  cancelOutgoingCall,
  closeChat,
  setMuted, // NEW
};
```

### Step 2: Capture mic before creating Peer in `makeCall`

In `makeCall` (starting at line 113), change the function to be `async` and
capture the mic before creating the Peer. Replace lines 113-131:

Current:

```typescript
  function makeCall(user: IUser) {
    ElNotification({
      message: h(CallNotification, {
        message: `Sending chat request to ${user.name}`,
        type: 'outgoing',
      }),
    });

    chatState.value = 'connecting';
    chatUser.value = user;
    userRole.value = 'caller';

    peer.value = new Peer({
      initiator: true,
      trickle: false,
      config: RTC_CONFIG,

      // stream: stream.value as MediaStream,
    });
```

New:

```typescript
  async function makeCall(user: IUser) {
    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      appState.localStream = stream;
      appState.isMuted = true;
      stream.getAudioTracks()[0].enabled = false;
    } catch {
      // Mic denied or unavailable — continue with text only
      console.warn('[HANASU] Mic access denied or unavailable, continuing with text only');
    }

    ElNotification({
      message: h(CallNotification, {
        message: `Sending chat request to ${user.name}`,
        type: 'outgoing',
      }),
    });

    chatState.value = 'connecting';
    chatUser.value = user;
    userRole.value = 'caller';

    peer.value = new Peer({
      initiator: true,
      trickle: false,
      config: RTC_CONFIG,
      stream: stream ?? undefined,
    });
```

### Step 3: Replace commented-out `on('stream')` in `makeCall`

Delete the commented-out block at lines 158-173 and replace with:

```typescript
peer.value?.on("stream", (remoteStream) => {
  appState.remoteStream = remoteStream;
});
```

This goes right after the `peer.value?.on('signal', ...)` block (after the
closing `});` of the signal handler).

### Step 4: Capture mic before creating Peer in `acceptCall`

In `acceptCall` (starting at line 176), change the function to be `async` and
capture the mic. Replace lines 176-185:

Current:

```typescript
  function acceptCall(callPayload: ICallMadeParams) {
    chatState.value = 'connecting';
    chatUser.value = callPayload.user;
    userRole.value = 'callee';

    peer.value = new Peer({
      trickle: false,
      config: RTC_CONFIG,
      // stream: stream.value as MediaStream,
    });
```

New:

```typescript
  async function acceptCall(callPayload: ICallMadeParams) {
    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      appState.localStream = stream;
      appState.isMuted = true;
      stream.getAudioTracks()[0].enabled = false;
    } catch {
      console.warn('[HANASU] Mic access denied or unavailable, continuing with text only');
    }

    chatState.value = 'connecting';
    chatUser.value = callPayload.user;
    userRole.value = 'callee';

    peer.value = new Peer({
      trickle: false,
      config: RTC_CONFIG,
      stream: stream ?? undefined,
    });
```

### Step 5: Replace commented-out `on('stream')` in `acceptCall`

Delete the commented-out block at lines 205-220 and replace with:

```typescript
peer.value?.on("stream", (remoteStream) => {
  appState.remoteStream = remoteStream;
});
```

This goes right after the `peer.value?.on('signal', ...)` block.

### Step 6: Remove commented-out mute code in `peer.on('close')`

In `setupCommonPeerEventListeners`, remove lines 57-59 (the commented-out mute
code):

```typescript
// killAudio();
// (stream.value as MediaStream).getAudioTracks()[0].enabled = false;
// isMuted.value = true;
```

**Verify**: `cd app && npx vue-tsc@^2.0.0 --noEmit` exits 0

**Commit**: `feat(app): capture mic and wire audio through peer connection`

---

## Task 3: Add remote audio playback element

**Files:**

- Modify: `app/src/components/ChatArea.vue`

### Step 1: Add `watchEffect` and `remoteAudio` ref

In `app/src/components/ChatArea.vue` script section, add imports and setup.
After the existing imports (line 11), add `watchEffect`:

```typescript
import { computed, ref, watch, watchEffect } from "vue";
```

After the `handleAssetClick` function (line 110), add:

```typescript
const remoteAudio = ref<HTMLAudioElement | null>(null);

watchEffect(() => {
  if (remoteAudio.value !== null && appState.remoteStream !== null) {
    remoteAudio.value.srcObject = appState.remoteStream;
  }
});
```

### Step 2: Add `<audio>` element to template

In the template section, add a hidden `<audio>` element right after the opening
`<div class="relative h-full flex flex-col max-h-full">` (after line 113):

```html
<audio ref="remoteAudio" autoplay class="hidden" />
```

### Step 3: Add mic permission denied flag

In the script section, add a reactive flag for mic permission state. After the
`chatInput` ref (line 81):

```typescript
const micDenied = ref(false);
```

Update the `makeCall` wrapper in `ChatArea.vue` — but wait, `makeCall` is called
from `App.vue`, not from `ChatArea.vue`. The mic capture happens in `peer.ts`
(Task 2), so `micDenied` tracking needs to happen there. Actually, looking at
the code flow:

- `App.vue:57` calls `handleUserCall(user)` which calls `makeCall(user)` from
  `usePeer()`
- `makeCall` in `peer.ts` now does `getUserMedia` — the try/catch already
  handles denial
- We need a way for `ChatArea.vue` to know if mic was denied

Add a `micDenied` field to `IAppState` in `app.ts`:

Wait — this is getting into Task 2 territory. Let me adjust. The `micDenied`
flag should be set in `peer.ts` when `getUserMedia` fails, and read in
`ChatArea.vue` to hide the mic button.

**Backtrack**: Add `micDenied` to `IAppState` in `app/src/store/app.ts`:

In the `IAppState` interface, add:

```typescript
micDenied: boolean;
```

In the `appState` reactive:

```typescript
micDenied: false,
```

In `resetApp()`:

```typescript
appState.micDenied = false;
```

Then in `peer.ts`, in both `makeCall` and `acceptCall` catch blocks, set:

```typescript
} catch {
  appState.micDenied = true;
  console.warn('[HANASU] Mic access denied or unavailable, continuing with text only');
}
```

**Verify**: `cd app && npx vue-tsc@^2.0.0 --noEmit` exits 0

**Commit**: `feat(app): add remote audio playback and mic denied tracking`

---

## Task 4: Add mic button with push-to-talk to ChatArea

**Files:**

- Modify: `app/src/components/ChatArea.vue`

### Step 1: Import mic icon and setMuted

In the script section of `ChatArea.vue`, add imports. After the existing icon
imports (line 15):

```typescript
import PhMicrophone from "~icons/ph/microphone-duotone";
```

Update the import from `../store/peer` (currently not imported in ChatArea —
it's imported in App.vue and CallNotification.vue). Actually, looking at
ChatArea.vue, it doesn't import from `peer.ts` at all. The `send-message` event
is emitted and caught by `App.vue`.

We need `setMuted` from `usePeer()`. Add:

```typescript
import { usePeer } from "../store/peer";
```

Then inside the `<script setup>`, call it:

```typescript
const { setMuted } = usePeer();
```

### Step 2: Add push-to-talk handler functions

After the `handleAssetClick` function:

```typescript
function handlePTTStart() {
  if (isChatDisabled.value || appState.micDenied) return;
  setMuted(false);
}

function handlePTTEnd() {
  setMuted(true);
}
```

### Step 3: Add computed for mic button state

After the existing computed properties:

```typescript
const isMuted = computed(() => appState.isMuted);
const micDenied = computed(() => appState.micDenied);
```

### Step 4: Add mic button to template

In the input bar section (after the image popover, before the send button —
around line 295), add the mic button:

```html
<el-button
  class="!ml-0"
  type="primary"
  plain
  circle
  :disabled="isChatDisabled || micDenied"
  :icon="PhMicrophone"
  @pointerdown.prevent="handlePTTStart"
  @pointerup.prevent="handlePTTEnd"
  @pointerleave="handlePTTEnd"
  :class="{ 'ring-2 ring-green-400': !isMuted && !isChatDisabled }"
/>
```

Key details:

- `@pointerdown.prevent` — starts transmitting (unmutes mic). `.prevent` stops
  focus loss on input.
- `@pointerup` — stops transmitting (mutes mic)
- `@pointerleave` — safety net: if user drags off the button, stop transmitting
- `:class` ring — green ring when actively transmitting
- `:disabled` — hidden when mic denied or not in a call

### Step 5: Show "mic denied" hint when permission is denied

In the input bar, when `micDenied` is true and chat is active, show a small text
hint. Add after the mic button:

```html
<span
  v-if="micDenied && !isChatDisabled"
  class="text-xs text-gray-400 hidden md:inline"
>
  Mic denied
</span>
```

**Verify**: `cd app && npx vue-tsc@^2.0.0 --noEmit` exits 0

**Commit**: `feat(app): add push-to-talk mic button to chat input bar`

---

## Task 5: Add pulsing mic indicator in chat header

**Files:**

- Modify: `app/src/components/ChatArea.vue`

### Step 1: Add pulsing mic icon to the mobile chat header

In the template, inside the
`<div v-if="chatUser !== null" class="p-2 bg-gray-200 rounded-b-md md:hidden">`
section (lines 114-149), add a pulsing mic indicator after the user name div and
before the close button.

After the `{{ chatUser.name }}` div (line 136), add:

```html
<span
  v-if="!isMuted && chatState === 'connected'"
  class="relative flex h-2 w-2"
>
  <span
    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
  />
  <span
    class="relative inline-flex rounded-full h-2 w-2 bg-green-400"
  />
</span>
```

This uses the same pulsing pattern as `ServerBeacon.vue` — a Tailwind
`animate-ping` on a green dot.

### Step 2: Add the same indicator to the desktop users list header

The desktop user display is in `UsersList.vue`, not `ChatArea.vue`. But the
indicator should show next to the chat partner's name in the chat area, not in
the users list. The mobile header we just edited only shows on `md:hidden`. For
desktop, the chat header isn't shown (the user list is on the left, chat area on
the right).

Actually, looking at the layout more carefully:

- Mobile (`width <= 768`): The chat header with user name is visible (lines
  114-149, `md:hidden`)
- Desktop (`width > 768`): The user list is shown on the left
  (`col-span-2 hidden md:block`), and the chat area takes `col-span-3`. There's
  no chat header on desktop.

So the pulsing indicator only appears on mobile. For desktop, the user can see
the green badge dot on the user in the users list (from `UsersList.vue`). That's
acceptable — the pulsing indicator is a mobile-specific enhancement.

**Verify**: `cd app && npx vue-tsc@^2.0.0 --noEmit` exits 0

**Verify**: `cd app && pnpm build` exits 0

**Commit**: `feat(app): add pulsing mic indicator in mobile chat header`

---

## Task 6: Remove dead commented-out audio code

**Files:**

- Modify: `app/src/store/peer.ts`

### Step 1: Remove all remaining commented-out audio blocks

In `peer.ts`, remove these commented-out blocks that are now replaced by the
live implementations:

1. Lines 57-59 in `setupCommonPeerEventListeners` (already removed in Task 2,
   verify it's gone)
2. Lines 158-173 in `makeCall` (already replaced in Task 2, verify it's gone)
3. Lines 184 in `acceptCall` (already replaced in Task 2, verify it's gone)
4. Lines 205-220 in `acceptCall` (already replaced in Task 2, verify it's gone)

Also remove the `// stream: stream.value as MediaStream,` comment if it still
exists.

**Verify**: `grep -n "// stream:" app/src/store/peer.ts` returns no matches
**Verify**: `grep -n "// peer.value?.on('stream'" app/src/store/peer.ts` returns
no matches **Verify**: `grep -n "// killAudio" app/src/store/peer.ts` returns no
matches **Verify**: `cd app && npx vue-tsc@^2.0.0 --noEmit` exits 0

**Commit**: `feat(app): remove dead commented-out audio code`

---

## Test plan

- No test framework exists in this repo. Verification is typecheck + manual
  testing.
- Manual test scenarios:
  1. **Happy path**: User A calls User B → both get mic prompt → call connects →
     both see pulsing mic indicator on mobile → hold mic button → other person
     hears audio → release → audio stops → hang up → streams cleaned up
  2. **Mic denied**: User denies mic permission → text chat still works → mic
     button shows "Mic denied" hint → button is disabled
  3. **One side denies mic**: User A has mic, User B denies → A can still hear B
     (if B's side sends stream) but B can't talk → text chat works
  4. **Reconnection**: Call drops → `resetApp` stops all tracks → new call
     re-captures mic
  5. **Mobile**: PTT works with touch (pointerdown/pointerup) → pulsing
     indicator visible in mobile header

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `app/src/store/app.ts` has `isMuted`, `remoteStream`, `localStream`,
      `micDenied` in `IAppState`
- [ ] `app/src/store/app.ts` `resetApp()` stops all tracks and resets audio
      state
- [ ] `app/src/store/peer.ts` `makeCall` and `acceptCall` are `async`, call
      `getUserMedia`, pass `stream` to Peer constructor
- [ ] `app/src/store/peer.ts` has `setMuted` function exported from `usePeer()`
- [ ] `app/src/store/peer.ts` has `peer.on('stream')` handler that sets
      `appState.remoteStream`
- [ ] `app/src/components/ChatArea.vue` has mic button with
      `pointerdown`/`pointerup`/`pointerleave` handlers
- [ ] `app/src/components/ChatArea.vue` has `<audio ref="remoteAudio" autoplay>`
      element
- [ ] `app/src/components/ChatArea.vue` has `watchEffect` setting
      `remoteAudio.srcObject`
- [ ] `app/src/components/ChatArea.vue` shows pulsing mic indicator when
      `!isMuted`
- [ ] No commented-out audio code remains in `peer.ts`
- [ ] `cd app && npx vue-tsc@^2.0.0 --noEmit` exits 0
- [ ] `cd app && pnpm build` exits 0

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the
  codebase has drifted since this plan was written).
- `navigator.mediaDevices.getUserMedia` is not available in the dev environment
  (test in a browser with HTTPS or localhost).
- `simple-peer`'s `stream` option or `stream` event behaves differently than
  expected (check simple-peer docs).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

- The `stream` option in `simple-peer` adds the local track to the
  RTCPeerConnection. The remote peer receives it via the `stream` event. This is
  standard WebRTC — no renegotiation needed because the track is part of the
  initial offer/answer.
- `getUserMedia` must be called in response to a user gesture
  (click/pointerdown) for Chrome autoplay policy compliance. The
  `makeCall`/`acceptCall` functions are called from button click handlers, so
  this is satisfied.
- The `<audio autoplay>` element may be blocked by browser autoplay policy if
  there's no prior user gesture. Since the call is initiated by a click, and the
  remote stream arrives after the connection is established (which requires the
  click), most browsers will allow it. If not, a fallback would be to call
  `audio.play()` in the `peer.on('stream')` handler.
- The `track.enabled = false` approach (push-to-talk) is more efficient than
  removing/adding tracks because it avoids renegotiation and maintains the SSRC
  mapping.
