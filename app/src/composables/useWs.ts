import { Socket, io } from 'socket.io-client';
import { reactive } from 'vue';

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

export function createConnection(name: string) {
  if (wsState.conn !== null) return;

  wsState.state = 'connecting';

  wsState.conn = io('http://localhost:8080' + `?name=${name}`, {
    transports: ['websocket'],
  });

  wsState.conn.on('connect', () => {
    wsState.state = 'connected';
  });

  wsState.conn.on('reconnect_attempt', () => {
    wsState.state = 'reconnecting';
  });

  wsState.conn.on('disconnect', () => {
    wsState.state = 'disconnected';
  });

  wsState.conn.on('reconnect_failed', () => {
    wsState.state = 'disconnected';
  });

  // data
  wsState.conn.on(HANASU_EVENTS.CONN_SUCCESS, (users: IUser[]) => {
    wsState.users = users;
  });

  wsState.conn.on(HANASU_EVENTS.USER_CONNECTED, (user) => {
    console.log('new user', user);

    wsState.users.push(user);
  });

  wsState.conn.on(HANASU_EVENTS.USER_DISCONNECTED, (user) => {
    wsState.users = wsState.users.filter((u) => u.id !== user.id);
  });

  //   wsState.conn.on(HANASU_EVENTS.BLOCKED_USERS, (users: IUser[]) => {

  return wsState.conn;
}
