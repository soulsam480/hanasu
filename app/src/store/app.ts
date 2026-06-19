import { ICallMadeParams, IMakeCallPayload, IUser } from '@hanasu/shared';
import { useStorage } from '@vueuse/core';
import type Peer from 'simple-peer';
import { reactive } from 'vue';

const SERIALIZER = {
  read: (v: string) => JSON.parse(decodeURIComponent(atob(v))),
  write: (v: any) => btoa(encodeURIComponent(JSON.stringify(v))),
};

export const localUserId = useStorage<Omit<IUser, 'connectedAt'> | null>(
  'hanasu_user_id',
  null,
  localStorage,
  {
    serializer: SERIALIZER,
  },
);

export interface IAppSettings {
  chatSounds: boolean;
  chatSoundFile: string;
  chatSoundVolume: number;
}

export const appSettings = useStorage<IAppSettings>(
  'hanasu_app_settings',
  {
    chatSounds: true,
    chatSoundFile: '/chat-sound-2.mp3',
    chatSoundVolume: 0.5,
  },
  localStorage,
  {
    serializer: SERIALIZER,
  },
);

export type TChatState = 'connected' | 'connecting' | 'sent' | 'disconnected';

export type TChatUserRole = 'caller' | 'callee';

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
  userRole: TChatUserRole | null;
  isMuted: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  micDenied: boolean;
  isRemoteSpeaking: boolean;
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
  userRole: null,
  isMuted: true,
  remoteStream: null,
  localStream: null,
  micDenied: false,
  isRemoteSpeaking: false,
});

export function resetApp() {
  appState.remoteStream?.getTracks().forEach((t) => t.stop());
  appState.localStream?.getTracks().forEach((t) => t.stop());

  appState.peer?.destroy();
  appState.peer = null;
  appState.chatState = 'disconnected';
  appState.incomingCall = null;
  appState.outgoingCall = null;
  appState.chatUser = null;
  appState.userRole = null;
  appState.messages = [];
  appState.isMuted = true;
  appState.remoteStream = null;
  appState.localStream = null;
  appState.micDenied = false;
  appState.isRemoteSpeaking = false;
}
