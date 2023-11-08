import { RegistererOptions } from 'sip.js/lib/api/registerer-options.js';
import { UserAgentOptions } from 'sip.js/lib/api/user-agent-options.js';
import { OnTopSipDelegate } from './client-delegate.js';

/**
 * Media for {@link OnTopSipOptions}.
 * @public
 */
export interface OnTopSipMedia {
  /**
   * Offer/Answer constraints determine if audio and/or video are utilized.
   * If not specified, only audio is utilized (audio is true, video is false).
   * @remarks
   * Constraints are used when creating local media stream.
   * If undefined, defaults to audio true and video false.
   * If audio and video are false, media stream will have no tracks.
   */
  constraints?: OnTopSipMediaConstraints;

  /** HTML elements for local media streams. */
  local?: OnTopSipMediaLocal;

  /** Local HTML media elements. */
  remote?: OnTopSipMediaRemote;
}

/**
 * Constraints for {@link OnTopSipMedia}.
 * @public
 */
export interface OnTopSipMediaConstraints {
  /** If true, offer and answer to send and receive audio. */
  audio: boolean;
  /** If true, offer and answer to send and receive video. */
  video: boolean;
}

/**
 * Local media elements for {@link OnTopSipMedia}.
 * @public
 */
export interface OnTopSipMediaLocal {
  /** The local video media stream is attached to this element. */
  video?: HTMLVideoElement;
}

/**
 * Remote media elements for {@link OnTopSipMedia}.
 * @public
 */
export interface OnTopSipMediaRemote {
  /** The remote audio media stream is attached to this element. */
  audio?: HTMLAudioElement;
  /** The remote video media stream is attached to this element. */
  video?: HTMLVideoElement;
}

export interface OnTopSipOptions {
  /**
   * User's SIP Address of Record (AOR).
   * @remarks
   * The AOR is registered to receive incoming calls.
   * If not specified, a random anonymous address is created for the user.
   */
  aor?: string;

  /**
   * Delegate for OnTopSip.
   */
  delegate?: OnTopSipDelegate;

  /**
   * Media options.
   */
  media?: OnTopSipMedia;

  /**
   * Maximum number of times to attempt to reconnection.
   * @remarks
   * When the transport connection is lost (WebSocket disconnects),
   * reconnection will be attempted immediately. If that fails,
   * reconnection will be attempted again when the browser indicates
   * the application has come online. See:
   * https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine
   * @defaultValue 3
   */
  reconnectionAttempts?: number;

  /**
   * Seconds to wait between reconnection attempts.
   * @defaultValue 4
   */
  reconnectionDelay?: number;

  /**
   * Options for Registerer.
   */
  registererOptions?: RegistererOptions;

  /**
   * Send DTMF using the session description handler (uses RFC 2833 DTMF).
   * @defaultValue `false`
   */
  sendDTMFUsingSessionDescriptionHandler?: boolean;

  /**
   * Options for UserAgent.
   */
  userAgentOptions?: UserAgentOptions;

  /**
   * Number of simultaneous sessions
   * @defaultValue 1
   */
  maxSimultaneousSessions?: number;
}

/**
 * Options for {@link OnTopSip}.
 * @public
 */
export interface OnTopSipClientOptions {
  wssURL: string;
  options: OnTopSipOptions;
}
