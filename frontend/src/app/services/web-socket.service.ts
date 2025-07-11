import { Injectable, inject } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { Message } from '../models/message';
import { filter, map, Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private authService = inject(AuthService);
  private socket$!: WebSocketSubject<any>;

  connect(): WebSocketSubject<any> {
    if (!this.socket$ || this.socket$.closed) {
      const token = this.authService.getToken();
      this.socket$ = webSocket(`${environment.wsUrl}?token=${token}`);
    }
    return this.socket$;
  }

  disconnect(): void {
    if (this.socket$) {
      this.socket$.complete();
    }
  }

  sendMessage(message: Partial<Message>): void {
    this.connect().next({
      type: 'NEW_MESSAGE',
      payload: message
    });
  }

  onMessage(): Observable<Message> {
    return this.connect().asObservable().pipe(
      filter(msg => msg.type === 'NEW_MESSAGE'),
      map(msg => msg.payload)
    );
  }

  onCall(): Observable<{ callId: string, caller: number }> {
    return this.connect().asObservable().pipe(
      filter(msg => msg.type === 'CALL_INITIATED'),
      map(msg => msg.payload)
    );
  }
}