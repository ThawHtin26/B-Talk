import { FilenameFromUrlPipe } from './../../pipes/filenameformurl.pipe';
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, catchError, filter, of, switchMap, tap } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Message } from '../../models/message';
import { Conversation } from '../../models/conversation';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { MediaViewerComponent } from '../media-viewer/media-viewer.component';
import { Attachment } from '../../models/attachment';
import { LineBreakPipe } from '../../pipes/line-break.pipe';
import { DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [
    CommonModule,
    FilenameFromUrlPipe,
    MatIconModule,
    LineBreakPipe,
    DatePipe,
    MatProgressSpinnerModule,
    MatButtonModule
  ],
  templateUrl: './message-list.component.html',
  styleUrls: ['./message-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageListComponent implements OnInit, OnDestroy, AfterViewChecked {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private cd = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);
  private dialog = inject(MatDialog);
  private subscriptions = new Subscription();
  private audioElements: { [key: string]: HTMLAudioElement } = {};
  private currentlyPlayingAudio: string | null = null;

  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  messages: Message[] = [];
  activeConversation: Conversation | null = null;
  isLoading = false;
  error: string | null = null;
  currentUserId: string | null = null;
  private shouldScrollToBottom = true;
  private pageSize = 20;
  private currentPage = 0;
  private isLoadingMore = false;
  private hasMoreMessages = true;
  private lastScrollPosition = 0;

  private filenameFromUrlPipe = new FilenameFromUrlPipe();

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?.userId || null;
    this.setupConversationListener();
    this.setupMessageUpdatesListener();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop =
        this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  getIsLoadingMore(): boolean {
    return this.isLoadingMore;
  }

  retryLoadMessages(): void {
    if (this.activeConversation) {
      this.error = null;
      this.isLoading = true;
      this.cd.markForCheck();

      this.chatService
        .getMessages(this.activeConversation.conversationId)
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              this.messages = response.data.content.reverse();
              this.hasMoreMessages = !response.data.last;
              this.shouldScrollToBottom = true;
            }
            this.isLoading = false;
            this.cd.markForCheck();
          },
          error: (err) => {
            console.error('Message load error:', err);
            this.isLoading = false;
            this.error = 'Failed to load messages. Please try again.';
            this.cd.markForCheck();
          },
        });
    }
  }

  private setupConversationListener(): void {
    this.subscriptions.add(
      this.chatService.activeConversation$
        .pipe(
          tap((conv) => {
            this.activeConversation = conv;
            this.messages = [];
            this.currentPage = 0;
            this.hasMoreMessages = true;
            this.shouldScrollToBottom = true;
            this.cd.markForCheck();
          }),
          filter((conv): conv is Conversation => !!conv),
          tap(() => {
            this.isLoading = true;
            this.error = null;
            this.cd.markForCheck();
          }),
          switchMap((conv) =>
            this.chatService.getMessages(conv.conversationId).pipe(
              tap((response) => {
                if (response.success && response.data) {
                  this.messages = response.data.content.reverse();
                  this.hasMoreMessages = !response.data.last;
                  this.shouldScrollToBottom = true;
                }
                this.isLoading = false;
                this.cd.markForCheck();
              }),
              catchError((err) => {
                console.error('Message load error:', err);
                this.isLoading = false;
                this.error = 'Failed to load messages. Please try again.';
                this.cd.markForCheck();
                return of(null);
              })
            )
          )
        )
        .subscribe()
    );
  }

  private setupMessageUpdatesListener(): void {
    this.subscriptions.add(
      this.chatService.messageUpdates$
        .pipe(
          filter((message): message is Message => !!message),
          tap((message) => {
            if (
              this.activeConversation &&
              message.conversationId === this.activeConversation.conversationId
            ) {
              if (!this.messages.some((m) => m.messageId === message.messageId)) {
                this.messages = [...this.messages, message];
                this.shouldScrollToBottom = true;
                this.cd.markForCheck();
              }
            }
          })
        )
        .subscribe()
    );
  }

  onScroll(): void {
    if (this.isLoadingMore || !this.hasMoreMessages || !this.activeConversation || this.messages.length === 0) {
      return;
    }

    const element = this.messageContainer.nativeElement;
    const atTop = element.scrollTop === 0;

    if (!atTop) {
      return;
    }

    this.isLoadingMore = true;
    this.cd.markForCheck();

    const firstMessage = this.messages[0];
    if (!firstMessage) {
      this.isLoadingMore = false;
      this.cd.markForCheck();
      return;
    }

    // Ensure sentAt is a proper Date object
    const beforeDate = new Date(firstMessage.sentAt);
    
    this.chatService
      .getMessagesBefore(
        this.activeConversation.conversationId,
        beforeDate,
        this.currentPage,
        this.pageSize
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const newMessages = response.data.content.reverse();
            this.messages = [...newMessages, ...this.messages];
            this.hasMoreMessages = !response.data.last;
            this.currentPage++;
          }
          this.isLoadingMore = false;
          this.cd.markForCheck();
        },
        error: (err) => {
          console.error('Failed to load more messages:', err);
          this.isLoadingMore = false;
          this.cd.markForCheck();
        },
      });
  }

  getFileIcon(attachment: Attachment): string {
    const fileType = attachment.fileType.toLowerCase();
    if (fileType.startsWith('image/')) {
      return 'image';
    } else if (fileType.startsWith('video/')) {
      return 'videocam';
    } else if (fileType.startsWith('audio/')) {
      return 'audiotrack';
    } else if (fileType.includes('pdf')) {
      return 'picture_as_pdf';
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return 'description';
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return 'table_chart';
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      return 'slideshow';
    } else {
      return 'insert_drive_file';
    }
  }

  isMyMessage(senderId: string): boolean {
    return this.currentUserId !== null && senderId === this.currentUserId;
  }

  trackByMessageId(index: number, message: Message): string {
    return message.messageId || index.toString();
  }

  openMediaViewer(attachment: Attachment): void {
    const dialogRef = this.dialog.open(MediaViewerComponent, {
      width: '90vw',
      height: '90vh',
      data: {
        fileUrl: attachment.fileUrl,
        fileName: this.filenameFromUrlPipe.transform(attachment.fileUrl),
        fileType: attachment.fileType
      }
    });
  }

  getSafeFileUrl(fileUrl: string): SafeUrl {
    const fullUrl = this.getFullFileUrl(fileUrl);
    return this.sanitizer.bypassSecurityTrustUrl(fullUrl);
  }

  toggleAudioPlayback(attachment: Attachment): void {
    const audioId = attachment.attachmentId;
    
    if (this.currentlyPlayingAudio === audioId) {
      // Stop current audio
      const audio = this.audioElements[audioId];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      this.currentlyPlayingAudio = null;
    } else {
      // Stop any currently playing audio
      if (this.currentlyPlayingAudio) {
        const currentAudio = this.audioElements[this.currentlyPlayingAudio];
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }

      // Start new audio
      const audio = new Audio(this.getFullFileUrl(attachment.fileUrl));
      audio.addEventListener('ended', () => this.onAudioEnded(attachment));
      
      this.audioElements[audioId] = audio;
      this.currentlyPlayingAudio = audioId;
      audio.play();
    }
  }

  isAudioPlaying(attachment: Attachment): boolean {
    return this.currentlyPlayingAudio === attachment.attachmentId;
  }

  onAudioEnded(attachment: Attachment): void {
    this.currentlyPlayingAudio = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatCallDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  showDateSeparator(currentMessage: Message, allMessages: Message[], index?: number): boolean {
    if (index === 0) return true;
    
    const previousMessage = allMessages[index! - 1];
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.sentAt).toDateString();
    const previousDate = new Date(previousMessage.sentAt).toDateString();
    
    return currentDate !== previousDate;
  }

  getFullFileUrl(fileUrl: string): string {
    // If it's already a full URL, return as is
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    
    // If the URL starts with /api/files/, just add the base URL
    if (fileUrl.startsWith('/api/files/')) {
      return `${environment.baseUrl}${fileUrl}`;
    }
    
    // For filenames only (without path), add the full path
    if (!fileUrl.includes('/')) {
      return `${environment.apiUrl}/files/${fileUrl}`;
    }
    
    // Default fallback - assume it's a filename and add the path
    return `${environment.apiUrl}/files/${fileUrl}`;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    // Stop all audio playback
    Object.values(this.audioElements).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
}
