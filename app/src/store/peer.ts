import {
  HANASU_EVENTS,
  ICallMadeParams,
  IMakeCallPayload,
  IUser,
} from '@hanasu/shared';
import { ElNotification } from 'element-plus';
import Peer from 'simple-peer';
import { h, nextTick, toRefs } from 'vue';
import PhSkull from '~icons/ph/skull-duotone';
import CallNotification from '../components/CallNotification.vue';
import { IMessage, appState, resetApp } from './app';
import { wsState } from './ws';

const RTC_CONFIG = {
  iceServers: [
    {
      urls: ['turn:openrelay.metered.ca:80'],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
};

function setupCommonPeerEventListeners(peer: Peer.Instance) {
  const { chatState, chatUser, messages } = toRefs(appState);

  peer.on('data', (data) => {
    messages.value.push(JSON.parse(new TextDecoder().decode(data)));
  });

  peer.on('connect', () => {
    chatState.value = 'connected';
    appState.outgoingCall = null;

    ElNotification({
      message: h(CallNotification, {
        message: `Connected to ${chatUser.value?.name}`,
        type: 'accepted',
      }),
    });
  });

  peer.on('close', () => {
    nextTick(() => {
      ElNotification({
        message: h(CallNotification, {
          message:
            chatUser.value?.name !== undefined
              ? `Disconnected from ${chatUser.value.name}`
              : 'Closed peer connection',
          type: 'rejected',
        }),
      });

      resetApp();
    });
  });

  peer.on('error', (err) => {
    console.error('[HANASU PEER ERROR]: ', err);

    if (err instanceof Error) {
      const code = (err as any).code;
      let message = err.message;

      if (code === 'ERR_DATA_CHANNEL') {
        ElNotification.warning({
          message: 'Some error occured while sending message',
          icon: PhSkull,
        });

        return;
      }

      if (code === 'ERR_CONNECTION_FAILURE') {
        message =
          message +
          'Make sure either you or the other person is not behind a firewall or a VPN.';
      }

      ElNotification({
        message: h(CallNotification, {
          message: message,
          subMessage: err.message,
          type: 'rejected',
        }),
      });
    }
  });
}

export function usePeer() {
  const { chatState, chatUser, peer, incomingCall, userRole } =
    toRefs(appState);

  async function makeCall(user: IUser) {
    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      appState.localStream = stream;
      appState.isMuted = true;
      stream.getAudioTracks()[0].enabled = false;
    } catch {
      appState.micDenied = true;
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

    setupCommonPeerEventListeners(peer.value);

    peer.value?.on('signal', (data) => {
      if (data.type === 'renegotiate' || data.type === 'transceiverRequest') {
        return;
      }

      const payload: IMakeCallPayload = {
        offer: JSON.stringify(data),
        to: user.id,
      };

      wsState.conn?.emit(HANASU_EVENTS.MAKE_CALL, payload);

      appState.outgoingCall = payload;
      appState.chatState = 'sent';

      ElNotification({
        message: h(CallNotification, {
          message: `Sent chat request to ${user.name}...`,
          type: 'outgoing',
        }),
      });
    });

    peer.value?.on('stream', (remoteStream) => {
      appState.remoteStream = remoteStream;
    });
  }

  async function acceptCall(callPayload: ICallMadeParams) {
    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      appState.localStream = stream;
      appState.isMuted = true;
      stream.getAudioTracks()[0].enabled = false;
    } catch {
      appState.micDenied = true;
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

    peer.value?.on('stream', (remoteStream) => {
      appState.remoteStream = remoteStream;
    });
  }

  function rejectCall(callPaylaod: ICallMadeParams) {
    wsState.conn?.emit(HANASU_EVENTS.REJECT_CALL, {
      to: callPaylaod.user.id,
    });

    incomingCall.value = null;
  }

  function sendMessage(message: IMessage) {
    if (peer.value?.writable !== true) return;

    peer.value?.send(JSON.stringify(message));
  }

  function cancelOutgoingCall() {
    if (appState.outgoingCall !== null) {
      wsState.conn?.emit(HANASU_EVENTS.CANCEL_CALL, {
        to: appState.outgoingCall.to,
      });

      // wait for notification
      peer.value?.destroy();

      nextTick(() => {
        resetApp();
      });
    }
  }

  function closeChat() {
    wsState.conn?.emit(HANASU_EVENTS.REJECT_CALL, {
      to: chatUser.value?.id,
    });

    nextTick(() => {
      resetApp();
    });
  }

  function setMuted(muted: boolean) {
    appState.isMuted = muted;
    appState.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

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
    setMuted,
  };
}
