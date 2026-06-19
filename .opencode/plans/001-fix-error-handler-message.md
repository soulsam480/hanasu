# Plan 001: Display constructed error message in peer error notification

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
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

The peer error handler at `peer.ts:127-157` builds a helpful message for `ERR_CONNECTION_FAILURE` errors — it appends "Make sure either you or the other person is not behind a firewall or a VPN." to the error message. But the `ElNotification` call at lines 149-155 passes `err.name` as the notification message and `err.message` as the subMessage, completely ignoring the constructed `message` variable. Users see a raw error name like "RTCPeerConnectionError" instead of actionable guidance about firewalls and VPNs.

## Current state

- The relevant file:
  - `app/src/store/peer.ts` — WebRTC peer lifecycle; contains the error handler (lines 127-157)

- The bug (lines 143-155):
```typescript
      if (code === 'ERR_CONNECTION_FAILURE') {
        message =
          message +
          'Make sure either you or the other person is not behind a firewall or a VPN.';
      }

      ElNotification({
        message: h(CallNotification, {
          message: err.name,       // <-- BUG: should use `message`
          subMessage: err.message, // <-- should stay as `err.message`
          type: 'rejected',
        }),
      });
```

- The `message` variable (line 132) starts as `err.message`, then gets the VPN hint appended for `ERR_CONNECTION_FAILURE`. The fix is to pass this constructed `message` to the notification instead of `err.name`.

- Repo conventions: notifications use `ElNotification` with `h(CallNotification, { message, subMessage, type })`. The `CallNotification` component renders `message` as the bold title and `subMessage` as smaller text below it.

## Commands you will need

| Purpose   | Command                                          | Expected on success |
|-----------|--------------------------------------------------|---------------------|
| Typecheck | `cd app && npx vue-tsc --noEmit`                 | exit 0 (or pre-existing warnings only) |

## Scope

**In scope** (the only file you should modify):
- `app/src/store/peer.ts`

**Out of scope** (do NOT touch, even though they look related):
- `app/src/components/CallNotification.vue` — the component works correctly; only the values passed to it are wrong
- `app/src/store/ws.ts` — separate error handling path

## Git workflow

- Branch: `fix/001-error-handler-message`
- Commit message: `fix(app): display constructed error message in peer error notification`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix the notification to display the constructed message

In `app/src/store/peer.ts`, change lines 149-155 from:

```typescript
      ElNotification({
        message: h(CallNotification, {
          message: err.name,
          subMessage: err.message,
          type: 'rejected',
        }),
      });
```

to:

```typescript
      ElNotification({
        message: h(CallNotification, {
          message: message,
          subMessage: err.message,
          type: 'rejected',
        }),
      });
```

The variable `message` (line 132) already contains the VPN hint for `ERR_CONNECTION_FAILURE` codes, and falls back to `err.message` for other codes. Using it as the notification `message` prop shows the right text in all cases.

**Verify**: Open `app/src/store/peer.ts` and confirm lines 149-155 now pass `message` (not `err.name`) as the `message` prop.

## Test plan

- No test framework exists in this repo. This is a one-line fix verified by reading the code.
- Manual verification: trigger a peer connection failure (e.g., connect through a restrictive firewall) and confirm the notification shows the VPN/firewall hint instead of a raw error name.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `app/src/store/peer.ts` line 151 reads `message: message,` (not `message: err.name,`)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] Plans index status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at lines 149-155 in `peer.ts` doesn't match the "Current state" excerpt (the codebase has drifted since this plan was written).
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

- The `message` variable is reassigned per error code (line 132: `let message = err.message`). If new error codes are added in the future, the VPN hint should be added as another `if` branch modifying `message`, and it will automatically display correctly.
- The `ERR_DATA_CHANNEL` branch (lines 134-141) returns early with its own notification and is not affected by this change.
