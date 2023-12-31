import {
  HANASU_EVENTS,
  IBlockUserPayload,
  ICallCanceledPayload,
  ICallRejectedPayload,
  IIncomingCallPayload,
  IMakeCallPayload,
} from '@hanasu/shared';
import { Server as HTTPServer, createServer } from 'http';
import { Server, Socket } from 'socket.io';

interface IHanasuUser {
  name: string;
  socketId: string;
  localId: string;
  connectedAt: string;
}

class Hanasu {
  private httpServer: HTTPServer;
  private wss: Server;
  private clients: IHanasuUser[] = [];
  private blockedClients: Map<string, IHanasuUser[]> = new Map();

  constructor() {
    this.httpServer = createServer();

    this.wss = new Server(this.httpServer, {
      cors: {
        origin:
          process.env.NODE_ENV === 'production'
            ? ['https://hanasu.sambitsahoo.com', 'https://rtc.sambitsahoo.com']
            : ['http://localhost:5173', 'http://192.168.0.103:5173'],
      },
    });

    this.wss.on('connection', this.#handleConnection.bind(this));
  }

  init() {
    this.httpServer.listen(process.env.PORT ?? 8080, () => {
      console.log(`Server started on port ${process.env.PORT ?? 8080}`);
    });
  }

  #currentClient(socket: Socket) {
    return this.clients.find((el) => el.socketId === socket.id);
  }

  #getClientWithLocalId(id: string) {
    return this.clients.find((el) => el.localId === id);
  }

  #handleConnection(socket: Socket) {
    const url =
      socket.request.url !== undefined
        ? new URL(socket.request.url, 'http://localhost:8080')
        : null;

    const name = url?.searchParams.get('name') ?? null;
    const localId = url?.searchParams.get('id') ?? null;

    if (name === null || localId === null) return;

    const user: IHanasuUser = {
      socketId: socket.id,
      name,
      localId,
      connectedAt: new Date().toISOString(),
    };

    if (this.clients.find((el) => el.localId === user.localId) === undefined) {
      this.clients.push(user);
    } else {
      this.clients = this.clients.map((el) =>
        el.localId === user.localId ? user : el,
      );
    }

    socket.emit(
      HANASU_EVENTS.CONN_SUCCESS,
      this.clients
        .filter((el) => el.localId !== user.localId)
        .map(Hanasu.stripId),
    );

    socket.broadcast.emit(HANASU_EVENTS.USER_CONNECTED, Hanasu.stripId(user));

    socket.on(HANASU_EVENTS.MAKE_CALL, this.#handleCall.bind(this, socket));
    socket.on(HANASU_EVENTS.ACCEPT_CALL, this.#handleAnswer.bind(this, socket));

    socket.on(
      HANASU_EVENTS.REJECT_CALL,
      this.#handleRejection.bind(this, socket),
    );

    socket.on(
      HANASU_EVENTS.CANCEL_CALL,
      this.#handleCancellation.bind(this, socket),
    );

    socket.on(HANASU_EVENTS.BUSY, this.#handleBusy.bind(this, socket));

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

    this.clients = this.clients.filter(
      (el) => el.socketId !== currentUser.socketId,
    );

    socket.broadcast.emit(
      HANASU_EVENTS.USER_DISCONNECTED,
      Hanasu.stripId(currentUser),
    );
  }

  #handleCall(socket: Socket, data: IMakeCallPayload) {
    const currentUser = this.#currentClient(socket);
    const to = this.#getClientWithLocalId(data.to);

    if (currentUser === undefined || to === undefined) return;

    socket.to(to.socketId).emit(HANASU_EVENTS.CALL_MADE, {
      offer: data.offer,
      user: Hanasu.stripId(currentUser),
    });
  }

  #handleAnswer(socket: Socket, data: IIncomingCallPayload) {
    const currentUser = this.#currentClient(socket);
    const to = this.#getClientWithLocalId(data.to);

    if (currentUser === undefined || to === undefined) return;

    socket.to(to.socketId).emit(HANASU_EVENTS.CALL_ACCEPTED, {
      answer: data.answer,
      user: Hanasu.stripId(currentUser),
    });
  }

  #handleRejection(socket: Socket, data: ICallRejectedPayload) {
    const currentUser = this.#currentClient(socket);
    const to = this.#getClientWithLocalId(data.to);

    if (currentUser === undefined || to === undefined) return;

    socket
      .to(to.socketId)
      .emit(HANASU_EVENTS.CALL_REJECTED, Hanasu.stripId(currentUser));
  }

  #handleCancellation(socket: Socket, data: ICallCanceledPayload) {
    const currentUser = this.#currentClient(socket);
    const to = this.#getClientWithLocalId(data.to);

    if (currentUser === undefined || to === undefined) return;

    socket
      .to(to.socketId)
      .emit(HANASU_EVENTS.CALL_CANCELED, Hanasu.stripId(currentUser));
  }

  #handleBusy(socket: Socket, data: ICallCanceledPayload) {
    const currentUser = this.#currentClient(socket);
    const to = this.#getClientWithLocalId(data.to);

    if (currentUser === undefined || to === undefined) return;

    socket
      .to(to.socketId)
      .emit(HANASU_EVENTS.BUSY, Hanasu.stripId(currentUser));
  }

  #isBlocked(lcoalId: string, id: string) {
    return (
      this.#blockedUsers(lcoalId).find((el) => el.localId === id) !== undefined
    );
  }

  #blockedUsers(localId: string) {
    return this.blockedClients.get(localId) ?? [];
  }

  #handleBlock(socket: Socket, data: IBlockUserPayload) {
    const currentUser = this.#currentClient(socket);

    if (
      currentUser === undefined ||
      this.#isBlocked(currentUser.localId, data.id)
    ) {
      return;
    }

    const blockedUser = this.clients.find((el) => el.localId === data.id);

    if (blockedUser === undefined) return;

    if (this.blockedClients.get(currentUser.localId) === undefined) {
      this.blockedClients.set(currentUser.localId, [blockedUser]);
    } else {
      this.blockedClients.set(currentUser.localId, [
        ...this.#blockedUsers(currentUser.localId),
        blockedUser,
      ]);
    }

    socket.emit(
      HANASU_EVENTS.BLOCKED_USERS,
      this.#blockedUsers(currentUser.localId).map(Hanasu.stripId),
    );
  }

  #handleUnblock(socket: Socket, data: IBlockUserPayload) {
    const currentUser = this.#currentClient(socket);

    if (
      currentUser === undefined ||
      !this.#isBlocked(currentUser.localId, data.id)
    ) {
      return;
    }

    const blockedUser = this.clients.find((el) => el.localId === data.id);

    if (blockedUser === undefined) return;

    this.blockedClients.set(
      currentUser.localId,
      this.#blockedUsers(currentUser.localId).filter(
        (el) => el.localId !== blockedUser.localId,
      ),
    );

    socket.emit(
      HANASU_EVENTS.BLOCKED_USERS,
      this.#blockedUsers(currentUser.localId).map(Hanasu.stripId),
    );
  }

  #handleBlockedUsers(socket: Socket) {
    const currentUser = this.#currentClient(socket);

    if (currentUser === undefined) return;

    socket.emit(
      HANASU_EVENTS.BLOCKED_USERS,
      this.#blockedUsers(currentUser.localId).map(Hanasu.stripId),
    );
  }

  static stripId({ name, localId, connectedAt }: IHanasuUser) {
    return {
      name,
      connectedAt,
      id: localId,
    };
  }
}

process.on('uncaughtException', (e) => {
  console.log(e);
});

process.on('unhandledRejection', (e) => {
  console.log(e);
});

const hanasu = new Hanasu();

hanasu.init();
