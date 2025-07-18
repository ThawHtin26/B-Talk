export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  baseUrl: 'http://localhost:8080',
  wsUrl: 'http://localhost:8080',
  webrtc: {
    iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { 
    urls: 'turn:thawhtinaung.online:3478?transport=udp',
    username: 'webrtcuser',
    credential: 'strongpassword123'
  },
  { 
    urls: 'turn:thawhtinaung.online:3478?transport=tcp',
    username: 'webrtcuser',
    credential: 'strongpassword123'
  }
]
  }
};
