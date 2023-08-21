import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

interface IHanasuUser {
  name: string;
  id: string;
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

interface IMakeCallPayload {
  to: string;
  offer: any;
}

interface IIncomingCallPayload {
  to: string;
  answer: any;
}

interface ICallRejectedPayload {
  to: string;
}

interface IBlockUserPayload {
  id: string;
}

class Hanasu {
  private wss: Server;
  private clients: IHanasuUser[] = [];
  private blockedClients: Map<string, IHanasuUser[]> = new Map();

  constructor() {
    const httpServer = createServer();

    this.wss = new Server(httpServer);

    this.wss.on('connection', this.#handleConnection.bind(this));

    httpServer.listen(process.env.PORT ?? 8080, () => {
      console.log(`Server started on port ${process.env.PORT ?? 8080}`);
    });
  }

  #currentClient(socket: Socket) {
    return this.clients.find((el) => el.id === socket.id);
  }

  #handleConnection(socket: Socket) {
    const url =
      socket.request.url !== undefined
        ? new URL(socket.request.url, 'http://localhost:8080')
        : null;
    const name = url?.searchParams.get('name') ?? socket.id;

    const user: IHanasuUser = {
      id: socket.id,
      name,
    };

    if (this.clients.find((el) => el.id === user.id) !== undefined) {
      this.clients.push(user);
    }

    socket.emit(
      HANASU_EVENTS.CONN_SUCCESS,
      this.clients.filter((el) => el.id !== user.id),
    );

    socket.broadcast.emit(HANASU_EVENTS.USER_CONNECTED, user);

    socket.on(HANASU_EVENTS.MAKE_CALL, this.#handleCall.bind(this, socket));
    socket.on(HANASU_EVENTS.ACCEPT_CALL, this.#handleAnswer.bind(this, socket));

    socket.on(
      HANASU_EVENTS.REJECT_CALL,
      this.#handleRejection.bind(this, socket),
    );

    socket.on('disconnect', this.#handleDisconnection.bind(this, socket));

    // moderation
    socket.on(HANASU_EVENTS.BLOCK_USER, this.#handleBlock.bind(this, socket));

    socket.on(
      HANASU_EVENTS.UNBLOCK_USER,
      this.#handleUnblock.bind(this, socket),
    );

    socket.on(
      HANASU_EVENTS.BLOCKED_USERS,
      this.#handleBlockedUsers.bind(this, socket),
    );
  }

  #handleDisconnection(socket: Socket) {
    const currentUser = this.#currentClient(socket);

    if (currentUser === undefined) return;

    this.clients = this.clients.filter((el) => el.id !== currentUser.id);

    socket.broadcast.emit(HANASU_EVENTS.USER_DISCONNECTED, currentUser);
  }

  #handleCall(socket: Socket, data: IMakeCallPayload) {
    const currentUser = this.#currentClient(socket);

    if (currentUser === undefined) return;

    socket.to(data.to).emit(HANASU_EVENTS.CALL_MADE, {
      offer: data.offer,
      user: currentUser,
    });
  }

  #handleAnswer(socket: Socket, data: IIncomingCallPayload) {
    const currentUser = this.#currentClient(socket);

    if (currentUser === undefined) return;

    socket.to(data.to).emit(HANASU_EVENTS.CALL_ACCEPTED, {
      answer: data.answer,
      user: currentUser,
    });
  }

  #handleRejection(socket: Socket, data: ICallRejectedPayload) {
    const currentUser = this.#currentClient(socket);

    if (currentUser === undefined) return;

    socket.to(data.to).emit(HANASU_EVENTS.CALL_REJECTED, {
      user: currentUser,
    });
  }

  #isBlocked(socket: Socket, id: string) {
    return this.#blockedUsers(socket).find((el) => el.id === id) !== undefined;
  }

  #blockedUsers(socket: Socket) {
    return this.blockedClients.get(socket.id) ?? [];
  }

  #handleBlock(socket: Socket, data: IBlockUserPayload) {
    if (
      this.#currentClient(socket) === undefined ||
      this.#isBlocked(socket, data.id)
    )
      return;

    const blockedUser = this.clients.find((el) => el.id === data.id);

    if (blockedUser === undefined) return;

    if (this.blockedClients.get(socket.id) === undefined) {
      this.blockedClients.set(socket.id, [blockedUser]);
    } else {
      this.blockedClients.set(socket.id, [
        ...this.#blockedUsers(socket),
        blockedUser,
      ]);
    }

    socket.emit(HANASU_EVENTS.BLOCKED_USERS, this.#blockedUsers(socket));
  }

  #handleUnblock(socket: Socket, data: IBlockUserPayload) {
    if (
      this.#currentClient(socket) === undefined ||
      !this.#isBlocked(socket, data.id)
    )
      return;

    const blockedUser = this.clients.find((el) => el.id === data.id);

    if (blockedUser === undefined) return;

    this.blockedClients.set(
      socket.id,
      this.#blockedUsers(socket).filter((el) => el.id !== blockedUser.id),
    );

    socket.emit(HANASU_EVENTS.BLOCKED_USERS, this.#blockedUsers(socket));
  }

  #handleBlockedUsers(socket: Socket) {
    if (this.#currentClient(socket) === undefined) return;

    socket.emit(HANASU_EVENTS.BLOCKED_USERS, this.#blockedUsers(socket));
  }
}

process.on('uncaughtException', (e) => {
  console.log(e);
  process.exit(1);
});

process.on('unhandledRejection', (e) => {
  console.log(e);
  process.exit(1);
});

new Hanasu();
