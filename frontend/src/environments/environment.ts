export const environment = {
  production: false,
  apiUrl: 'https://thawhtinaung.online/api',
  baseUrl: 'https://thawhtinaung.online',
  wsUrl: 'https://thawhtinaung.online',
  webrtc: {
    iceServers: [
      // Primary TURN servers for Myanmar ISPs
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      
      // Additional free TURN servers for better coverage
      {
        urls: [
          'turn:turn.anyfirewall.com:3478?transport=udp',
          'turn:turn.anyfirewall.com:3478?transport=tcp'
        ],
        username: 'webrtc',
        credential: 'webrtc'
      },
      
      // More reliable TURN servers
      {
        urls: [
          'turn:turn.bistri.com:80',
          'turn:turn.bistri.com:443',
          'turn:turn.bistri.com:443?transport=tcp'
        ],
        username: 'homeo',
        credential: 'homeo'
      },
      
      // Additional TURN servers for redundancy
      {
        urls: [
          'turn:turn.voiparound.com:3478?transport=udp',
          'turn:turn.voiparound.com:3478?transport=tcp'
        ],
        username: 'webrtc',
        credential: 'webrtc'
      },
      
      // STUN servers (Worldwide) - Multiple for redundancy
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      { urls: 'stun:stun.voiparound.com:3478' },
      { urls: 'stun:stun.voipbuster.com:3478' },
      { urls: 'stun:stun.voipstunt.com:3478' },
      { urls: 'stun:stun.voxgratia.org:3478' },
      { urls: 'stun:stun.ekiga.net:3478' },
      { urls: 'stun:stun.ideasip.com:3478' },
      { urls: 'stun:stun.schlund.de:3478' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      { urls: 'stun:stun.voiparound.com:3478' },
      { urls: 'stun:stun.voipbuster.com:3478' },
      { urls: 'stun:stun.voipstunt.com:3478' },
      { urls: 'stun:stun.voxgratia.org:3478' }
    ]
  }
};
