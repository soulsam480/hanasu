import {
  HANASU_EVENTS,
  IAnswerMadeParams,
  ICallMadeParams,
  IUser,
} from '@hanasu/shared';
import { ElNotification } from 'element-plus';
import { Socket, io } from 'socket.io-client';
import { h, nextTick, reactive, toRefs } from 'vue';
import CallNotification from '../components/CallNotification.vue';
import { appState, resetApp } from '../store/app';

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

  const SERVER_URL =
    import.meta.env.VITE_PUBLIC_API_URL ?? 'http://localhost:8080';

  conn.value = io(SERVER_URL + `?name=${name}&id=${id}`, {
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
      message:
        'Server connection lost. refresh the page or retry after some time.',
    });
  });

  conn.value.on('reconnect_failed', () => {
    state.value = 'disconnected';

    resetApp();

    ElNotification.error({
      message:
        'Server connection lost. refresh the page or retry after some time.',
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
      ElNotification({
        message: h(CallNotification, {
          message: `Disconnected from ${appState.chatUser?.name}`,
          type: 'rejected',
        }),
      });

      resetApp();
    }

    users.value = users.value.filter((u) => u.id !== user.id);
  });

  conn.value.on(HANASU_EVENTS.CALL_MADE, (data: ICallMadeParams) => {
    // handle user busy state
    // at one point, we can only have one call
    if (appState.incomingCall !== null || appState.chatState === 'connected') {
      wsState.conn?.emit(HANASU_EVENTS.BUSY, {
        to: data.user.id,
      });

      return;
    }

    appState.incomingCall = data;

    ElNotification({
      title: 'Chat request',
      message: h(CallNotification, {
        type: 'incoming',
        message: `${data.user.name} is requesting to chat`,
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
    // handle chat close in same rejected event
    if (appState.chatState === 'connected' && appState.chatUser !== null) {
      appState.peer?.destroy();

      nextTick(() => {
        resetApp();
      });

      return;
    }

    ElNotification({
      message: h(CallNotification, {
        message: `${user.name} rejected your request`,
        type: 'rejected',
      }),
    });

    resetApp();
  });

  conn.value.on(HANASU_EVENTS.CALL_CANCELED, (user: IUser) => {
    ElNotification.closeAll();

    ElNotification({
      message: h(CallNotification, {
        message: `${user.name} canceled the request`,
        type: 'cancelled',
      }),
    });

    resetApp();
  });

  conn.value.on(HANASU_EVENTS.BUSY, (user: IUser) => {
    ElNotification({
      message: h(CallNotification, {
        message: `${user.name} is busy`,
        type: 'rejected',
      }),
    });

    resetApp();
  });

  return conn.value;
}
