import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface NetworkTestResult {
  success: boolean;
  message: string;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkTestService {

  constructor() { }

  async testTURNServer(serverUrl: string, username?: string, credential?: string): Promise<NetworkTestResult> {
    try {
      console.log(`[NetworkTest] Testing TURN server: ${serverUrl}`);
      
      const pc = new RTCPeerConnection({
        iceServers: [{
          urls: serverUrl,
          username: username,
          credential: credential
        }]
      });

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pc.close();
          resolve({
            success: false,
            message: `TURN server test timeout: ${serverUrl}`,
            details: { serverUrl }
          });
        }, 10000);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log(`[NetworkTest] ICE candidate from ${serverUrl}:`, event.candidate.type);
            clearTimeout(timeout);
            pc.close();
            resolve({
              success: true,
              message: `TURN server working: ${serverUrl}`,
              details: { 
                serverUrl, 
                candidateType: event.candidate.type,
                protocol: event.candidate.protocol 
              }
            });
          }
        };

        pc.onicegatheringstatechange = () => {
          console.log(`[NetworkTest] ICE gathering state for ${serverUrl}:`, pc.iceGatheringState);
        };

        // Create a dummy offer to trigger ICE gathering
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .catch(error => {
            clearTimeout(timeout);
            pc.close();
            resolve({
              success: false,
              message: `TURN server test failed: ${serverUrl}`,
              details: { serverUrl, error: error.message }
            });
          });
      });
    } catch (error) {
      return {
        success: false,
        message: `TURN server test error: ${serverUrl}`,
        details: { serverUrl, error: (error as Error).message }
      };
    }
  }

  async testAllTURNServers(): Promise<NetworkTestResult[]> {
    const results: NetworkTestResult[] = [];
    
    for (const server of environment.webrtc.iceServers) {
      if (server.urls) {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
        
        for (const url of urls) {
          const result = await this.testTURNServer(url, server.username, server.credential);
          results.push(result);
          
          // Add delay between tests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return results;
  }

  async testMediaAccess(): Promise<NetworkTestResult> {
    try {
      console.log('[NetworkTest] Testing media access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }, 
        audio: true 
      });
      
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      stream.getTracks().forEach(track => track.stop());
      
      return {
        success: true,
        message: 'Media access working',
        details: {
          videoTrack: videoTrack ? videoTrack.label : 'No video track',
          audioTrack: audioTrack ? audioTrack.label : 'No audio track'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Media access failed',
        details: { error: (error as Error).message }
      };
    }
  }

  async testWebRTCConnection(): Promise<NetworkTestResult> {
    try {
      console.log('[NetworkTest] Testing WebRTC connection...');
      
      const pc1 = new RTCPeerConnection({ iceServers: environment.webrtc.iceServers });
      const pc2 = new RTCPeerConnection({ iceServers: environment.webrtc.iceServers });
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pc1.close();
          pc2.close();
          resolve({
            success: false,
            message: 'WebRTC connection test timeout',
            details: { timeout: 10000 }
          });
        }, 15000);

        pc1.onicecandidate = (event) => {
          if (event.candidate) {
            pc2.addIceCandidate(event.candidate);
          }
        };

        pc2.onicecandidate = (event) => {
          if (event.candidate) {
            pc1.addIceCandidate(event.candidate);
          }
        };

        pc1.oniceconnectionstatechange = () => {
          console.log('[NetworkTest] PC1 ICE state:', pc1.iceConnectionState);
          if (pc1.iceConnectionState === 'connected') {
            clearTimeout(timeout);
            pc1.close();
            pc2.close();
            resolve({
              success: true,
              message: 'WebRTC connection established',
              details: { 
                pc1State: pc1.iceConnectionState,
                pc2State: pc2.iceConnectionState
              }
            });
          }
        };

        pc2.oniceconnectionstatechange = () => {
          console.log('[NetworkTest] PC2 ICE state:', pc2.iceConnectionState);
        };

        // Create offer and answer
        pc1.createOffer()
          .then(offer => pc1.setLocalDescription(offer))
          .then(() => pc2.setRemoteDescription(pc1.localDescription!))
          .then(() => pc2.createAnswer())
          .then(answer => pc2.setLocalDescription(answer))
          .then(() => pc1.setRemoteDescription(pc2.localDescription!))
          .catch(error => {
            clearTimeout(timeout);
            pc1.close();
            pc2.close();
            resolve({
              success: false,
              message: 'WebRTC connection test failed',
              details: { error: error.message }
            });
          });
      });
    } catch (error) {
      return {
        success: false,
        message: 'WebRTC connection test error',
        details: { error: (error as Error).message }
      };
    }
  }

  async runFullNetworkTest(): Promise<{
    mediaAccess: NetworkTestResult;
    turnServers: NetworkTestResult[];
    webrtcConnection: NetworkTestResult;
  }> {
    console.log('[NetworkTest] Starting full network test...');
    
    const mediaAccess = await this.testMediaAccess();
    const turnServers = await this.testAllTURNServers();
    const webrtcConnection = await this.testWebRTCConnection();
    
    console.log('[NetworkTest] Full network test completed');
    console.log('[NetworkTest] Media access:', mediaAccess);
    console.log('[NetworkTest] TURN servers:', turnServers);
    console.log('[NetworkTest] WebRTC connection:', webrtcConnection);
    
    return {
      mediaAccess,
      turnServers,
      webrtcConnection
    };
  }
} 