import { OnTopSipDelegate } from './client-delegate';
import { InvitationAcceptOptions } from 'sip.js/lib/api/invitation-accept-options.js';
import { RegistererRegisterOptions } from 'sip.js/lib/api/registerer-register-options.js';
import { RegistererUnregisterOptions } from 'sip.js/lib/api/registerer-unregister-options.js';
import { InviterOptions } from 'sip.js/lib/api/inviter-options.js';
import { InviterInviteOptions } from 'sip.js/lib/api/inviter-invite-options.js';
import { Inviter } from 'sip.js';
import { Session } from 'sip.js/lib/api/session.js';
import { ManagedSession } from 'sip.js/lib/platform/web/session-manager/managed-session';
import { OutgoingRequestDelegate } from 'sip.js/lib/core';

export interface IOnTopSip {
  delegate: OnTopSipDelegate | undefined;

  readonly id: string;

  readonly localMediaStream: MediaStream | undefined;

  readonly remoteMediaStream: MediaStream | undefined;

  connect(): Promise<void>;

  disconnect(): Promise<void>;

  isConnected(): boolean;

  register(registererRegisterOptions?: RegistererRegisterOptions): Promise<void>;

  unregister(registererUnregisterOptions?: RegistererUnregisterOptions): Promise<void>;

  call(
    destination: string,
    inviterOptions?: InviterOptions,
    inviterInviteOptions?: InviterInviteOptions
  ): Promise<Inviter>;

  hangup(session: Session): Promise<void>;

  answer(session: Session, invitationAcceptOptions?: InvitationAcceptOptions): Promise<void>;

  decline(session: Session): Promise<void>;

  hold(session: Session): Promise<void>;

  unhold(session: Session): Promise<void>;

  isHeld(session: Session): boolean;

  mute(session: Session): void;

  unmute(session: Session): void;

  isMuted(session: Session): boolean;

  sendDTMF(session: Session, tone: string): Promise<void>;

  message(
    destination: string,
    message: string,
    requestDelegate?: OutgoingRequestDelegate
  ): Promise<void>;

  getSession(id: string): Session | undefined;

  getSessions(): ManagedSession[];

  muteAll(): void;
}
