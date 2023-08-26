import { useStorage } from '@vueuse/core';
import type Peer from 'simple-peer';
import { reactive } from 'vue';
import { ICallMadeParams, IUser } from './ws';

export const localUserId = useStorage<Omit<IUser, 'connectedAt'> | null>(
  'hanasu_user_id',
  null,
  localStorage,
  {
    serializer: {
      read: (v) => JSON.parse(v),
      write: (v) => JSON.stringify(v),
    },
  },
);

export type TChatState = 'connected' | 'connecting' | 'disconnected';

interface IAppState {
  chatState: TChatState;
  chatUser: IUser | null;
  incomingCall: ICallMadeParams | null;
  peer: Peer.Instance | null;
}

export const appState = reactive<IAppState>({
  peer: null,
  chatState: 'disconnected',
  chatUser: null,
  incomingCall: null,
});

export function resetApp() {
  appState.peer?.destroy();
  appState.peer = null;
  appState.chatState = 'disconnected';
  appState.incomingCall = null;
  appState.chatUser = null;
}
