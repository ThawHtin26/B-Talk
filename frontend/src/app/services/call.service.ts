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
  private callAnswered$ = new Subject<CallRequest>();
  private callRejected$ = new Subject<CallRequest>();
  private callEnded$ = new Subject<CallRequest>();
  private callSignal$ = new Subject<CallSignal>();

  constructor(
    private http: HttpClient,
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

  listenForGroupCallSignals(conversationId: string): void {
    this.wsService
      .subscribe<CallSignal>(`/topic/call/${conversationId}/signals`)
      .pipe(takeUntil(this.destroy$))
      .subscribe(signal => this.callSignal$.next(signal));
  }

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

  sendSignal(signal: CallSignal): void {
    if (!signal.conversationId && !signal.recipientId) {
      console.error('Signal must have either conversationId or recipientId');
      return;
    }
    const route = signal.recipientId
      ? '/app/call/private/signal'
      : '/app/call/group/signal';
    this.wsService.sendMessage(route, signal);
  }

  initiateCall(request: CallRequest): void {
    const callRequest = {
      ...request,
      status: CallStatus.RINGING
    };
    console.log("Bahubali",callRequest);
    this.http.post(`${environment.apiUrl}/calls/start`, callRequest).subscribe();
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