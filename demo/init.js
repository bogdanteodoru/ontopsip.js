import {OnTopSip} from "../dist/index.mjs";

((window) => {
  let activeCallsInjected = null;
  let establishedCallsInterval = null;
  let incomingCallsInterval = null;
  let sipClient = null;
  let contact = {
    username: '',
    password: '',
    uri: '',
    domain: '',
  }

  const buildCommand = ({cmd, args}) => {
    return JSON.stringify({ cmd, args });
  };
  const getCallerId = (m) => {
    const isOutgoing = m && m.session.outgoingInviteRequest;
    const outgoingUser = (isOutgoing && isOutgoing.message.to.uri.user) || null;
    const displayName = m.session.remoteIdentity && m.session.remoteIdentity.displayName || null;

    return {
      isOutgoing,
      name: isOutgoing ? outgoingUser: (displayName || m.session.callerName)
    }
  };
  const buildCallIncoming = (managedSession) => {
    const id = managedSession.session.id;
    return `<div class="card">
      <div class="card-header">Incoming from: ${getCallerId(managedSession).name}</div>
      <div class="card-body">
        <button class="btn btn-success answer-call" data-sessionId="${id}">Answear</button>
        <button class="btn btn-danger reject-call ms-2" data-sessionId="${id}">Decline</button>
      </div>
    `;
  };
  const buildCallActive = (managedSession) => {
    const id = managedSession.session.id;
    return `<div class="card">
      <div class="card-header">CallerID: ${getCallerId(managedSession).name}</div>
      <div class="card-body">
        <div class="mb-3">
          <button class="btn muteOrUnmute btn-info btn-sm" data-sessionId="${id}">${sipClient.isMuted(managedSession.session) ? 'Unmute' : 'Mute'}</button>
          <button class="btn ms-2 holdOrUnhold btn-info btn-sm" data-sessionId="${id}">${sipClient.isHeld(managedSession.session) ? 'Unhold' : 'Hold'}</button>
          <button class="btn ms-2 transfer btn-info btn-sm" data-sessionId="${id}">Transfer</button>
        </div>
        <div id="transfer_wrapper_${id}" class="d-none mb-3">
          <div class="card mt-2">
            <div class="card-body">
              <div class="mb-3">
                <label for="transferUsername_${id}" class="form-label">Username</label>
                <input type="text" class="form-control" id="transferUsername_${id}" placeholder="sip:{username}@{domain}">
              </div>
              <button type="button" class="btn btn-success" data-sessionId="${id}" id="transferCall">Transfer</button>
            </div>
          </div>
        </div>
        <button class="btn btn-danger hangup" data-sessionId="${id}">Hangup</button>
      </div>
    </div>
    `;
  };
  const getSession = ($event) => {
    const sessionId = $event.currentTarget.dataset.sessionid;
    return sipClient.getSessions().find(m => m.session.id === sessionId);
  };
  const settings = JSON.parse(window.localStorage.getItem('settings') || "{}");


  // Setting default config (if any)
  // We just need to test for one property
  if (settings.domain) {
    contact.username = settings.username;
    contact.password = settings.password;
    contact.domain = settings.domain;

    $('#domain').val(contact.domain);
    $('#username').val(contact.username);
    $('#password').val(contact.password);
  }

  const clientOptions = (contact) => {
    return {
      wssURL: `wss://${contact.domain}`,
      options: {
        aor: contact.uri,
        reconnectionAttempts: 10,
        reconnectionDelay: 2,
        maxSimultaneousSessions: 10,
        delegate: {},
        media: {
          remote: {
            audio: document.getElementById('sipAudio')
          },
          constraints: { audio: true, video: false }
        },
        registererOptions: {
          expires: 120,
          logConfiguration: true,
          refreshFrequency: 55
        },
        userAgentOptions: {
          viaHost: contact.domain,
          contactName: contact.username,
          authorizationUsername: contact.username,
          authorizationPassword: contact.password,
          logBuiltinEnabled: true,
          sessionDescriptionHandlerFactoryOptions: {
            peerConnectionConfiguration: {
              iceServers: [{urls: "stun:stun.l.google.com:19302"}]
            }
          }
        }
      }
    }
  }

  const clientRequestOptions = {
    extraHeaders: [
      `X-Session-ID: ${new Date().getTime()}`
    ]
  }

  const delegateMethods = {
    onServerConnect: () => {},
    onServerDisconnect: () => {
      $('#statusDisconnected').removeClass('d-none');
      $('#statusConnected').addClass('d-none;');

      if (establishedCallsInterval) { clearInterval(establishedCallsInterval); }
      if (incomingCallsInterval) { clearInterval(incomingCallsInterval); }
    },
    onRegistered: () => {
      $('#statusDisconnected').addClass('d-none');
      $('#statusConnected, #agentStatusWrapper').removeClass('d-none');
      setActiveAndIncomingCallsListeners()
    },
    onMessageReceived: (msg) => {
      const message = JSON.parse(msg);
      switch (message.cmd) {
        case 'set-status':
          const agentStatus = document.getElementById('agentStatus');
            const status = message ? message.args.status : 'not-available';
            agentStatus.value = status;
            agentStatus.disabled = status === 'active-call';
      }
    },
    onCallReceived: (invitation) => {},
    onCallHangup: (invitation) => {},
    onCallCreated: (invitation) => {},
    onCallAnswered: (session) => {}

  }

  const setAgentStatus = ($event) => {
    if (['disconnected', 'active-call'].includes($event.currentTarget.value)) {
    return;
  }

  const cmd = buildCommand({
    cmd: 'set-status',
    args: { 'status': $event.currentTarget.value }
  });

  if (sipClient.isConnected()) {
    sipClient.message(contact.uri, cmd).then()
  }
}

  // Set active and incoming calls intervals
  // Basically here we check the sip library each 50ms to see if we have
  // any sessions that we need to render
  const setActiveAndIncomingCallsListeners = () => {
    incomingCallsInterval = setInterval(() => {
      let incomingCalls = '';
      const $incomingCallsWrapper = $('.incoming-calls-wrapper');
      const incomingSessions = sipClient.getSessions().filter(m => m.session.state === 'Initial').forEach(session => {
        incomingCalls += buildCallIncoming(session);
      });
      $incomingCallsWrapper.html(incomingCalls);
    }, 500);

    establishedCallsInterval = setInterval(() => {
      let activeCalls = '';
      const $activeCallsWrapper = $('.active-calls-wrapper');
      const incomingSessions = sipClient.getSessions().filter(m => m.session.state === 'Established').forEach(session => {
        activeCalls += buildCallActive(session);
      });

      if (activeCallsInjected !== activeCalls) {
        $activeCallsWrapper.html(activeCalls);
        activeCallsInjected = activeCalls;
      }
    }, 500)
  }

  // Save configurations
  $('#save').on('click', ($event) => {
    $event.preventDefault();

    const domain = $('#domain').val();
    const username = $('#username').val();
    const password = $('#password').val();

    if (!domain || !username || !password) {
      alert(`You're missing a setting buddy`);
      return;
    }

    window.localStorage.setItem('settings', JSON.stringify({
      domain, username, password
    }))
  });

  // On connect and retry button listeners
  $('#connect, #retry').on('click', async ($event) => {
    $event.preventDefault();
    let { domain, password, username } = settings || {};

    // No need to check multiple things as you can't save them without one.
    if (!domain) {
      alert('No settings saved!');
      return;
    }

    contact = {
      ...contact,
      domain,
      user: username,
      password: password,
      uri: `sip:${username}@${domain}`
    }

    const options = {
      ...clientOptions(contact),
      options: {
        ...clientOptions(contact).options,
        delegate: {
          onServerDisconnect: delegateMethods.onServerDisconnect(),
          onServerConnect: delegateMethods.onServerConnect,
          onRegistered: delegateMethods.onRegistered,
          onMessageReceived: delegateMethods.onMessageReceived,
          onCallReceived: delegateMethods.onCallReceived,
          onCallHangup: delegateMethods.onCallHangup,
          onCallCreated: delegateMethods.onCallCreated,
          onCallAnswered: delegateMethods.onCallAnswered
        }
      }
    }

    sipClient = new OnTopSip(options);
    await sipClient.connect().then(() => {
      if (sipClient.isConnected()) {
        sipClient.register({
          requestOptions: clientRequestOptions
        })
      }
    }).catch(() => {
      alert('There was an error connecting to the SIP server');
      $('#retry').removeClass('d-none');
    });
  });

  // On agent status change
  $('#agentStatus').on('change', ($event) => setAgentStatus($event));

  // On answer call
  $(document).on('click', '.answer-call', ($event) => {
    $event.preventDefault();
    getSession($event).session.accept();
  });

  // On reject call
  $(document).on('click', '.reject-call', ($event) => {
    $event.preventDefault();
    getSession($event).session.reject();
  });

  // Mute or unmute
  $(document).on('click', '.muteOrUnmute', ($event) => {
    $event.preventDefault();
    const session = getSession($event).session;

    if (sipClient.isMuted(session)) {
      return sipClient.unmute(session);
    }

    sipClient.mute(session);
  });

  // Hold or unhold
  $(document).on('click', '.holdOrUnhold', ($event) => {
    $event.preventDefault();
    const session = getSession($event).session;

    if (sipClient.isHeld(session)) {
      return sipClient.unhold(session);
    }

    sipClient.hold(session);
  });

  // Transfer call button click
  $(document).on('click', '.transfer', ($event) => {
    $event.preventDefault();
    const session = getSession($event).session;
    $(`#transfer_wrapper_${session.id}`).removeClass('d-none');
  });

  $(document).on('click', '#transferCall', ($event) => {
    $event.preventDefault();
    const sessionId = $event.currentTarget.dataset.sessionid;
    const transferValue = $(`#transferUsername_${sessionId}`).val();

    // Get the headers from the initial session!
    const session = getSession($event).session;

    if (!transferValue) {
      alert('Please enter a SIP address to transfer to!');
      return;
    }

    // Inviter options -> https://github.com/onsip/SIP.js/blob/2e1c525279c8d6deebb6ecaf3d14477ab7b63310/src/api/inviter-options.ts#L9
    // With other properties like extraHeaders: sipClient.call(newUsername, inviterOptions)
    sipClient.call(transferValue)
  })

  // Hangup a call
  $(document).on('click', '.hangup', ($event) => {
    $event.preventDefault();
    const session = getSession($event).session;
    sipClient.hangup(session);
  });

  // Call someone
  $(document).on('click', '#call', ($event) => {
    $event.preventDefault();
    const newUsername = $('#newCallUsername').val();

    if (!newUsername) {
      alert('Please enter a SIP address to call!');
      return;
    }

    // Inviter options -> https://github.com/onsip/SIP.js/blob/2e1c525279c8d6deebb6ecaf3d14477ab7b63310/src/api/inviter-options.ts#L9
    // With other properties like extraHeaders: sipClient.call(newUsername, inviterOptions)
    sipClient.call(newUsername)
  });
})(window);