import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { WebSocketService } from './web-socket.service';
import { AuthService } from './auth.service';
import { CallRequest } from '../models/call.request';
import { CallSignal } from './../models/call.signal';
import { SignalType } from './../models/call.enum';

@Injectable({ providedIn: 'root' })
export class CallService implements OnDestroy {
  private destroy$ = new Subject<void>();

  private incomingCall$ = new Subject<CallRequest>();
  private callAnswered$ = new Subject<CallRequest>();
  private callRejected$ = new Subject<CallRequest>();
  private callEnded$ = new Subject<CallRequest>();
  private callSignal$ = new Subject<CallSignal>();

  constructor(
    private wsService: WebSocketService,
    private authService: AuthService
  ) {
    this.listenForIncomingCalls();
    this.listenForCallAnswered();
    this.listenForCallRejected();
    this.listenForCallEnded();
    this.listenForCallSignals();


  }


  private listenForIncomingCalls(): void {
    this.wsService
      .subscribe<CallRequest>('/user/queue/call/incoming')
      .pipe(takeUntil(this.destroy$))
      .subscribe(request => this.incomingCall$.next(request));
  }

  private listenForCallAnswered(): void {
    this.wsService
      .subscribe<CallRequest>('/user/queue/call/answered')
      .pipe(takeUntil(this.destroy$))
      .subscribe(request => this.callAnswered$.next(request));
  }

  private listenForCallRejected(): void {
    this.wsService
      .subscribe<CallRequest>('/user/queue/call/rejected')
      .pipe(takeUntil(this.destroy$))
      .subscribe(request => this.callRejected$.next(request));
  }

  private listenForCallEnded(): void {
    this.wsService
      .subscribe<CallRequest>('/user/queue/call/ended')
      .pipe(takeUntil(this.destroy$))
      .subscribe(request => this.callEnded$.next(request));
  }

  private listenForCallSignals(): void {
    this.wsService
      .subscribe<CallSignal>('/user/queue/call/signals')
      .pipe(takeUntil(this.destroy$))
      .subscribe(signal => this.callSignal$.next(signal));
  }

  listenForGroupCallSignals(conversationId: number): void {
    this.wsService
      .subscribe<CallSignal>(`/topic/call/${conversationId}/signals`)
      .pipe(takeUntil(this.destroy$))
      .subscribe(signal => {
        console.log('[Signal] Received from group:', signal);
        this.callSignal$.next(signal);
      });
  }

  // --- Exposed Observable APIs ---

  getIncomingCall$(): Observable<CallRequest> {
    return this.incomingCall$.asObservable();
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

  // --- WebSocket outbound events ---

  initiateCall(request: CallRequest): void {
    this.wsService.sendMessage('/app/call/start', request);
  }

  answerCall(request: CallRequest): void {
    this.wsService.sendMessage('/app/call/answer', request);
  }

  rejectCall(request: CallRequest): void {
    this.wsService.sendMessage('/app/call/reject', request);
  }

  endCall(request: CallRequest): void {
    this.wsService.sendMessage('/app/call/end', request);
  }

  sendSignal(signal: CallSignal): void {
    let route: string;
    console.log('Send signal', signal);

    switch (signal.type) {
      case SignalType.OFFER:
      case SignalType.ANSWER:
      case SignalType.CANDIDATE:
        route = signal.recipientId
          ? '/app/call/private/signal'
          : '/app/call/group/signal';
        break;

      default:
        console.warn('Unhandled signal type:', signal.type);
        return;
    }

    this.wsService.sendMessage(route, signal);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
