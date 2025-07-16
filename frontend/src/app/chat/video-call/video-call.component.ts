import {
  Component,
  EventEmitter,
  Output,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallService } from '../../services/call.service';
import { AuthService } from '../../services/auth.service';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject, interval } from 'rxjs';
import { SignalType, CallStatus, CallType } from '../../models/call.enum';
import { CallRequest } from '../../models/call.request';
import { CallSignal } from '../../models/call.signal';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-video-call',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.scss'],
})
export class VideoCallComponent implements OnInit, OnDestroy {
  @Output() endCall = new EventEmitter<void>();
  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;

  isMuted = false;
  isVideoOff = false;
  isFullscreen = false;
  isRinging = false;
  isCallActive = false;
  currentCall: CallRequest | null = null;
  callDuration = 0;
  private callTimer: any;

  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private callService: CallService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setupWebRTC();

      this.callService.getIncomingCall$()
    .pipe(takeUntil(this.destroy$))
    .subscribe((request) => {
      this.currentCall = request;
      this.isRinging = true;

      if (request.callType === CallType.GROUP) {
        this.callService.listenForGroupCallSignals(request.conversationId);
      }
    });



    this.listenForCallEvents();
  }

  private setupWebRTC(): void {
  console.log('[WebRTC] Initializing peer connection...');
  const config = {
    iceServers: environment.webrtc.iceServers,
  };

  this.peerConnection = new RTCPeerConnection(config);

  this.peerConnection.onicecandidate = (event) => {
    if (event.candidate && this.currentCall) {
      console.log('[WebRTC] Sending ICE candidate:', event.candidate);
      const signal: CallSignal = {
        conversationId: this.currentCall.conversationId,
        senderId: this.authService.getCurrentUser()?.userId!,
        recipientId:
          this.currentCall.callType === CallType.PRIVATE
            ? this.currentCall.recipientId
            : undefined,
        type: SignalType.CANDIDATE,
        payload: event.candidate,
      };
      this.callService.sendSignal(signal);
    }
  };

  this.peerConnection.ontrack = (event) => {
    console.log('[WebRTC] Remote track received:', event.streams);
    if (!this.remoteStream) {
      this.remoteStream = new MediaStream();
    }
    event.streams[0].getTracks().forEach((track) => {
      this.remoteStream!.addTrack(track);
    });

    if (this.remoteVideoRef) {
      this.remoteVideoRef.nativeElement.srcObject = this.remoteStream;
    }
  };
}


  private listenForCallEvents(): void {
    // this.callService
    //   .getIncomingCall$()
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe((request) => {
    //     this.currentCall = request;
    //     this.isRinging = true;
    //   });

    this.callService
      .getCallAnswered$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((request) => {
        this.isRinging = false;
        this.isCallActive = true;
        if (this.currentCall) {
          this.currentCall.status = CallStatus.ONGOING;
        }
        this.startCall();
        this.startCallTimer();
      });

    this.callService
      .getCallRejected$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((request) => {
        this.isRinging = false;
        this.cleanup();
      });

    this.callService
      .getCallEnded$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((request) => {
        this.isCallActive = false;
        this.cleanup();
        this.endCall.emit();
      });

    this.callService
      .getCallSignal$()
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
          senderId: this.authService.getCurrentUser()!.userId,
          recipientId: signal.recipientId,
          type: SignalType.ANSWER,
          payload: answer,
        };
        this.callService.sendSignal(answerSignal);
      });

    this.callService
      .getCallSignal$()
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

    this.callService
      .getCallSignal$()
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
  }

  private startCallTimer(): void {
    this.callDuration = 0;
    this.callTimer = setInterval(() => {
      this.callDuration += 1;
    }, 1000);
  }

  private stopCallTimer(): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
  }

  async startCall(): Promise<void> {
  if (!this.currentCall) return;

  try {
    console.log('[Call] Starting call...');
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    console.log('[Media] Local stream obtained');

    this.localStream.getTracks().forEach((track) => {
      console.log('[Media] Adding local track:', track);
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    if (this.localVideoRef) {
      this.localVideoRef.nativeElement.srcObject = this.localStream;
    }

    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);
    console.log('[WebRTC] Sending offer:', offer);

    const signal: CallSignal = {
      conversationId: this.currentCall.conversationId,
      senderId: this.authService.getCurrentUser()?.userId!,
      recipientId:
        this.currentCall.callType === CallType.PRIVATE
          ? this.currentCall.recipientId
          : undefined,
      type: SignalType.OFFER,
      payload: offer,
    };
    this.callService.sendSignal(signal);
  } catch (error) {
    console.error('[Error] Error starting call:', error);
    this.cleanup();
  }
}


  async answerIncomingCall(): Promise<void> {
    if (!this.currentCall) return;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      if (this.localVideoRef) {
        this.localVideoRef.nativeElement.srcObject = this.localStream;
      }

      const answerRequest: CallRequest = {
        ...this.currentCall,
        status: CallStatus.ONGOING,
      };
      this.callService.answerCall(answerRequest);

      this.isRinging = false;
      this.isCallActive = true;
      this.currentCall.status = CallStatus.ONGOING;
      this.startCallTimer();
    } catch (error) {
      console.error('Error answering call:', error);
      this.cleanup();
    }
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }
  }

  toggleVideo(): void {
    this.isVideoOff = !this.isVideoOff;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !this.isVideoOff;
      });
    }
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    const videoElement = this.remoteVideoRef.nativeElement;
    if (this.isFullscreen) {
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
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

  rejectCall(): void {
    if (this.currentCall) {
      const rejectRequest: CallRequest = {
        ...this.currentCall,
        status: CallStatus.REJECTED,
      };
      this.callService.rejectCall(rejectRequest);
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.stopCallTimer();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localVideoRef?.nativeElement.srcObject) {
      this.localVideoRef.nativeElement.srcObject = null;
    }

    if (this.remoteVideoRef?.nativeElement.srcObject) {
      this.remoteVideoRef.nativeElement.srcObject = null;
    }

    this.currentCall = null;
    this.isRinging = false;
    this.isCallActive = false;
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }
}
