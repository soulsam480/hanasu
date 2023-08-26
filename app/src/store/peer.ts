import { ElNotification } from 'element-plus';
import Peer from 'simple-peer';
import { h, toRefs } from 'vue';
import CallNotification from '../components/CallNotification.vue';
import { IMessage, appState, resetApp } from './app';
import { HANASU_EVENTS, ICallMadeParams, IUser, wsState } from './ws';

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
        message: `Disconnected from ${chatUser.value?.name}`,
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
        message: `Sending chat request to ${user.name}...`,
        type: 'outgoing',
      }),
    });

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

      wsState.conn?.emit(HANASU_EVENTS.MAKE_CALL, {
        offer: JSON.stringify(data),
        to: user.id,
      });

      chatUser.value = user;
      chatState.value = 'connecting';

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
    wsState.conn?.emit('make-rejection', {
      to: callPaylaod.user.id,
    });

    incomingCall.value = null;
  }

  function sendMessage(message: IMessage) {
    if (peer.value?.writable !== true) return;

    peer.value?.send(JSON.stringify(message));
  }

  return {
    peer,
    chatUser,
    chatState,
    makeCall,
    acceptCall,
    rejectCall,
    sendMessage,
  };
}
