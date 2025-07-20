import {
  Component, EventEmitter, Output, OnDestroy, OnInit,
  ViewChild, ElementRef, ChangeDetectorRef, HostListener,
  AfterViewInit, Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallService } from '../../services/call.service';
import { AuthService } from '../../services/auth.service';
import { filter, takeUntil, debounceTime } from 'rxjs/operators';
import { Subject, interval, fromEvent } from 'rxjs';
import { SignalType, CallStatus, CallType } from '../../models/call.enum';
import { CallRequest } from '../../models/call.request';
import { CallSignal } from '../../models/call.signal';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-video-call',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.scss'],
})
export class VideoCallComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() conversationId?: string;
  @Input() recipientId?: string;
  @Input() isInitiatingCall = false;
  @Output() endCall = new EventEmitter<void>();
  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;

  // UI states
  isMuted = false;
  isVideoOff = false;
  isScreenSharing = false;
  isFullscreen = false;
  isRinging = false;
  isCallActive = false;
  showSettings = false;
  remoteVideoOff = false;
  showConnectionWarning = false;
  networkQuality: 'good' | 'average' | 'poor' = 'good';

  // Call data
  currentCall: CallRequest | null = null;
  callDuration = 0;
  private callTimer: any;
  private connectionMonitorTimer: any;
  private audioElement!: HTMLAudioElement;
  private ringtoneSrc = 'assets/sounds/ringtone.mp3';

  // Media devices
  audioDevices: MediaDeviceInfo[] = [];
  videoDevices: MediaDeviceInfo[] = [];
  currentAudioDeviceId: string | null = null;
  currentVideoDeviceId: string | null = null;

  // WebRTC
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private destroy$ = new Subject<void>();

  // Error messages
  public errorMessage: string | null = null;

  constructor(
    private callService: CallService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.initializeAudio();
    this.setupWebRTC();
    this.listenForCallEvents();
    this.enumerateDevices();
    this.startConnectionMonitoring();
    this.setupFullscreenListener();
    
    // Test WebRTC connection on component initialization
    this.testWebRTCConnection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  async ngAfterViewInit() {
    try {
      console.log('[WebRTC] Requesting media permissions...');
      
      // First try to get both audio and video
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      
      if (this.localVideoRef?.nativeElement) {
        this.localVideoRef.nativeElement.srcObject = this.localStream;
        console.log('[WebRTC] Local media stream set successfully');
      }
    } catch (err) {
      console.error('[WebRTC] Could not access camera/mic:', err);
      
      // Fallback: try audio only if video fails
      try {
        console.log('[WebRTC] Attempting audio-only fallback...');
        this.localStream = await navigator.mediaDevices.getUserMedia({ 
          video: false,
          audio: true 
        });
        
        if (this.localVideoRef?.nativeElement) {
          this.localVideoRef.nativeElement.srcObject = this.localStream;
          console.log('[WebRTC] Audio-only stream set successfully');
        }
        
        this.errorMessage = 'Camera access denied. Call will be audio-only.';
      } catch (audioErr) {
        console.error('[WebRTC] Could not access audio either:', audioErr);
        this.errorMessage = 'Microphone and camera access denied. Please check your permissions.';
        this.handleMediaError(audioErr);
      }
    }
  }

  private initializeAudio(): void {
    this.audioElement = new Audio(this.ringtoneSrc);
    this.audioElement.loop = true;
    this.audioElement.volume = 0.7; // Set volume to 70%
    
    // Preload the audio
    this.audioElement.load();
    
    // Add error handling for audio
    this.audioElement.onerror = (error) => {
      console.error('[Audio] Error loading ringtone:', error);
      // Fallback to a simple beep sound
      this.createFallbackRingtone();
    };
  }

  private createFallbackRingtone(): void {
    // Create a simple beep sound as fallback
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }

  private playRingtone(): void {
    if (this.audioElement) {
      console.log('[Audio] Playing ringtone...');
      this.audioElement.play().catch(e => {
        console.error('[Audio] Error playing ringtone:', e);
        this.createFallbackRingtone();
      });
    }
  }

  private stopRingtone(): void {
    if (this.audioElement) {
      console.log('[Audio] Stopping ringtone...');
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
  }

  private setupWebRTC(): void {
    // Enhanced WebRTC configuration for Myanmar ISPs
    const rtcConfig: RTCConfiguration = {
      iceServers: environment.webrtc.iceServers,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 10
    };

    this.peerConnection = new RTCPeerConnection(rtcConfig);

    // Enhanced ICE candidate handling
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentCall) {
        console.log('[WebRTC] Generated ICE candidate:', event.candidate.type);
        console.log('[WebRTC] Candidate protocol:', event.candidate.protocol);
        console.log('[WebRTC] Candidate address:', event.candidate.address);
        
        const user = this.authService.getCurrentUser();
        const callerId = user!.userId;
        
        const signal: CallSignal = {
          conversationId: this.currentCall.conversationId,
          callerId: callerId,
          recipientId: this.currentCall.recipientId,
          callId: this.currentCall.callId,
          type: SignalType.CANDIDATE,
          payload: event.candidate
        };
        this.callService.sendSignal(signal);
      } else if (!event.candidate) {
        console.log('[WebRTC] ICE candidate gathering completed');
      }
    };

    // Enhanced track handling
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      
      if (!event.streams || event.streams.length === 0) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
        if (this.remoteVideoRef?.nativeElement) {
          this.remoteVideoRef.nativeElement.srcObject = this.remoteStream;
        }
      } else {
        if (this.remoteVideoRef?.nativeElement) {
          this.remoteVideoRef.nativeElement.srcObject = event.streams[0];
        }
        this.remoteStream = event.streams[0];
      }

      if (event.track.kind === 'video') {
        this.remoteVideoOff = false;
        this.cdr.detectChanges();
      }
    };

    // Enhanced ICE connection state handling
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('[WebRTC] ICE connection state changed:', state);
      
      if (state === 'disconnected' || state === 'failed') {
        this.showConnectionWarning = true;
        this.networkQuality = 'poor';
        console.warn('[WebRTC] Connection issues detected:', state);
        
        if (state === 'failed') {
          console.log('[WebRTC] Attempting to restart ICE...');
          this.peerConnection?.restartIce();
        }
      } else if (state === 'connected') {
        this.showConnectionWarning = false;
        this.networkQuality = 'good';
        console.log('[WebRTC] Connection established successfully');
      } else if (state === 'checking') {
        this.networkQuality = 'average';
        console.log('[WebRTC] Checking connection...');
      }
      this.cdr.detectChanges();
    };

    // Enhanced connection state handling
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('[WebRTC] Connection state changed:', state);
      
      if (state === 'connected') {
        this.isRinging = false;
        this.stopRingtone();
        this.isCallActive = true;
        console.log('[WebRTC] Call is now active');
        this.cdr.detectChanges();
      } else if (state === 'failed') {
        console.error('[WebRTC] Connection failed');
        this.errorMessage = 'Connection failed. Please check your internet connection.';
        this.cdr.detectChanges();
      }
    };

    // Add signaling state change handler
    this.peerConnection.onsignalingstatechange = () => {
      const state = this.peerConnection?.signalingState;
      console.log('[WebRTC] Signaling state changed:', state);
    };
  }

  private listenForCallEvents(): void {
    // Handle incoming call requests
    this.callService.getIncomingCall$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((request) => {
        console.log('[VideoCall] Received incoming call request:', request);
        this.currentCall = request;
        this.isRinging = true;
        this.isCallActive = false;
        this.playRingtone();
        this.cdr.detectChanges();

        if (request.callType === CallType.GROUP) {
          this.callService.listenForGroupCallSignals(request.conversationId);
        }
      });

    // Handle call initiated confirmations (for caller)
    this.callService.getCallInitiated$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((request) => {
        console.log('[VideoCall] Call initiated confirmation received:', request);
        this.currentCall = request;
        this.isRinging = true;
        this.isCallActive = false;
        this.playRingtone();
        this.cdr.detectChanges();
      });

    // Handle call answered notifications
    this.callService.getCallAnswered$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (request) => {
        console.log('[VideoCall] Call answered notification received:', request);
        this.isRinging = false;
        this.stopRingtone();
        this.isCallActive = true;
        if (this.currentCall) {
          this.currentCall.status = CallStatus.ONGOING;
        }
        await this.startCall();
        this.startCallTimer();
        this.cdr.detectChanges();
      });

    // Handle call rejected notifications
    this.callService.getCallRejected$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('[VideoCall] Call rejected notification received');
        this.isRinging = false;
        this.stopRingtone();
        this.cleanup();
        this.cdr.detectChanges();
      });

    // Handle call ended notifications
    this.callService.getCallEnded$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('[VideoCall] Call ended notification received');
        this.isCallActive = false;
        this.isRinging = false;
        this.stopRingtone();
        this.cleanup();
        this.endCall.emit();
        this.cdr.detectChanges();
      });

    // Handle WebRTC offer signals
    this.callService.getCallSignal$()
      .pipe(
        takeUntil(this.destroy$),
        filter((signal) => signal.type === SignalType.OFFER)
      )
      .subscribe(async (signal) => {
        if (!this.peerConnection) return;

        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal.payload)
        );

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        const user = this.authService.getCurrentUser();
        const callerId = user!.userId;
        
        const answerSignal: CallSignal = {
          conversationId: signal.conversationId,
          callerId: callerId,
          recipientId: signal.callerId, // Send back to the original caller
          callId: signal.callId, // Include callId
          type: SignalType.ANSWER,
          payload: answer,
        };

        this.callService.sendSignal(answerSignal);
      });

    // Handle WebRTC answer signals
    this.callService.getCallSignal$()
      .pipe(
        takeUntil(this.destroy$),
        filter((signal) => signal.type === SignalType.ANSWER)
      )
      .subscribe(async (signal) => {
        if (!this.peerConnection) return;
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal.payload)
        );
      });

    // Handle ICE candidates
    this.callService.getCallSignal$()
      .pipe(
        takeUntil(this.destroy$),
        filter((signal) => signal.type === SignalType.CANDIDATE)
      )
      .subscribe(async (signal) => {
        if (!this.peerConnection) return;
        try {
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(signal.payload)
          );
        } catch (e) {
          console.error('Error adding ICE candidate', e);
        }
      });

    // Handle ringing status updates
    this.callService.getCallSignal$()
      .pipe(
        takeUntil(this.destroy$),
        filter((signal) => signal.type === SignalType.RINGING)
      )
      .subscribe((signal) => {
        if (this.currentCall && this.currentCall.callId === signal.callId) {
          this.isRinging = true;
          this.cdr.detectChanges();
        }
      });

    // Handle hangup signals
    this.callService.getCallSignal$()
      .pipe(
        takeUntil(this.destroy$),
        filter((signal) => signal.type === SignalType.HANGUP)
      )
      .subscribe((signal) => {
        if (this.currentCall && this.currentCall.callId === signal.callId) {
          this.isCallActive = false;
          this.cleanup();
          this.endCall.emit();
          this.cdr.detectChanges();
        }
      });

    // Add logging for all signaling events
    this.callService.getCallSignal$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((signal) => {
        console.log('[Signaling] Received signal:', signal);
      });
  }

  private async enumerateDevices(): Promise<void> {
    try {
      // First get permission with a simple request
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.audioDevices = devices.filter(d => d.kind === 'audioinput');
      this.videoDevices = devices.filter(d => d.kind === 'videoinput');

      // Set default devices if none selected
      if (!this.currentAudioDeviceId && this.audioDevices.length > 0) {
        this.currentAudioDeviceId = this.audioDevices[0].deviceId;
      }
      if (!this.currentVideoDeviceId && this.videoDevices.length > 0) {
        this.currentVideoDeviceId = this.videoDevices[0].deviceId;
      }

      this.cdr.detectChanges();
    } catch (error) {
      this.handleMediaError(error);
    }
  }

  private startConnectionMonitoring(): void {
    this.connectionMonitorTimer = setInterval(() => {
      if (!this.peerConnection) return;

      // Enhanced network quality monitoring for Myanmar ISPs
      const iceState = this.peerConnection.iceConnectionState;
      const connectionState = this.peerConnection.connectionState;
      
      console.log('[ConnectionMonitor] ICE State:', iceState);
      console.log('[ConnectionMonitor] Connection State:', connectionState);
      
      if (iceState === 'connected' && connectionState === 'connected') {
        this.networkQuality = 'good';
        this.showConnectionWarning = false;
      } else if (iceState === 'checking' || connectionState === 'connecting') {
        this.networkQuality = 'average';
        this.showConnectionWarning = false;
      } else if (iceState === 'disconnected' || iceState === 'failed' || connectionState === 'failed') {
        this.networkQuality = 'poor';
        this.showConnectionWarning = true;
        
        // Attempt to restart ICE for poor connections (common with Myanmar ISPs)
        if (iceState === 'failed') {
          console.log('[ConnectionMonitor] Attempting ICE restart due to poor connection...');
          this.peerConnection.restartIce();
        }
      }
      
      this.cdr.detectChanges();
    }, 3000); // Check every 3 seconds for better responsiveness
  }

    private setupFullscreenListener(): void {
    fromEvent(document, 'fullscreenchange')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isFullscreen = !!document.fullscreenElement;
        this.cdr.detectChanges();
      });
  }

  private startCallTimer(): void {
    this.callDuration = 0;
    this.callTimer = setInterval(() => {
      this.callDuration += 1;
      this.cdr.detectChanges();
    }, 1000);
  }

  private stopCallTimer(): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
    if (this.connectionMonitorTimer) {
      clearInterval(this.connectionMonitorTimer);
      this.connectionMonitorTimer = null;
    }
  }

  async startCall(): Promise<void> {
    if (!this.currentCall || !this.peerConnection) return;

    try {
      const mediaTimeout = setTimeout(() => {
        throw new Error('Media access timed out');
      }, 10000);

      const constraints = {
        audio: {
          deviceId: this.currentAudioDeviceId ? { exact: this.currentAudioDeviceId } : undefined
        },
        video: {
          deviceId: this.currentVideoDeviceId ? { exact: this.currentVideoDeviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      clearTimeout(mediaTimeout);

      const connectionTimeout = setTimeout(() => {
        this.errorMessage = 'Connection is taking longer than expected...';
        this.cdr.detectChanges();
      }, 15000);

      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      if (this.localVideoRef?.nativeElement) {
        this.localVideoRef.nativeElement.srcObject = this.localStream;
      }

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection.setLocalDescription(offer);

      const user = this.authService.getCurrentUser();
      const callerId = user!.userId;
      
      const signal: CallSignal = {
        conversationId: this.currentCall.conversationId,
        callerId: callerId,
        recipientId: this.currentCall.recipientId,
        callId: this.currentCall.callId, // Include callId
        type: SignalType.OFFER,
        payload: offer
      };

      this.callService.sendSignal(signal);
      this.monitorConnectionQuality();
      clearTimeout(connectionTimeout);
    } catch (error) {
      console.error('Error starting call:', error);
      this.handleMediaError(error);
      this.cleanup();
    }
  }

  private monitorConnectionQuality(): void {
    if (!this.peerConnection) return;

    const monitorInterval = setInterval(() => {
      if (!this.peerConnection || !this.isCallActive) {
        clearInterval(monitorInterval);
        return;
      }

      this.peerConnection.getStats().then(stats => {
        let packetsLost = 0;
        let packetsReceived = 0;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 1;
          }
        });

        const lossPercentage = (packetsLost / packetsReceived) * 100;

        if (lossPercentage > 20) {
          this.networkQuality = 'poor';
          this.showConnectionWarning = true;
        } else if (lossPercentage > 5) {
          this.networkQuality = 'average';
          this.showConnectionWarning = false;
        } else {
          this.networkQuality = 'good';
          this.showConnectionWarning = false;
        }

        this.cdr.detectChanges();
      });
    }, 5000);
  }

  async answerIncomingCall(): Promise<void> {
    if (!this.currentCall) return;

    try {
      this.isRinging = false;
      this.stopRingtone();
      this.cdr.detectChanges();

      const constraints = {
        audio: {
          deviceId: this.currentAudioDeviceId ? { exact: this.currentAudioDeviceId } : undefined
        },
        video: {
          deviceId: this.currentVideoDeviceId ? { exact: this.currentVideoDeviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      if (this.localVideoRef?.nativeElement) {
        this.localVideoRef.nativeElement.srcObject = this.localStream;
      }

      const answerRequest: CallRequest = {
        ...this.currentCall,
        status: CallStatus.ONGOING,
      };

      this.callService.answerCall(answerRequest);

      this.isCallActive = true;
      this.currentCall.status = CallStatus.ONGOING;
      this.startCallTimer();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error answering call:', error);
      this.handleMediaError(error);
      this.cleanup();
    }
  }

  rejectIncomingCall(): void {
    if (!this.currentCall) return;

    const rejectRequest: CallRequest = {
      ...this.currentCall,
      status: CallStatus.REJECTED,
    };
    this.callService.rejectCall(rejectRequest);
    this.cleanup();
  }

  async toggleScreenShare(): Promise<void> {
    if (this.isScreenSharing) {
      await this.stopScreenShare();
    } else {
      await this.startScreenShare();
    }
  }

  async startScreenShare(): Promise<void> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { max: 1920 },
          height: { max: 1080 },
          frameRate: { max: 30 }
        },
        audio: false
      });

      const videoTrack = this.screenStream.getVideoTracks()[0];
      const senders = this.peerConnection?.getSenders();

      if (senders) {
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);
          this.isScreenSharing = true;
          this.isVideoOff = false;

          videoTrack.onended = () => {
            this.stopScreenShare();
          };

          videoTrack.addEventListener('ended', () => {
            this.stopScreenShare();
          });
        }
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
      this.errorMessage = 'Screen sharing failed or was cancelled';
      this.cdr.detectChanges();
    }
  }

  async stopScreenShare(): Promise<void> {
    if (!this.screenStream || !this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    const senders = this.peerConnection?.getSenders();

    if (senders && videoTrack) {
      const videoSender = senders.find(s => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(videoTrack);
      }
    }

    this.screenStream.getTracks().forEach(track => track.stop());
    this.screenStream = null;
    this.isScreenSharing = false;
    this.cdr.detectChanges();
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    this.cdr.detectChanges();
  }

  toggleVideo(): void {
    this.isVideoOff = !this.isVideoOff;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = !this.isVideoOff;
      });
    }
    this.cdr.detectChanges();
  }

  toggleFullscreen(): void {
    if (!this.isFullscreen) {
      this.remoteVideoRef.nativeElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
    if (this.showSettings) {
      this.enumerateDevices();
    }
  }

  async changeAudioDevice(event: Event): Promise<void> {
    const deviceId = (event.target as HTMLSelectElement).value;
    if (!this.localStream || !deviceId) return;

    this.currentAudioDeviceId = deviceId;
    const constraints = { audio: { deviceId: { exact: deviceId } } };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const audioTrack = newStream.getAudioTracks()[0];
      const sender = this.peerConnection?.getSenders().find(
        s => s.track?.kind === 'audio'
      );

      if (sender && audioTrack) {
        await sender.replaceTrack(audioTrack);

        this.localStream.getAudioTracks().forEach(track => track.stop());
        this.localStream.addTrack(audioTrack);

        newStream.getVideoTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('Error changing audio device:', error);
    }
  }

  async changeVideoDevice(event: Event): Promise<void> {
    const deviceId = (event.target as HTMLSelectElement).value;
    if (!this.localStream || !deviceId) return;

    this.currentVideoDeviceId = deviceId;
    const constraints = {
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const videoTrack = newStream.getVideoTracks()[0];
      const senders = this.peerConnection?.getSenders();

      if (senders && videoTrack) {
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);

          this.localStream.getVideoTracks().forEach(track => track.stop());
          this.localStream.addTrack(videoTrack);

          this.localVideoRef.nativeElement.srcObject = this.localStream;
          newStream.getAudioTracks().forEach(track => track.stop());

          this.isVideoOff = false;
        }
      }
    } catch (error) {
      console.error('Error changing video device:', error);
    }
  }

  hangUp(): void {
    if (this.currentCall) {
      const endRequest: CallRequest = {
        ...this.currentCall,
        status: CallStatus.ENDED,
      };
      this.callService.endCall(endRequest);
    }
    this.stopCallTimer();
    this.cleanup();
    this.endCall.emit();
  }

  private cleanup(): void {
    this.stopCallTimer();
    this.stopRingtone();
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localVideoRef?.nativeElement) {
      this.localVideoRef.nativeElement.srcObject = null;
    }

    if (this.remoteVideoRef?.nativeElement) {
      this.remoteVideoRef.nativeElement.srcObject = null;
    }

    this.isCallActive = false;
    this.isRinging = false;
    this.isScreenSharing = false;
    this.currentCall = null;
    this.callDuration = 0;
    this.cdr.detectChanges();
  }

  formatCallDuration(): string {
    const minutes = Math.floor(this.callDuration / 60);
    const seconds = this.callDuration % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  private handleMediaError(error: any): void {
    let errorMessage = 'Unknown error occurred';

    if (error.name === 'NotAllowedError') {
      errorMessage = 'Camera and microphone access denied. Please allow permissions and try again.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera or microphone found. Please check your devices.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera or microphone is already in use by another application.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Camera or microphone constraints cannot be satisfied.';
    } else if (error.name === 'SecurityError') {
      errorMessage = 'Security error accessing media devices.';
    }

    console.error('[MediaError]', errorMessage, error);
    this.errorMessage = errorMessage;
    alert(errorMessage);
  }

  // Add a method to test WebRTC connectivity
  async testWebRTCConnection(): Promise<void> {
    console.log('[WebRTC] Testing connection...');
    
    try {
      // Test basic WebRTC support
      if (!window.RTCPeerConnection) {
        throw new Error('WebRTC not supported in this browser');
      }
      
      // Test TURN server connectivity
      const testConnection = new RTCPeerConnection({
        iceServers: environment.webrtc.iceServers
      });
      
      // Create a data channel to test connectivity
      const dataChannel = testConnection.createDataChannel('test');
      
      dataChannel.onopen = () => {
        console.log('[WebRTC] Test connection successful');
        dataChannel.close();
        testConnection.close();
      };
      
      dataChannel.onerror = (error) => {
        console.error('[WebRTC] Test connection failed:', error);
        testConnection.close();
      };
      
      // Set a timeout for the test
      setTimeout(() => {
        if (testConnection.connectionState !== 'connected') {
          console.warn('[WebRTC] Test connection timeout - may have connectivity issues');
          testConnection.close();
        }
      }, 10000);
      
    } catch (error) {
      console.error('[WebRTC] Connection test failed:', error);
      this.errorMessage = 'WebRTC connection test failed. Please check your internet connection.';
    }
  }
}
