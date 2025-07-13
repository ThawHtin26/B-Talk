// web-socket.service.ts
import { Injectable, inject, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { Observable, Subject, BehaviorSubject, timer, EMPTY } from 'rxjs';
import { filter, switchMap, take, catchError, map, tap, takeUntil } from 'rxjs/operators';
import {
  Client,
  IMessage as StompIMessage,
  StompSubscription,
} from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ApiResponse } from '../models/api-response';
import { Message } from '../models/message';
import { Conversation } from '../models/conversation';
import { ConversationUpdatedEvent, NewMessageEvent } from '../models/event.type';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private authService = inject(AuthService);
  private stompClient!: Client;
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private pendingSubscriptions: Array<{
    destination: string;
    subject: Subject<any>;
  }> = [];
  private subscriptions = new Map<
    string,
    { subject: Subject<any>; subscription?: StompSubscription }
  >();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectInterval = 5000;
  private readonly destroy$ = new Subject<void>();

  constructor() {
    this.initializeConnection();
    this.setupAutoReconnect();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  private initializeConnection(): void {
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${environment.wsUrl}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${this.authService.getToken()}`,
      },
      debug: (str) => console.debug('[STOMP]', str),
      reconnectDelay: 0,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = () => this.handleConnect();
    this.stompClient.onStompError = (frame) => this.handleError(frame);
    this.stompClient.onWebSocketError = () => this.handleDisconnection();
    this.stompClient.onDisconnect = () => this.connectionStatus.next(false);

    this.stompClient.activate();
  }

  private handleConnect(): void {
    this.reconnectAttempts = 0;
    this.connectionStatus.next(true);
    this.pendingSubscriptions.forEach((sub) =>
      this.internalSubscribe(sub.destination, sub.subject)
    );
    this.pendingSubscriptions = [];
  }

  private handleError(frame: any): void {
    console.error('STOMP error:', frame.headers['message'], frame.body);
    this.handleDisconnection();
  }

  private handleDisconnection(): void {
    this.connectionStatus.next(false);
    if (this.reconnectAttempts++ < this.maxReconnectAttempts) {
      setTimeout(
        () => !this.stompClient.active && this.stompClient.activate(),
        this.reconnectInterval
      );
    }
  }

  private setupAutoReconnect(): void {
    this.connectionStatus
      .pipe(
        filter((connected) => !connected),
        switchMap(() => timer(this.reconnectInterval)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (
          this.reconnectAttempts < this.maxReconnectAttempts &&
          !this.stompClient.active
        ) {
          this.stompClient.activate();
        }
      });
  }

  private internalSubscribe(destination: string, subject: Subject<any>): void {
    if (!this.stompClient.connected) return;

    const subscription = this.stompClient.subscribe(
      destination,
      (msg: StompIMessage) => {
        try {
          subject.next(JSON.parse(msg.body));
        } catch (e) {
          console.error('WS message parse error', e);
          subject.error(e);
        }
      },
      { Authorization: `Bearer ${this.authService.getToken()}` }
    );

    this.subscriptions.set(destination, { subject, subscription });
  }

  subscribe<T>(destination: string): Observable<T> {
    const subject = new Subject<T>();

    if (this.stompClient.connected) {
      this.internalSubscribe(destination, subject);
    } else {
      this.pendingSubscriptions.push({ destination, subject });
      this.connectionStatus
        .pipe(
          filter((connected) => connected),
          take(1),
          takeUntil(this.destroy$)
        )
        .subscribe(() => this.internalSubscribe(destination, subject));
    }

    return subject.asObservable();
  }

  sendMessage(destination: string, payload: any): void {
    if (this.stompClient.connected) {
      this.stompClient.publish({
        destination: `/app${destination}`,
        body: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${this.authService.getToken()}`,
        },
      });
    }
  }

// In your WebSocketService
listenForConversationUpdates(): Observable<ApiResponse<ConversationUpdatedEvent>> {
  return new Observable<ApiResponse<ConversationUpdatedEvent>>(subscriber => {
    const subscription = this.stompClient.subscribe(
      '/queue/conversation-updates',
      (message) => {
        try {
          const parsed: ApiResponse<ConversationUpdatedEvent> = JSON.parse(message.body);
          subscriber.next(parsed);
        } catch (error) {
          subscriber.error(error);
        }
      }
    );
    return () => subscription.unsubscribe();
  });
}

listenForMessageUpdates(conversationId: number): Observable<ApiResponse<NewMessageEvent>> {
  return new Observable<ApiResponse<NewMessageEvent>>(subscriber => {
    const subscription = this.stompClient.subscribe(
      `/topic/conversation/${conversationId}/messages`,
      (message) => {
        try {
          const parsed: ApiResponse<NewMessageEvent> = JSON.parse(message.body);
          subscriber.next(parsed);
        } catch (error) {
          subscriber.error(error);
        }
      }
    );
    return () => subscription.unsubscribe();
  });
}

  private parseMessage<T = any>(response: any): ApiResponse<T> {
    if (typeof response === 'string') {
      try {
        return JSON.parse(response) as ApiResponse<T>;
      } catch (e) {
        console.error('Parse error:', e, 'Input:', response);
        return {
          success: false,
          message: 'Failed to parse server response',
          data: null as any as T,
        };
      }
    }
    return response as ApiResponse<T>;
  }

  disconnect(): void {
    this.subscriptions.forEach((info) => {
      info.subscription?.unsubscribe();
      info.subject.complete();
    });
    this.subscriptions.clear();
    this.pendingSubscriptions = [];
    this.stompClient.deactivate();
  }
}
