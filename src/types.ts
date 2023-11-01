import { OnTopSipDelegate } from './client-delegate';
import { InvitationAcceptOptions } from 'sip.js/lib/api/invitation-accept-options.js';
import { RegistererRegisterOptions } from 'sip.js/lib/api/registerer-register-options.js';
import { RegistererUnregisterOptions } from 'sip.js/lib/api/registerer-unregister-options.js';
import { InviterOptions } from 'sip.js/lib/api/inviter-options.js';
import { InviterInviteOptions } from 'sip.js/lib/api/inviter-invite-options.js';

export interface IOnTopSip {
  delegate: OnTopSipDelegate | undefined;

  readonly id: string;

  readonly localMediaStream: MediaStream | undefined;

  readonly remoteMediaStream: MediaStream | undefined;

  readonly localAudioTrack: MediaStreamTrack | undefined;

  readonly localVideoTrack: MediaStreamTrack | undefined;

  readonly remoteAudioTrack: MediaStreamTrack | undefined;

  readonly remoteVideoTrack: MediaStreamTrack | undefined;

  connect(): Promise<void>;

  disconnect(): Promise<void>;

  isConnected(): boolean;

  register(registererRegisterOptions?: RegistererRegisterOptions): Promise<void>;

  unregister(registererUnregisterOptions?: RegistererUnregisterOptions): Promise<void>;

  call(
    destination: string,
    inviterOptions?: InviterOptions,
    inviterInviteOptions?: InviterInviteOptions
  ): Promise<void>;

  hangup(): Promise<void>;

  answer(invitationAcceptOptions?: InvitationAcceptOptions): Promise<void>;

  decline(): Promise<void>;

  hold(): Promise<void>;

  unhold(): Promise<void>;

  isHeld(): boolean;

  mute(): void;

  unmute(): void;

  isMuted(): boolean;

  sendDTMF(tone: string): Promise<void>;

  message(destination: string, message: string): Promise<void>;
}
