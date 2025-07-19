import { Injectable, inject, OnDestroy } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, Subject, BehaviorSubject, timer } from 'rxjs';
import { filter, switchMap, take, takeUntil } from 'rxjs/operators';
import {
  Client,
  IMessage as StompIMessage,
  StompSubscription,
} from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ApiResponse } from '../models/api-response';
import {
  ConversationUpdatedEvent,
  NewMessageEvent,
} from '../models/event.type';
import { Notification as NotificationModel } from '../models/notification';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private stompClient!: Client;
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private _connected$ = new BehaviorSubject<boolean>(false);
  public connected$ = this._connected$.asObservable();
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
  private isInitialized = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.setupAutoReconnect();
    this.setupAuthenticationListener();
    
    // Initialize if user is already authenticated
    if (this.isAuthenticated()) {
      this.initializeConnectionIfAuthenticated();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  private setupAuthenticationListener(): void {
    window.addEventListener('userAuthenticated', () => {
      console.log('User authenticated event received, initializing WebSocket...');
      this.initializeConnectionIfAuthenticated();
    });
  }

  private isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  private isWebSocketReady(): boolean {
    return this.stompClient && 
           this.stompClient.connected && 
           this.stompClient.active;
  }

  // Method to wait for WebSocket to be ready
  private waitForConnection(): Observable<boolean> {
    return new Observable<boolean>((subscriber) => {
      if (this.isWebSocketReady()) {
        subscriber.next(true);
        subscriber.complete();
        return;
      }

      // Wait for connection
      this.connected$
        .pipe(
          filter(connected => connected),
          take(1),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          if (this.isWebSocketReady()) {
            subscriber.next(true);
          } else {
            subscriber.error(new Error('WebSocket not ready'));
          }
          subscriber.complete();
        });
    });
  }

  // Method to initialize connection when user logs in
  initializeConnectionIfAuthenticated(): void {
    const token = this.getToken();
    console.log('Initializing WebSocket connection, token available:', !!token);
    if (token && !this.isInitialized) {
      console.log('Token found, initializing connection...');
      this.initializeConnection();
    } else if (token && this.isInitialized && !this.stompClient.connected) {
      console.log('Token found, reconnecting...');
      this.isInitialized = false; // Reset to allow reconnection
      this.initializeConnection();
    } else {
      console.log('No token or already connected, skipping connection');
    }
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private initializeConnection(): void {
    const token = this.getToken();
    
    if (!token) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      console.log('Connection already in progress, skipping...');
      return;
    }

    this.isInitialized = true;
    console.log('Initializing WebSocket connection...');

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      this.stompClient = new Client({
        webSocketFactory: () => {
          console.log('Creating SockJS connection to:', `${environment.wsUrl}/ws`);
          return new SockJS(`${environment.wsUrl}/ws`);
        },
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        debug: (str) => {
          console.log('STOMP Debug:', str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      this.stompClient.onConnect = () => {
        this.handleConnect();
        resolve();
      };
      this.stompClient.onStompError = (frame) => {
        this.handleError(frame);
        reject(new Error(frame.headers['message'] || 'STOMP error'));
      };
      this.stompClient.onWebSocketError = (error) => {
        this.handleWebSocketError(error);
        reject(error);
      };
      this.stompClient.onDisconnect = () => this.handleDisconnection();

      console.log('Activating STOMP client...');
      this.stompClient.activate();
    });

    this.connectionPromise.finally(() => {
      this.connectionPromise = null;
    });
  }

  private handleConnect(): void {
    console.log('WebSocket connected successfully');
    this.reconnectAttempts = 0;
    this._connected$.next(true);
    this.connectionStatus.next(true);

    // Wait a bit longer to ensure connection is fully established
    setTimeout(() => {
      // Double-check that STOMP client is still connected
      if (this.stompClient && this.stompClient.connected) {
        console.log('Processing pending subscriptions:', this.pendingSubscriptions.length);
        this.pendingSubscriptions.forEach((sub) => {
          try {
            this.internalSubscribe(sub.destination, sub.subject);
          } catch (error) {
            console.error('Error processing pending subscription:', error);
          }
        });
        this.pendingSubscriptions = [];
      } else {
        console.warn('STOMP client not connected when processing pending subscriptions');
      }
    }, 1000); // Increased delay to ensure connection is stable
  }

  private handleError(frame: any): void {
    console.error('STOMP error:', frame.headers['message'], frame.body);
    console.error('STOMP error details:', frame);
    this.handleDisconnection();
  }

  private handleWebSocketError(error: Event): void {
    console.error('WebSocket error:', error);
    this.handleDisconnection();
  }

  private handleDisconnection(): void {
    console.log('WebSocket disconnected');
    this.connectionStatus.next(false);
    this._connected$.next(false);

    if (this.reconnectAttempts++ < this.maxReconnectAttempts) {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        if (!this.stompClient.active) {
          console.log('Reconnecting...');
          this.stompClient.activate();
        }
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
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
          console.log('Auto-reconnecting...');
          this.stompClient.activate();
        }
      });
  }

  private internalSubscribe(destination: string, subject: Subject<any>): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('STOMP client not connected, cannot subscribe to:', destination);
      // Add to pending subscriptions for later processing
      this.pendingSubscriptions.push({ destination, subject });
      return;
    }

    const token = this.getToken();
    if (!token) {
      console.warn('No token available, cannot subscribe to:', destination);
      return;
    }

    try {
      console.log('Subscribing to:', destination);
      const subscription = this.stompClient.subscribe(
        destination,
        (msg: StompIMessage) => {
          try {
            console.log('Received message from:', destination, msg.body);
            subject.next(JSON.parse(msg.body));
          } catch (e) {
            console.error('WS message parse error:', e);
            subject.error(e);
          }
        },
        {
          Authorization: `Bearer ${token}`,
        }
      );

      this.subscriptions.set(destination, { subject, subscription });
      console.log('Subscription created for:', destination);
    } catch (error) {
      console.error('Error creating subscription for:', destination, error);
      subject.error(error);
    }
  }

  subscribe<T>(destination: string): Observable<T> {
    const subject = new Subject<T>();

    if (this.stompClient && this.stompClient.connected) {
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
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination,
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${this.getToken()}`,
        },
      });
    } else {
      console.warn('Cannot send message, WebSocket not connected');
    }
  }

  listenForConversationUpdates(): Observable<
    ApiResponse<ConversationUpdatedEvent>
  > {
    console.log('Setting up conversation updates listener...');
    return new Observable<ApiResponse<ConversationUpdatedEvent>>(
      (subscriber) => {
        // Wait for connection to be established
        this.connected$
          .pipe(
            filter(connected => connected),
            take(1),
            takeUntil(this.destroy$)
          )
          .subscribe(() => {
            const token = this.getToken();
            if (!token) {
              console.error('No auth token available for conversation updates');
              subscriber.error(new Error('No auth token available'));
              return;
            }

            console.log('Subscribing to conversation updates at /user/queue/conversation-updates');
            const subscription = this.stompClient.subscribe(
              '/user/queue/conversation-updates',
              (message) => {
                try {
                  console.log('Received conversation update message:', message.body);
                  const parsed: ApiResponse<ConversationUpdatedEvent> = JSON.parse(
                    message.body
                  );
                  console.log('Parsed conversation update:', parsed);
                  subscriber.next(parsed);
                } catch (error) {
                  console.error('Error parsing conversation update:', error);
                  subscriber.error(error);
                }
              },
              {
                Authorization: `Bearer ${token}`,
              }
            );
            
            console.log('Conversation updates subscription created');
            return () => {
              console.log('Unsubscribing from conversation updates');
              subscription.unsubscribe();
            };
          });
      }
    );
  }

  listenForMessageUpdates(
    conversationId: string
  ): Observable<ApiResponse<NewMessageEvent>> {
    return new Observable<ApiResponse<NewMessageEvent>>((subscriber) => {
      // Wait for connection to be established
      this.connected$
        .pipe(
          filter(connected => connected),
          take(1),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          const token = this.getToken();
          if (!token) {
            subscriber.error(new Error('No auth token available'));
            return;
          }

          const subscription = this.stompClient.subscribe(
            `/topic/conversation/${conversationId}/messages`,
            (message) => {
              try {
                const parsed: ApiResponse<NewMessageEvent> = JSON.parse(
                  message.body
                );
                subscriber.next(parsed);
              } catch (error) {
                console.error('Error parsing message update:', error);
                subscriber.error(error);
              }
            },
            {
              Authorization: `Bearer ${token}`,
            }
          );
          
          return () => {
            subscription.unsubscribe();
          };
        });
    });
  }

  // Listen for real-time notifications
  listenForNotifications(): Observable<NotificationModel> {
    return new Observable<NotificationModel>((subscriber) => {
      let subscription: any = null;
      
      // Wait for connection to be established
      this.waitForConnection()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            const token = this.getToken();
            if (!token) {
              console.error('No auth token available for notifications');
              subscriber.error(new Error('No auth token available'));
              return;
            }

            try {
              console.log('Subscribing to notifications at /user/queue/notifications');
              subscription = this.stompClient.subscribe(
                '/user/queue/notifications',
                (message) => {
                  try {
                    console.log('Received notification message:', message.body);
                    const notification: NotificationModel = JSON.parse(message.body);
                    subscriber.next(notification);
                  } catch (error) {
                    console.error('Error parsing notification:', error);
                    subscriber.error(error);
                  }
                },
                {
                  Authorization: `Bearer ${token}`,
                }
              );
              
              console.log('Notifications subscription created');
            } catch (error) {
              console.error('Error creating notifications subscription:', error);
              subscriber.error(error);
            }
          },
          error: (error) => {
            console.error('Error waiting for WebSocket connection:', error);
            subscriber.error(error);
          }
        });
      
      // Return cleanup function from the Observable constructor
      return () => {
        if (subscription) {
          console.log('Unsubscribing from notifications');
          subscription.unsubscribe();
        }
      };
    });
  }

  // Listen for unread count updates
  listenForUnreadCount(): Observable<number> {
    console.log('Setting up unread count listener...');
    return new Observable<number>((subscriber) => {
      let subscription: any = null;
      
      this.waitForConnection()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            const token = this.getToken();
            if (!token) {
              console.error('No auth token available for unread count updates');
              subscriber.error(new Error('No auth token available'));
              return;
            }

            try {
              console.log('Subscribing to unread count updates at /user/queue/unread-count');
              subscription = this.stompClient.subscribe(
                '/user/queue/unread-count',
                (message) => {
                  try {
                    console.log('Received unread count message:', message.body);
                    const count: number = JSON.parse(message.body);
                    console.log('Parsed unread count:', count);
                    subscriber.next(count);
                  } catch (error) {
                    console.error('Error parsing unread count:', error);
                    subscriber.error(error);
                  }
                },
                {
                  Authorization: `Bearer ${token}`,
                }
              );
              
              console.log('Unread count subscription created');
            } catch (error) {
              console.error('Error creating unread count subscription:', error);
              subscriber.error(error);
            }
          },
          error: (error) => {
            console.error('Error waiting for WebSocket connection:', error);
            subscriber.error(error);
          }
        });
      
      // Return cleanup function from the Observable constructor
      return () => {
        if (subscription) {
          console.log('Unsubscribing from unread count updates');
          subscription.unsubscribe();
        }
      };
    });
  }

  disconnect(): void {
    this.subscriptions.forEach((info) => {
      info.subscription?.unsubscribe();
      info.subject.complete();
    });
    this.stompClient.onDisconnect = () => {
      this._connected$.next(false);
    };
    this.subscriptions.clear();
    this.pendingSubscriptions = [];
    this.stompClient.deactivate();
  }
}
