import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { Conversation } from '../../models/conversation';
import { AuthService } from '../../services/auth.service';
import { Subscription, switchMap, of, filter, tap, catchError } from 'rxjs';
import { Message } from '../../models/message';
import { Attachment } from '../../models/attachment';
import { FilenameFromUrlPipe } from '../../pipes/filenameformurl.pipe';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [CommonModule,FilenameFromUrlPipe],
  templateUrl: './message-list.component.html',
  styleUrls: ['./message-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageListComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private cd = inject(ChangeDetectorRef);
  private subscriptions = new Subscription();

  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

  messages: Message[] = [];
  activeConversation: Conversation | null = null;
  isLoading = false;
  error: string | null = null;
  private currentUserId: number | null = null;
  private currentlyPlayingAudio: {attachment: any, element: HTMLAudioElement} | null = null;

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?.userId ?? null;
    this.setupConversationListener();
    this.setupMessageUpdatesListener();
  }
  private setupConversationListener(): void {
    this.subscriptions.add(
      this.chatService.activeConversation$.pipe(
        tap(conv => {
          console.log('Active conversation changed to:', conv?.conversationId);
          this.activeConversation = conv;
          this.messages = [];
          this.cd.markForCheck();
        }),
        filter(conv => !!conv),
        tap(() => {
          this.isLoading = true;
          this.error = null;
          this.cd.markForCheck();
        }),
        switchMap(conv =>
          this.chatService.getMessages(conv!.conversationId).pipe(
            tap(response => {
              if (response.success && response.data) {
                this.messages = response.data;
              }
              this.isLoading = false;
              this.cd.markForCheck();
            }),
            catchError(err => {
              console.error('Message load error:', err);
              this.isLoading = false;
              this.error = 'Failed to load messages';
              this.cd.markForCheck();
              return of(null);
            })
          )
        )
      ).subscribe()
    );
  }

  private setupMessageUpdatesListener(): void {
    this.subscriptions.add(
      this.chatService.messageUpdates$.pipe(
        filter(message => !!message),
        tap(message => {
          if (this.activeConversation &&
              message.conversationId === this.activeConversation.conversationId) {
            // Check if message already exists to prevent duplicates
            if (!this.messages.some(m => m.messageId === message.messageId)) {
              this.messages = [...this.messages, message];
              this.cd.markForCheck();
            }
          }
        })
      ).subscribe()
    );
  }

  isMyMessage(senderId: number): boolean {
    return senderId === this.currentUserId;
  }

trackByMessageId(index: number, message: Message): number {
  // Handle cases where message or messageId might be undefined
  return message?.messageId ?? index; // Fallback to index if messageId is undefined
}



  // Media handling methods
  openMediaViewer(attachment: any): void {
    // Implement your media viewer logic here
    console.log('Opening media viewer for:', attachment);
  }

  toggleAudioPlayback(attachment: any): void {
    if (this.currentlyPlayingAudio && this.currentlyPlayingAudio.attachment === attachment) {
      // Pause currently playing audio
      this.currentlyPlayingAudio.element.pause();
      this.currentlyPlayingAudio = null;
    } else {
      // Stop any currently playing audio
      if (this.currentlyPlayingAudio) {
        this.currentlyPlayingAudio.element.pause();
      }

      // Find the audio element for this attachment
      const audioElement = document.createElement('audio');
      audioElement.src = attachment.url;

      // Play the new audio
      audioElement.play()
        .then(() => {
          this.currentlyPlayingAudio = {attachment, element: audioElement};
          this.cd.markForCheck();
        })
        .catch(err => {
          console.error('Error playing audio:', err);
        });
    }
  }

  isAudioPlaying(attachment: Attachment): boolean {
    return this.currentlyPlayingAudio?.attachment === attachment;
  }

  onAudioEnded(attachment: Attachment): void {
    if (this.currentlyPlayingAudio?.attachment === attachment) {
      this.currentlyPlayingAudio = null;
      this.cd.markForCheck();
    }
  }

  // File utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(attachment: Attachment): string {
    const extension = attachment.fileType.split('.').pop()?.toLowerCase() || '';
    const fileType = attachment.fileType.toLowerCase();

    // Images
    if (fileType.startsWith('image/')) return '🖼️';

    // Videos
    if (fileType.startsWith('video/')) return '🎬';

    // Audio
    if (fileType.startsWith('audio/')) return '🎵';

    // Documents
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📑';
      case 'zip':
      case 'rar':
      case '7z':
        return '🗄️';
      case 'txt':
        return '📋';
      default:
        return '📎';
    }
  }

  ngOnDestroy(): void {
    // Clean up any playing audio
    if (this.currentlyPlayingAudio) {
      this.currentlyPlayingAudio.element.pause();
    }
    this.subscriptions.unsubscribe();
  }

getSafeFileUrl(fileUrl: string): string {
  if (!fileUrl) return '';

  // If already a full URL (http://...), return as-is
  if (fileUrl.startsWith('http')) {
    return fileUrl;
  }

  // If it starts with /api/files/, remove the duplicate prefix
  if (fileUrl.startsWith('/api/files/')) {
    fileUrl = fileUrl.replace('/api/files/', '');
  }

  // Return clean URL: http://localhost:8080/api/files/{filename}
  return `${environment.apiUrl}/files/${fileUrl}`;
}
}
