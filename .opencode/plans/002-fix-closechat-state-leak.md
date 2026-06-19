# Plan 002: Fix closeChat to call resetApp and clean up state

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

The `closeChat` function in `peer.ts:303-309` destroys the peer connection but never calls `resetApp()`. This means `chatState` stays `'connected'`, `chatUser` stays set, and `messages` persists. The UI shows a stale "connected" state after the user closes the chat. Every other teardown path in the codebase (`cancelOutgoingCall`, `CALL_REJECTED` handler, `CALL_CANCELED` handler, `disconnect` handler) calls `resetApp()` — `closeChat` is the only one that skips it.

## Current state

- The relevant files:
  - `app/src/store/peer.ts` — contains `closeChat` (lines 303-309)
  - `app/src/store/app.ts` — contains `resetApp` (lines 73-82)

- The buggy `closeChat` (lines 303-309):
```typescript
  function closeChat() {
    wsState.conn?.emit(HANASU_EVENTS.REJECT_CALL, {
      to: chatUser.value?.id,
    });

    peer.value?.destroy();
  }
```

- `resetApp` (lines 73-82) does the full cleanup:
```typescript
export function resetApp() {
  appState.peer?.destroy();
  appState.peer = null;
  appState.chatState = 'disconnected';
  appState.incomingCall = null;
  appState.outgoingCall = null;
  appState.chatUser = null;
  appState.userRole = null;
  appState.messages = [];
}
```

- Note: `resetApp` already calls `peer?.destroy()` internally (line 74). So the standalone `peer.value?.destroy()` on line 308 of `closeChat` becomes redundant after adding `resetApp()`. Remove it to avoid double-destroy.

- `resetApp` is already imported in `peer.ts` at line 12: `import { IMessage, appState, resetApp } from './app'`

- Repo conventions: all other teardown paths use `resetApp()` as the single cleanup function. Examples: `cancelOutgoingCall` at `peer.ts:295-299`, `CALL_REJECTED` handler at `ws.ts:148-154`, `CALL_CANCELED` handler at `ws.ts:177`.

## Commands you will need

| Purpose   | Command                                          | Expected on success |
|-----------|--------------------------------------------------|---------------------|
| Typecheck | `cd app && npx vue-tsc --noEmit`                 | exit 0 (or pre-existing warnings only) |

## Scope

**In scope** (the only file you should modify):
- `app/src/store/peer.ts`

**Out of scope** (do NOT touch, even though they look related):
- `app/src/store/app.ts` — `resetApp` is correct as-is
- `app/src/store/ws.ts` — the `CALL_REJECTED` handler there already handles the remote side correctly
- The `REJECT_CALL` event semantics — that's a design improvement, not a bug fix

## Git workflow

- Branch: `fix/002-closechat-state-leak`
- Commit message: `fix(app): call resetApp in closeChat to clean up state`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace peer.destroy() with resetApp() in closeChat

In `app/src/store/peer.ts`, change lines 303-309 from:

```typescript
  function closeChat() {
    wsState.conn?.emit(HANASU_EVENTS.REJECT_CALL, {
      to: chatUser.value?.id,
    });

    peer.value?.destroy();
  }
```

to:

```typescript
  function closeChat() {
    wsState.conn?.emit(HANASU_EVENTS.REJECT_CALL, {
      to: chatUser.value?.id,
    });

    nextTick(() => {
      resetApp();
    });
  }
```

This matches the pattern used in `cancelOutgoingCall` (lines 297-299) which also uses `nextTick` before `resetApp()`. The `nextTick` ensures the `REJECT_CALL` event is emitted before the state is wiped.

**Verify**: Open `app/src/store/peer.ts` and confirm `closeChat` now calls `resetApp()` inside `nextTick`, and the standalone `peer.value?.destroy()` is removed.

## Test plan

- No test framework exists in this repo. This is a fix verified by reading the code.
- Manual verification: start a chat, click the close button, confirm the UI resets to the "disconnected" state (no stale chat user, no stale messages, chat input disabled).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `app/src/store/peer.ts` `closeChat` function calls `resetApp()` (not `peer.value?.destroy()`)
- [ ] `grep -n "peer.value?.destroy" app/src/store/peer.ts` does NOT appear inside `closeChat` (it may appear elsewhere — that's fine)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] Plans index status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at lines 303-309 in `peer.ts` doesn't match the "Current state" excerpt.
- The fix appears to require touching an out-of-scope file.
- `resetApp` is not imported in `peer.ts` (it is — check line 12: `import { IMessage, appState, resetApp } from './app'`).

## Maintenance notes

- `resetApp` calls `peer?.destroy()` internally, so any code that calls `resetApp` should NOT also call `peer.destroy()` separately. The existing `cancelOutgoingCall` at lines 288-301 has this same double-destroy pattern (line 295: `peer.value?.destroy()`, then line 298: `resetApp()`). That's a separate cleanup opportunity — not in scope for this plan.
- The `REJECT_CALL` event sent by `closeChat` is semantically wrong for hanging up an active call (it should be a `HANG_UP` event), but changing the event protocol requires updating both client and server. Defer that to a separate plan.
