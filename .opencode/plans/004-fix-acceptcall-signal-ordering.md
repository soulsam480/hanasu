# Plan 004: Attach signal listener before calling signal() in acceptCall

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the plans index — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 826d547..HEAD -- app/src/store/peer.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `826d547`, 2026-06-19
- **Issue**: omitted

## Why this matters

In the `acceptCall` function (`peer.ts:227-272`), the `signal` event listener is attached at line 242 AFTER `peer.value?.signal(callPayload.offer)` is called at line 240. The `signal` event is how the callee's answer is sent back to the caller. simple-peer currently processes `signal()` asynchronously (via `nextTick`), so the listener is typically attached in time. But this ordering is fragile — if simple-peer's internals ever change to synchronous processing, the answer would be emitted before the listener is attached, and the call would never connect.

The `makeCall` function at lines 186-207 attaches the `signal` listener before any signaling happens (it's the initiator, so no `signal()` call is needed). `acceptCall` should follow the same pattern.

## Current state

- The relevant file:
  - `app/src/store/peer.ts` — contains `acceptCall` (lines 227-272)

- The buggy ordering (lines 227-254):
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

    setupCommonPeerEventListeners(peer.value);

    peer.value?.signal(callPayload.offer);          // <-- signal() called first

    peer.value?.on('signal', (data) => {            // <-- listener attached AFTER
      if (data.type === 'renegotiate' || data.type === 'transceiverRequest') {
        return;
      }

      wsState.conn?.emit(HANASU_EVENTS.ACCEPT_CALL, {
        answer: JSON.stringify(data),
        to: callPayload.user.id,
      });

      chatState.value = 'sent';
      incomingCall.value = null;
    });
```

- The correct pattern from `makeCall` (lines 184-207) — listener first, then signaling:
```typescript
    setupCommonPeerEventListeners(peer.value);

    peer.value?.on('signal', (data) => {            // <-- listener attached first
      if (data.type === 'renegotiate' || data.type === 'transceiverRequest') {
        return;
      }
      // ... emit MAKE_CALL ...
    });
```

## Commands you will need

| Purpose   | Command                                          | Expected on success |
|-----------|--------------------------------------------------|---------------------|
| Typecheck | `cd app && npx vue-tsc --noEmit`                 | exit 0 (or pre-existing warnings only) |

## Scope

**In scope** (the only file you should modify):
- `app/src/store/peer.ts`

**Out of scope** (do NOT touch, even though they look related):
- `app/src/store/ws.ts` — the `CALL_ACCEPTED` handler there signals the peer correctly
- `app/src/components/CallNotification.vue` — unrelated

## Git workflow

- Branch: `fix/004-acceptcall-signal-ordering`
- Commit message: `fix(app): attach signal listener before signal() in acceptCall`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Move the signal listener before the signal() call

In `app/src/store/peer.ts`, in the `acceptCall` function, move the `peer.value?.on('signal', ...)` block (lines 242-254) to BEFORE the `peer.value?.signal(callPayload.offer)` call (line 240).

The reordering should produce:

```typescript
    setupCommonPeerEventListeners(peer.value);

    peer.value?.on('signal', (data) => {
      if (data.type === 'renegotiate' || data.type === 'transceiverRequest') {
        return;
      }

      wsState.conn?.emit(HANASU_EVENTS.ACCEPT_CALL, {
        answer: JSON.stringify(data),
        to: callPayload.user.id,
      });

      chatState.value = 'sent';
      incomingCall.value = null;
    });

    peer.value?.signal(callPayload.offer);
```

**Verify**: Open `app/src/store/peer.ts` and confirm in `acceptCall`:
- The `on('signal', ...)` block appears BEFORE the `signal(callPayload.offer)` call
- The `on('signal', ...)` block is identical to the original (no content changes, only line order)

## Test plan

- No test framework exists in this repo. This is a line-reorder fix verified by reading the code.
- Manual verification: accept an incoming call from another user. The call should connect normally. The fix is defensive — it prevents a race condition that may not be reproducible with the current simple-peer version, but aligns the code with the correct pattern.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] In `acceptCall` in `app/src/store/peer.ts`, the `peer.value?.on('signal', ...)` block appears at a lower line number than `peer.value?.signal(callPayload.offer)`
- [ ] The `on('signal', ...)` handler body is unchanged (same emit, same state updates)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] Plans index status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at lines 227-254 in `peer.ts` doesn't match the "Current state" excerpt.
- The fix appears to require touching an out-of-scope file.
- You notice the `on('signal', ...)` handler body needs changes beyond reordering (it shouldn't — it's a pure move).

## Maintenance notes

- This is a defensive fix. simple-peer currently defers `signal` events via `nextTick`, so the current code works. But the ordering is wrong by contract — the listener should be registered before the event source is triggered.
- If simple-peer is ever replaced (it's abandoned — see dependency audit), the new library's signal model should be checked for the same ordering requirement.
- The `makeCall` function already follows the correct pattern (listener first). This plan makes `acceptCall` consistent with it.
