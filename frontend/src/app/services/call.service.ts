// call.service.ts (Angular)
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from './web-socket.service';
import { AuthService } from './auth.service';
import { CallRequest } from '../models/call.request';
import { CallSignal } from './../models/call.signal';
import { CallStatus, SignalType } from './../models/call.enum';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CallService implements OnDestroy {
  private destroy$ = new Subject<void>();

  private incomingCall$ = new Subject<CallRequest>();
  private callInitiated$ = new Subject<CallRequest>();
  private callAnswered$ = new Subject<CallRequest>();
  private callRejected$ = new Subject<CallRequest>();
  private callEnded$ = new Subject<CallRequest>();
  private callSignal$ = new Subject<CallSignal>();

  // Global call state management
  private currentCallState$ = new BehaviorSubject<CallRequest | null>(null);
  private isCallActive$ = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private wsService: WebSocketService,
    private authService: AuthService
  ) {
    this.listenForIncomingCalls();
    this.listenForCallInitiated();
    this.listenForCallAnswered();
    this.listenForCallRejected();
    this.listenForCallEnded();
    this.listenForCallSignals();
  }

  // Global state getters
  getCurrentCallState(): CallRequest | null {
    return this.currentCallState$.value;
  }

  getCurrentCallState$(): Observable<CallRequest | null> {
    return this.currentCallState$.asObservable();
  }

  isCallActive(): boolean {
    return this.isCallActive$.value;
  }

  getIsCallActive$(): Observable<boolean> {
    return this.isCallActive$.asObservable();
  }

  // Global state setters
  setCurrentCallState(call: CallRequest | null): void {
    this.currentCallState$.next(call);
  }

  setIsCallActive(isActive: boolean): void {
    this.isCallActive$.next(isActive);
  }

  clearCallState(): void {
    this.currentCallState$.next(null);
    this.isCallActive$.next(false);
  }

  private listenForIncomingCalls(): void {
    console.log('[CallService] Setting up incoming call listener...');
    this.wsService
      .subscribe<CallRequest>('/user/queue/call/incoming')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (request) => {
          console.log('[CallService] RECEIVER: Received incoming call:', request);
          this.setCurrentCallState(request);
          this.setIsCallActive(false);
          this.incomingCall$.next(request);
        },
        error: (error) => {
          console.error('[CallService] Error in incoming call listener:', error);
        }
      });
  }

  private listenForCallInitiated(): void {
    console.log('[CallService] Setting up call initiated listener...');
    this.wsService
      .subscribe<CallRequest>('/user/queue/call/initiated')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (request) => {
          console.log('[CallService] CALLER: Received call initiated confirmation:', request);
          this.setCurrentCallState(request);
          this.setIsCallActive(false);
          this.callInitiated$.next(request);
        },
        error: (error) => {
          console.error('[CallService] Error in call initiated listener:', error);
        }
      });
  }

  private listenForCallAnswered(): void {
    this.wsService
      .subscribe<CallRequest>('/user/queue/call/answered')
      .pipe(takeUntil(this.destroy$))
      .subscribe(request => {
        this.setIsCallActive(true);
        this.callAnswered$.next(request);
      });
  }

  private listenForCallRejected(): void {
    this.wsService
      .subscribe<CallRequest>('/user/queue/call/rejected')
      .pipe(takeUntil(this.destroy$))
      .subscribe(request => {
        this.clearCallState();
        this.callRejected$.next(request);
      });
  }

  private listenForCallEnded(): void {
    this.wsService
      .subscribe<CallRequest>('/user/queue/call/ended')
      .pipe(takeUntil(this.destroy$))
      .subscribe(request => {
        this.clearCallState();
        this.callEnded$.next(request);
      });
  }

  private listenForCallSignals(): void {
    console.log('[CallService] Setting up call signals listener...');
    this.wsService
      .subscribe<CallSignal>('/user/queue/call/signals')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (signal) => {
          console.log('[CallService] Received call signal:', signal);
          console.log('Signal type:', signal.type);
          console.log('Caller ID:', signal.callerId);
          console.log('Recipient ID:', signal.recipientId);
          this.callSignal$.next(signal);
        },
        error: (error) => {
          console.error('[CallService] Error in call signals listener:', error);
        }
      });
  }

  listenForGroupCallSignals(conversationId: string): void {
    console.log('[CallService] Setting up group call signals listener for conversation:', conversationId);
    this.wsService
      .subscribe<CallSignal>(`/topic/call/${conversationId}/signals`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (signal) => {
          console.log('[CallService] Received group call signal:', signal);
          console.log('Signal type:', signal.type);
          console.log('Conversation ID:', signal.conversationId);
          this.callSignal$.next(signal);
        },
        error: (error) => {
          console.error('[CallService] Error in group call signals listener:', error);
        }
      });
  }

  getIncomingCall$(): Observable<CallRequest> {
    return this.incomingCall$.asObservable();
  }

  getCallInitiated$(): Observable<CallRequest> {
    return this.callInitiated$.asObservable();
  }

  getCallAnswered$(): Observable<CallRequest> {
    return this.callAnswered$.asObservable();
  }

  getCallRejected$(): Observable<CallRequest> {
    return this.callRejected$.asObservable();
  }

  getCallEnded$(): Observable<CallRequest> {
    return this.callEnded$.asObservable();
  }

  getCallSignal$(): Observable<CallSignal> {
    return this.callSignal$.asObservable();
  }

  sendSignal(signal: CallSignal): void {
    console.log('[CallService] Sending signal:', signal);
    console.log('Signal type:', signal.type);
    console.log('Caller ID:', signal.callerId);
    console.log('Recipient ID:', signal.recipientId);
    console.log('Conversation ID:', signal.conversationId);
    console.log('Call ID:', signal.callId);
    
    if (!signal.conversationId && !signal.recipientId) {
      console.error('Signal must have either conversationId or recipientId');
      return;
    }
    
    const route = signal.recipientId
      ? '/app/call/private/signal'
      : '/app/call/group/signal';
    
    console.log('Sending to route:', route);
    this.wsService.sendMessage(route, signal);
    console.log('Signal sent successfully');
  }

  initiateCall(request: CallRequest): void {
    const callRequest = {
      ...request,
      status: CallStatus.RINGING
    };
    console.log("[CallService] Initiating call:", callRequest);
    console.log("[CallService] API URL:", `${environment.apiUrl}/calls/start`);
    console.log("[CallService] Making HTTP POST request...");
    
    this.http.post(`${environment.apiUrl}/calls/start`, callRequest).subscribe({
      next: (response) => {
        console.log("[CallService] Call initiation successful:", response);
      },
      error: (error) => {
        console.error("[CallService] Call initiation failed:", error);
        console.error("[CallService] Error details:", error.message);
        console.error("[CallService] Error status:", error.status);
        console.error("[CallService] Error response:", error.error);
      }
    });
  }

  answerCall(request: CallRequest): void {
    this.http.post(`${environment.apiUrl}/calls/answer`, request).subscribe();
  }

  rejectCall(request: CallRequest): void {
    this.http.post(`${environment.apiUrl}/calls/reject`, request).subscribe();
  }

  endCall(request: CallRequest): void {
    this.http.post(`${environment.apiUrl}/calls/end`, request).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}