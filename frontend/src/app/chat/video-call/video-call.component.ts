import {
  Component, EventEmitter, Output, OnDestroy, OnInit,
  ViewChild, ElementRef, ChangeDetectorRef, HostListener,
  AfterViewInit
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  async ngAfterViewInit() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (this.localVideoRef?.nativeElement) {
        this.localVideoRef.nativeElement.srcObject = this.localStream;
      }
    } catch (err) {
      console.error('[WebRTC] Could not access camera/mic:', err);
      this.handleMediaError(err);
    }
  }

  private initializeAudio(): void {
    this.audioElement = new Audio(this.ringtoneSrc);
    this.audioElement.loop = true;
  }

  private playRingtone(): void {
    if (this.audioElement) {
      this.audioElement.play().catch(e => console.error('Error playing ringtone:', e));
    }
  }

  private stopRingtone(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
  }

  private setupWebRTC(): void {
    this.peerConnection = new RTCPeerConnection({
      iceServers: environment.webrtc.iceServers,
      iceTransportPolicy: 'all'
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentCall) {
        const signal: CallSignal = {
          conversationId: this.currentCall.conversationId,
          callerId: this.authService.getCurrentUser()?.userId!,
          recipientId: this.currentCall.recipientId, // Fix: Include recipientId
          callId: this.currentCall.callId, // Fix: Include callId
          type: SignalType.CANDIDATE,
          payload: event.candidate
        };
        this.callService.sendSignal(signal);
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (!event.streams || event.streams.length === 0) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
        this.remoteVideoRef.nativeElement.srcObject = this.remoteStream;
      } else {
        this.remoteVideoRef.nativeElement.srcObject = event.streams[0];
        this.remoteStream = event.streams[0];
      }

      if (event.track.kind === 'video') {
        this.remoteVideoOff = false;
        this.cdr.detectChanges();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      if (state === 'disconnected' || state === 'failed') {
        this.showConnectionWarning = true;
        this.networkQuality = 'poor';
        if (state === 'failed') {
          this.peerConnection?.restartIce();
        }
      } else if (state === 'connected') {
        this.showConnectionWarning = false;
        this.networkQuality = 'good';
      }
      this.cdr.detectChanges();
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === 'connected') {
        this.isRinging = false;
        this.stopRingtone();
        this.cdr.detectChanges();
      }
    };
  }

  private listenForCallEvents(): void {
    // Handle incoming call requests
    this.callService.getIncomingCall$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((request) => {
        this.currentCall = request;
        this.isRinging = true;
        this.playRingtone();
        this.cdr.detectChanges();

        if (request.callType === CallType.GROUP) {
          this.callService.listenForGroupCallSignals(request.conversationId);
        }
      });

    // Handle call answered notifications
    this.callService.getCallAnswered$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (request) => {
        this.isRinging = false;
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
        this.isRinging = false;
        this.cleanup();
        this.cdr.detectChanges();
      });

    // Handle call ended notifications
    this.callService.getCallEnded$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isCallActive = false;
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

        const answerSignal: CallSignal = {
          conversationId: signal.conversationId,
          callerId: this.authService.getCurrentUser()!.userId,
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

      // Simulate network quality check (in a real app, use actual metrics)
      const states = this.peerConnection.iceConnectionState;
      if (states === 'connected') {
        this.networkQuality = 'good';
        this.showConnectionWarning = false;
      } else if (states === 'checking') {
        this.networkQuality = 'average';
        this.showConnectionWarning = false;
      }
      this.cdr.detectChanges();
    }, 5000);
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

      const signal: CallSignal = {
        conversationId: this.currentCall.conversationId,
        callerId: this.authService.getCurrentUser()?.userId!,
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
}
