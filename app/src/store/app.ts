import { ICallMadeParams, IMakeCallPayload, IUser } from '@hanasu/shared';
import { useStorage } from '@vueuse/core';
import type Peer from 'simple-peer';
import { reactive } from 'vue';

export const localUserId = useStorage<Omit<IUser, 'connectedAt'> | null>(
  'hanasu_user_id',
  null,
  localStorage,
  {
    serializer: {
      read: (v) => window.JSON.parse(window.atob(v)),
      write: (v) => window.btoa(window.JSON.stringify(v)),
    },
  },
);

export type TChatState = 'connected' | 'connecting' | 'sent' | 'disconnected';

export interface IMessage {
  content: string;
  owner: string;
  timestamp: number;
}

interface IAppState {
  chatState: TChatState;
  chatUser: IUser | null;
  incomingCall: ICallMadeParams | null;
  outgoingCall: IMakeCallPayload | null;
  peer: Peer.Instance | null;
  messages: IMessage[];
  isDrawerOpen: boolean;
  isSettingsDrawerOpen: boolean;
}

export const appState = reactive<IAppState>({
  peer: null,
  chatState: 'disconnected',
  chatUser: null,
  incomingCall: null,
  messages: [],
  isDrawerOpen: false,
  isSettingsDrawerOpen: false,
  outgoingCall: null,
});

export function resetApp() {
  appState.peer?.destroy();
  appState.peer = null;
  appState.chatState = 'disconnected';
  appState.incomingCall = null;
  appState.outgoingCall = null;
  appState.chatUser = null;
  appState.messages = [];
}
