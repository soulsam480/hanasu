# Plan 003: Fix busy state to reject incoming calls during any active call state

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the plans index — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 826d547..HEAD -- app/src/store/ws.ts`
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

The busy state logic in `ws.ts:113-118` determines whether to reject an incoming call with a BUSY response. The current condition is:

```
(incomingCall !== null && outgoingCall !== null && incomingCall.user.id === outgoingCall.to)
|| incomingCall !== null
|| chatState === 'connected'
```

This misses the case where the user is mid-outgoing-call (`chatState === 'connecting'` or `'sent'`, `outgoingCall !== null`, `incomingCall === null`). None of the three clauses evaluate to `true` in that state, so the incoming call is accepted — leading to dual-call state where the user sees both an outgoing "waiting" indicator and an incoming call notification simultaneously.

The fix: simplify the condition to reject any incoming call when `chatState !== 'disconnected'` (i.e., the user is in ANY active call state — connecting, sent, or connected).

## Current state

- The relevant file:
  - `app/src/store/ws.ts` — WebSocket event handling; contains the busy check (lines 105-125)

- The buggy condition (lines 106-119):
```typescript
    const { incomingCall, outgoingCall, chatState } = appState;

    // handle user busy state
    // at one point, we can only have one call

    // if the incoming call is from the same user as outgoing call
    // then we need to reject the incoming call
    if (
      (incomingCall !== null &&
        outgoingCall !== null &&
        incomingCall.user.id === outgoingCall.to) ||
      incomingCall !== null ||
      chatState === 'connected'
    ) {
      wsState.conn?.emit(HANASU_EVENTS.BUSY, {
        to: data.user.id,
      });

      return;
    }
```

- State types from `app/src/store/app.ts:39`:
```typescript
export type TChatState = 'connected' | 'connecting' | 'sent' | 'disconnected';
```

- The busy check should trigger for ALL states except `'disconnected'`.

## Commands you will need

| Purpose   | Command                                          | Expected on success |
|-----------|--------------------------------------------------|---------------------|
| Typecheck | `cd app && npx vue-tsc --noEmit`                 | exit 0 (or pre-existing warnings only) |

## Scope

**In scope** (the only file you should modify):
- `app/src/store/ws.ts`

**Out of scope** (do NOT touch, even though they look related):
- `app/src/store/peer.ts` — the busy notification is shown there but the logic is in ws.ts
- `api/src/index.ts` — server-side has no busy logic; it just relays events

## Git workflow

- Branch: `fix/003-busy-state-logic`
- Commit message: `fix(app): reject incoming calls during any active call state`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Simplify the busy condition

In `app/src/store/ws.ts`, replace lines 106-119 from:

```typescript
    const { incomingCall, outgoingCall, chatState } = appState;

    // handle user busy state
    // at one point, we can only have one call

    // if the incoming call is from the same user as outgoing call
    // then we need to reject the incoming call
    if (
      (incomingCall !== null &&
        outgoingCall !== null &&
        incomingCall.user.id === outgoingCall.to) ||
      incomingCall !== null ||
      chatState === 'connected'
    ) {
```

to:

```typescript
    const { chatState } = appState;

    // reject incoming calls when already in any active call state
    if (chatState !== 'disconnected') {
```

This covers all active states: `'connecting'` (mid-outgoing), `'sent'` (outgoing signal sent), and `'connected'` (in active chat). The old complex condition was trying to enumerate specific state combinations but missed the outgoing-call case.

**Verify**: Open `app/src/store/ws.ts` and confirm:
- Line 106 destructures only `chatState` (no `incomingCall`, no `outgoingCall`)
- The busy condition is `if (chatState !== 'disconnected')`

## Test plan

- No test framework exists in this repo. This is a logic fix verified by reading the code.
- Manual verification scenarios:
  1. User A calls User B (A sees "connecting") → User C tries to call User A → A should receive BUSY response (not see dual notifications)
  2. User A is in an active chat with User B → User C tries to call User A → A should receive BUSY response
  3. User A is idle → User B calls User A → A should see incoming call notification (not rejected as busy)

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `app/src/store/ws.ts` line 106 destructures only `chatState` (no `incomingCall`, no `outgoingCall`)
- [ ] `app/src/store/ws.ts` busy condition is `chatState !== 'disconnected'`
- [ ] `grep -n "incomingCall" app/src/store/ws.ts` returns no matches in the `CALL_MADE` handler (lines 105-125)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] Plans index status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at lines 105-125 in `ws.ts` doesn't match the "Current state" excerpt.
- The fix appears to require touching an out-of-scope file.
- You discover that `chatState` is `'disconnected'` when it shouldn't be (e.g., a race condition where state is reset before the `CALL_MADE` event arrives).

## Maintenance notes

- The simplified condition is strictly more conservative: it rejects incoming calls whenever the user is in any non-disconnected state. If the app later supports multiple concurrent calls, this condition will need to be revisited.
- The `outgoingCall` variable was only used in the old complex condition. After this change, the `CALL_MADE` handler no longer references it. If `outgoingCall` is needed elsewhere in this handler in the future, re-add the destructuring.
