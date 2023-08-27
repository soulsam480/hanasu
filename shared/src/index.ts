export const HANASU_EVENTS = {
  CONN_SUCCESS: 'con_suc',
  USER_CONNECTED: 'u_con',
  USER_DISCONNECTED: 'u_dis',

  // call
  MAKE_CALL: 'm_call',
  CALL_MADE: 'c_mad',

  ACCEPT_CALL: 'a_call',
  CALL_ACCEPTED: 'c_acc',

  CANCEL_CALL: 'c_call',
  CALL_CANCELED: 'c_can',

  REJECT_CALL: 'r_call',
  CALL_REJECTED: 'c_rej',

  BUSY: 'busy',

  // moderation
  BLOCK_USER: 'b_user',
  UNBLOCK_USER: 'u_user',
  BLOCKED_USERS: 'b_users',
} as const;

export interface IMakeCallPayload {
  to: string;
  offer: any;
}

export interface IIncomingCallPayload {
  to: string;
  answer: any;
}

export interface ICallRejectedPayload {
  to: string;
}

export interface ICallCanceledPayload {
  to: string;
}

export interface IBlockUserPayload {
  id: string;
}

export interface IUser {
  id: string;
  name: string;
  connectedAt: string;
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
