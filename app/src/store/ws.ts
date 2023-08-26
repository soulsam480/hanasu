import { ElNotification } from 'element-plus';
import { Socket, io } from 'socket.io-client';
import { h, reactive, toRefs } from 'vue';
import CallNotification from '../components/CallNotification.vue';
import { appState, resetApp } from '../store/app';

export interface IUser {
  id: string;
  name: string;
  connectedAt: string;
}

export interface IMakeCallParams {
  to: string;
  offer: string;
}

/**
 * incoming
 */
export interface ICallMadeParams {
  offer: string;
  user: IUser;
}

/**
 * outgoing
 */
export interface IAnswerMadeParams {
  answer: string;
  user: IUser;
}

export const HANASU_EVENTS = {
  CONN_SUCCESS: 'con_suc',
  USER_CONNECTED: 'u_con',
  USER_DISCONNECTED: 'u_dis',

  // call
  MAKE_CALL: 'm_call',
  CALL_MADE: 'c_mad',

  ACCEPT_CALL: 'a_call',
  CALL_ACCEPTED: 'c_acc',

  REJECT_CALL: 'r_call',
  CALL_REJECTED: 'c_rej',

  // moderation
  BLOCK_USER: 'b_user',
  UNBLOCK_USER: 'u_user',
  BLOCKED_USERS: 'b_users',
} as const;

interface ISocketState {
  conn: Socket | null;
  state: 'disconnected' | 'connected' | 'connecting' | 'reconnecting';
  users: IUser[];
}

export const wsState = reactive<ISocketState>({
  conn: null,
  state: 'disconnected',
  users: [],
});

export function createConnection({ name, id }: Omit<IUser, 'connectedAt'>) {
  const { conn, state, users } = toRefs(wsState);

  if (conn.value !== null) return;

  state.value = 'connecting';

  ElNotification({
    message: 'Connecting to server...',
  });

  conn.value = io('http://localhost:8080' + `?name=${name}&id=${id}`, {
    transports: ['websocket'],
  });

  conn.value.on('connect', () => {
    state.value = 'connected';

    ElNotification.success({
      message: 'Server connected!',
    });
  });

  conn.value.on('reconnect_attempt', () => {
    state.value = 'reconnecting';

    ElNotification.success({
      message: 'Server connection lost, trying to reconnect...',
    });
  });

  conn.value.on('disconnect', () => {
    state.value = 'disconnected';

    resetApp();

    ElNotification.error({
      message: 'Server connection lost',
    });
  });

  conn.value.on('reconnect_failed', () => {
    state.value = 'disconnected';

    resetApp();

    ElNotification.error({
      message: 'Server connection lost',
    });
  });

  // data
  conn.value.on(HANASU_EVENTS.CONN_SUCCESS, (fromAPI: IUser[]) => {
    users.value = fromAPI;
  });

  conn.value.on(HANASU_EVENTS.USER_CONNECTED, (user: IUser) => {
    users.value.push(user);
  });

  conn.value.on(HANASU_EVENTS.USER_DISCONNECTED, (user: IUser) => {
    if (user.id === appState.chatUser?.id) {
      resetApp();
    }

    users.value = users.value.filter((u) => u.id !== user.id);
  });

  conn.value.on(HANASU_EVENTS.CALL_MADE, (data: ICallMadeParams) => {
    appState.incomingCall = data;

    ElNotification({
      title: 'Chat request',
      message: h(CallNotification, {
        type: 'incoming',
        message: `${data.user.name} requesting to chat`,
        subMessage: data.user.id,
      }),
      duration: 0,
      showClose: false,
    });
  });

  conn.value.on(HANASU_EVENTS.CALL_ACCEPTED, (data: IAnswerMadeParams) => {
    appState.peer?.signal(data.answer);
  });

  conn.value.on(HANASU_EVENTS.CALL_REJECTED, (user: IUser) => {
    ElNotification({
      message: h(CallNotification, {
        message: `${user.name} rejected your request`,
        type: 'rejected',
      }),
    });

    resetApp();
  });

  return conn.value;
}
