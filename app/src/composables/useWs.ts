import { Socket, io } from 'socket.io-client';
import { reactive, toRefs } from 'vue';
import { ILocalUserId } from '../store/app';

export interface IUser {
  id: string;
  name: string;
}

const HANASU_EVENTS = {
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

export function createConnection({ name, id }: ILocalUserId) {
  const { conn, state, users } = toRefs(wsState);

  if (conn.value !== null) return;

  state.value = 'connecting';

  conn.value = io('http://localhost:8080' + `?name=${name}&id=${id}`, {
    transports: ['websocket'],
  });

  conn.value.on('connect', () => {
    state.value = 'connected';
  });

  conn.value.on('reconnect_attempt', () => {
    state.value = 'reconnecting';
  });

  conn.value.on('disconnect', () => {
    state.value = 'disconnected';
  });

  conn.value.on('reconnect_failed', () => {
    state.value = 'disconnected';
  });

  // data
  conn.value.on(HANASU_EVENTS.CONN_SUCCESS, (fromAPI: IUser[]) => {
    console.log(fromAPI);

    users.value = fromAPI;
  });

  conn.value.on(HANASU_EVENTS.USER_CONNECTED, (user) => {
    console.log('user', user);

    users.value.push(user);
  });

  conn.value.on(HANASU_EVENTS.USER_DISCONNECTED, (user) => {
    users.value = users.value.filter((u) => u.id !== user.id);
  });

  return conn.value;
}
