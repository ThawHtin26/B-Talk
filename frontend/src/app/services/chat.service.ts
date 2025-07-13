import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { Conversation } from '../models/conversation';
import { Message } from '../models/message';
import { Attachment } from '../models/attachment';


@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private activeConversation = new BehaviorSubject<Conversation | null>(null);
  activeConversation$ = this.activeConversation.asObservable();

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/conversations`);
  }

  getMessages(conversationId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/conversations/${conversationId}/messages`);
  }

  sendMessage(conversationId: number, content: string, attachments: File[] = []): Observable<Message> {
    const formData = new FormData();
    formData.append('content', content);
    attachments.forEach(file => formData.append('attachments', file));

    return this.http.post<Message>(`${this.apiUrl}/conversations/${conversationId}/messages`, formData);
  }

  setActiveConversation(conversation: Conversation): void {
    this.activeConversation.next(conversation);
  }

  startVideoCall(conversationId: number): Observable<{ callId: string }> {
    return this.http.post<{ callId: string }>(`${this.apiUrl}/calls/video`, { conversationId });
  }

  uploadAttachment(file: File): Observable<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Attachment>(`${this.apiUrl}/attachments`, formData);
  }

  createPrivateConversation(participantId: number): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.apiUrl}/conversations/private`, {
      participantId
    });
  }

  createGroupConversation(name: string, participantIds: number[]): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.apiUrl}/conversations/group`, {
      name,
      participantIds
    });
  }
}
