export const environment = {
  production: false,
  apiUrl: 'https://thawhtinaung.online/api',
  baseUrl: 'https://thawhtinaung.online',
  wsUrl: 'https://thawhtinaung.online',
  webrtc: {
    iceServers: [
      // Your Myanmar TURN server (Primary)
      {
        urls: [
          'turn:150.95.24.64:3478?transport=udp',
          'turn:150.95.24.64:3478?transport=tcp'
        ],
        username: 'webrtcuser',
        credential: 'strongpassword123'
      },
      
      // Public TURN servers (Fallback for Myanmar ISPs)
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      
      // STUN servers (Worldwide)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  }
};
