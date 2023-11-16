import { InvitationAcceptOptions } from 'sip.js/lib/api/invitation-accept-options.js';
import { InviterInviteOptions } from 'sip.js/lib/api/inviter-invite-options.js';
import { InviterOptions } from 'sip.js/lib/api/inviter-options.js';
import { Logger } from 'sip.js/lib/core/log/logger.js';
import { Message } from 'sip.js/lib/api/message.js';
import { RegistererRegisterOptions } from 'sip.js/lib/api/registerer-register-options.js';
import { RegistererUnregisterOptions } from 'sip.js/lib/api/registerer-unregister-options.js';
import { Session } from 'sip.js/lib/api/session.js';
import { SessionManager } from 'sip.js/lib/platform/web/session-manager/session-manager.js';
import { SessionManagerOptions } from 'sip.js/lib/platform/web/session-manager/session-manager-options.js';
import { OnTopSipDelegate } from './client-delegate.js';
import { OnTopSipClientOptions, OnTopSipOptions } from './client-options.js';
import { IOnTopSip } from './types';
import { Invitation, Inviter } from 'sip.js';
import { ManagedSession } from 'sip.js/lib/platform/web/session-manager/managed-session';

/**
 * A simple SIP class with some bits of extended functionality.
 * @remarks
 * While this class is completely functional for simple use cases, it is not intended
 * to provide an interface which is suitable for most (must less all) applications.
 * While this class has many limitations (for example, it only handles a single concurrent session),
 * it is, however, intended to serve as a simple example of using the SIP.js API.
 * @public
 */
export class OnTopSip implements IOnTopSip {
  /** Delegate. */
  public delegate: OnTopSipDelegate | undefined;

  private logger: Logger;
  private options: OnTopSipOptions;
  private session: Session | undefined = undefined;
  private readonly sessionManager: SessionManager;

  /**
   * Constructs a new instance of the `OnTopSip` class.
   * @param clientOptions - Options bucket. See {@link OnTopSipClientOptions} for details.
   */
  constructor(clientOptions: OnTopSipClientOptions) {
    // Delegate
    this.delegate = clientOptions.options.delegate;

    // Copy options
    this.options = { ...clientOptions.options };

    // Session manager options
    const sessionManagerOptions: SessionManagerOptions = {
      aor: this.options.aor,
      autoStop: this.options.autoStop !== undefined ? this.options.autoStop : true,
      delegate: {
        onCallAnswered: (session: Session) => this.delegate?.onCallAnswered?.(session),
        onCallCreated: (invitation: Invitation) => {
          this.session = invitation;
          this.delegate?.onCallCreated?.(invitation);
        },
        onCallReceived: (invitation: Invitation) => this.delegate?.onCallReceived?.(invitation),
        onCallHangup: (invitation: Invitation) => {
          this.session = undefined;
          this.delegate?.onCallHangup && this.delegate?.onCallHangup(invitation);
        },
        onCallHold: (s: Session, held: boolean) => this.delegate?.onCallHold?.(held),
        onCallDTMFReceived: (s: Session, tone: string, dur: number) =>
          this.delegate?.onCallDTMFReceived?.(tone, dur),
        onMessageReceived: (message: Message) =>
          this.delegate?.onMessageReceived?.(message.request.body),
        onRegistered: () => this.delegate?.onRegistered?.(),
        onUnregistered: () => this.delegate?.onUnregistered?.(),
        onServerConnect: () => this.delegate?.onServerConnect?.(),
        onServerDisconnect: () => this.delegate?.onServerDisconnect?.()
      },
      maxSimultaneousSessions: this.options.maxSimultaneousSessions || 1,
      media: this.options.media,
      reconnectionAttempts: this.options.reconnectionAttempts || 3,
      reconnectionDelay: this.options.reconnectionDelay,
      registererOptions: this.options.registererOptions,
      sendDTMFUsingSessionDescriptionHandler: this.options.sendDTMFUsingSessionDescriptionHandler,
      userAgentOptions: this.options.userAgentOptions
    };

    this.sessionManager = new SessionManager(clientOptions.wssURL, sessionManagerOptions);

    // Use the SIP.js logger
    this.logger = this.sessionManager.userAgent.getLogger('sip.OnTopSip');
  }

  /**
   * Instance identifier.
   * @internal
   */
  get id(): string {
    return (
      (this.options.userAgentOptions && this.options.userAgentOptions.displayName) || 'Anonymous'
    );
  }

  /** The local media stream. Undefined if call not answered. */
  get localMediaStream(): MediaStream | undefined {
    return this.session && this.sessionManager.getLocalMediaStream(this.session);
  }

  /** The remote media stream. Undefined if call not answered. */
  get remoteMediaStream(): MediaStream | undefined {
    return this.session && this.sessionManager.getRemoteMediaStream(this.session);
  }

  /**
   * Connect.
   * @remarks
   * Start the UserAgent's WebSocket Transport.
   */
  public connect(): Promise<void> {
    this.logger.log(`[${this.id}] Connecting UserAgent...`);
    return this.sessionManager.connect();
  }

  /**
   * Disconnect.
   * @remarks
   * Stop the UserAgent's WebSocket Transport.
   */
  public disconnect(): Promise<void> {
    this.logger.log(`[${this.id}] Disconnecting UserAgent...`);
    return this.sessionManager.disconnect();
  }

  /**
   * Return true if connected.
   */
  public isConnected(): boolean {
    return this.sessionManager.isConnected();
  }

  /**
   * Start receiving incoming calls.
   * @remarks
   * Send a REGISTER request for the UserAgent's AOR.
   * Resolves when the REGISTER request is sent, otherwise rejects.
   */
  public register(registererRegisterOptions?: RegistererRegisterOptions): Promise<void> {
    this.logger.log(`[${this.id}] Registering UserAgent...`);
    return this.sessionManager.register(registererRegisterOptions);
  }

  /**
   * Stop receiving incoming calls.
   * @remarks
   * Send an un-REGISTER request for the UserAgent's AOR.
   * Resolves when the un-REGISTER request is sent, otherwise rejects.
   */
  public unregister(registererUnregisterOptions?: RegistererUnregisterOptions): Promise<void> {
    this.logger.log(`[${this.id}] Unregistering UserAgent...`);
    return this.sessionManager.unregister(registererUnregisterOptions);
  }

  /**
   * Make an outgoing call.
   * @remarks
   * Send an INVITE request to create a new Session.
   * Resolves when the INVITE request is sent, otherwise rejects.
   * Use `onCallAnswered` delegate method to determine if Session is established.
   * @param destination - The target destination to call. A SIP address to send the INVITE to.
   * @param inviterOptions - Optional options for Inviter constructor.
   * @param inviterInviteOptions - Optional options for Inviter.invite().
   */
  public call(
    destination: string,
    inviterOptions?: InviterOptions,
    inviterInviteOptions?: InviterInviteOptions
  ): Promise<Inviter> {
    this.logger.log(`[${this.id}] Beginning Session...`);
    this.muteAll();
    return this.sessionManager.call(destination, inviterOptions, inviterInviteOptions);
  }

  /**
   * Hangup a call.
   * @remarks
   * Send a BYE request, CANCEL request or reject response to end the current Session.
   * Resolves when the request/response is sent, otherwise rejects.
   * Use `onCallHangup` delegate method to determine if and when call is ended.
   */
  public hangup(session: Session): Promise<void> {
    this.logger.log(`[${this.id}] Hangup...`);
    return this.sessionManager.hangup(session);
  }

  /**
   * Answer an incoming call.
   * @remarks
   * Accept an incoming INVITE request creating a new Session.
   * Resolves with the response is sent, otherwise rejects.
   * Use `onCallAnswered` delegate method to determine if and when call is established.
   * @param session
   * @param invitationAcceptOptions - Optional options for Inviter.accept().
   */
  public answer(
    session: Session,
    invitationAcceptOptions?: InvitationAcceptOptions
  ): Promise<void> {
    this.logger.log(`[${this.id}] Accepting Invitation...`);

    if (!session) {
      return Promise.reject(new Error('Session does not exist.'));
    }

    return this.sessionManager.answer(session, invitationAcceptOptions);
  }

  /**
   * Decline an incoming call.
   * @remarks
   * Reject an incoming INVITE request.
   * Resolves with the response is sent, otherwise rejects.
   * Use `onCallHangup` delegate method to determine if and when call is ended.
   */
  public decline(session: Session): Promise<void> {
    this.logger.log(`[${this.id}] rejecting Invitation...`);

    if (!session) {
      return Promise.reject(new Error('Session does not exist.'));
    }

    return this.sessionManager.decline(session);
  }

  /**
   * Hold call
   * @remarks
   * Send a re-INVITE with new offer indicating "hold".
   * Resolves when the re-INVITE request is sent, otherwise rejects.
   * Use `onCallHold` delegate method to determine if request is accepted or rejected.
   * See: https://tools.ietf.org/html/rfc6337
   */
  public hold(session: Session): Promise<void> {
    this.logger.log(`[${this.id}] holding session...`);

    if (!session) {
      return Promise.reject(new Error('Session does not exist.'));
    }

    return this.sessionManager.hold(session);
  }

  /**
   * Unhold call.
   * @remarks
   * Send a re-INVITE with new offer indicating "unhold".
   * Resolves when the re-INVITE request is sent, otherwise rejects.
   * Use `onCallHold` delegate method to determine if request is accepted or rejected.
   * See: https://tools.ietf.org/html/rfc6337
   */
  public unhold(session: Session): Promise<void> {
    this.logger.log(`[${this.id}] unholding session...`);

    if (!session) {
      return Promise.reject(new Error('Session does not exist.'));
    }

    return this.sessionManager.unhold(session);
  }

  /**
   * Hold state.
   * @remarks
   * True if session is on hold.
   */
  public isHeld(session: Session): boolean {
    return session ? this.sessionManager.isHeld(session) : false;
  }

  /**
   * Mute call.
   * @remarks
   * Disable sender's media tracks.
   */
  public mute(session: Session): void {
    this.logger.log(`[${this.id}] disabling media tracks...`);
    return session && this.sessionManager.mute(session);
  }

  /**
   * Unmute call.
   * @remarks
   * Enable sender's media tracks.
   */
  public unmute(session: Session): void {
    this.logger.log(`[${this.id}] enabling media tracks...`);
    return session && this.sessionManager.unmute(session);
  }

  /**
   * Mute state.
   * @remarks
   * True if sender's media track is disabled.
   */
  public isMuted(session: Session): boolean {
    return session ? this.sessionManager.isMuted(session) : false;
  }

  /**
   * Send DTMF.
   * @remarks
   * Send an INFO request with content type application/dtmf-relay.
   * @param session
   * @param tone - Tone to send.
   */
  public sendDTMF(session: Session, tone: string): Promise<void> {
    this.logger.log(`[${this.id}] sending DTMF...`);

    if (!session) {
      return Promise.reject(new Error('Session does not exist.'));
    }

    return this.sessionManager.sendDTMF(session, tone);
  }

  /**
   * Send a message.
   * @remarks
   * Send a MESSAGE request.
   * @param destination - The target destination for the message. A SIP address to send the MESSAGE to.
   * @param message
   */
  public message(destination: string, message: string): Promise<void> {
    this.logger.log(`[${this.id}] sending message...`);
    return this.sessionManager.message(destination, message);
  }

  /**
   * Mute all sessions at once.
   * Useful if the user hasn't manually muted before making a call.
   */
  public muteAll(): void {
    const unmutedSessions = this.getSessions().filter(m => !m.held);

    if (unmutedSessions.length) {
      unmutedSessions.forEach(m => this.hold(m.session));
    }
  }

  /**
   * Return a session based on ID
   * @param id
   */
  public getSession(id: string): Session | undefined {
    const session = this.getSessions().find(m => m.session.id === id);

    if (session) {
      return session.session;
    }

    return undefined;
  }

  /**
   * Return all active sessions
   */
  public getSessions(): ManagedSession[] {
    return this.sessionManager.managedSessions;
  }
}
