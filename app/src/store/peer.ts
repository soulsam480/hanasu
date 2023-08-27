import {
  HANASU_EVENTS,
  ICallMadeParams,
  IMakeCallPayload,
  IUser,
} from '@hanasu/shared';
import { ElNotification } from 'element-plus';
import Peer from 'simple-peer';
import { h, nextTick, toRefs } from 'vue';
import CallNotification from '../components/CallNotification.vue';
import { IMessage, appState, resetApp } from './app';
import { wsState } from './ws';

const RTC_CONFIG = {
  iceServers: [
    {
      urls: ['turn:13.250.13.83:3478?transport=udp'],
      username: 'YzYNCouZM1mhqhmseWk6',
      credential: 'YzYNCouZM1mhqhmseWk6',
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
    // killAudio();
    // (stream.value as MediaStream).getAudioTracks()[0].enabled = false;
    // isMuted.value = true;

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
}

export function usePeer() {
  const { chatState, chatUser, peer, incomingCall } = toRefs(appState);

  function makeCall(user: IUser) {
    ElNotification({
      message: h(CallNotification, {
        message: `Sending chat request to ${user.name}`,
        type: 'outgoing',
      }),
    });

    chatState.value = 'connecting';
    chatUser.value = user;

    peer.value = new Peer({
      initiator: true,
      trickle: false,
      config: RTC_CONFIG,
      // stream: stream.value as MediaStream,
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

    // peer.value?.on('stream', (stream) => {
    //   const audio = document.querySelector('audio') as HTMLAudioElement;
    //   audio.load();
    //   if ('srcObject' in audio) {
    //     audio.srcObject = stream;
    //   } else {
    //     (audio as any).src = window.URL.createObjectURL(stream); // for older browsers
    //   }
    //   const playPromise = audio.play();
    //   if (playPromise !== undefined) {
    //     playPromise.catch((error) => {
    //       console.log(error);
    //       audio.pause();
    //     });
    //   }
    // });
  }

  function acceptCall(callPayload: ICallMadeParams) {
    peer.value = new Peer({
      trickle: false,
      config: RTC_CONFIG,
      // stream: stream.value as MediaStream,
    });

    setupCommonPeerEventListeners(peer.value);

    peer.value?.signal(callPayload.offer);

    peer.value?.on('signal', (data) => {
      if (data.type === 'renegotiate' || data.type === 'transceiverRequest') {
        return;
      }

      wsState.conn?.emit(HANASU_EVENTS.ACCEPT_CALL, {
        answer: JSON.stringify(data),
        to: callPayload.user.id,
      });

      incomingCall.value = null;
      chatState.value = 'connecting';
      chatUser.value = callPayload.user;
    });

    // peer.value?.on('stream', (stream) => {
    //   const audio = document.querySelector('audio') as HTMLAudioElement;
    //   audio.load();
    //   if ('srcObject' in audio) {
    //     audio.srcObject = stream;
    //   } else {
    //     (audio as any).src = window.URL.createObjectURL(stream); // for older browsers
    //   }
    //   const playPromise = audio.play();
    //   if (playPromise !== undefined) {
    //     playPromise.catch((error) => {
    //       console.log(error);
    //       audio.pause();
    //     });
    //   }
    // });
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

    peer.value?.destroy();
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
  };
}
