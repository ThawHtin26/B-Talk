export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  wsUrl: 'http://localhost:8080',
  webrtc: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:thawhtinaung.online:3478',
        username: 'webrtcuser',
        credential: 'strongpassword123'
      }
    ]
  }
};
