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
  private audioElements: { [key: number]: HTMLAudioElement } = {};
  private currentlyPlayingAudio: number | null = null;

  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  messages: Message[] = [];
  activeConversation: Conversation | null = null;
  isLoading = false;
  error: string | null = null;
  currentUserId: number | null = null;
  private shouldScrollToBottom = true;
  private pageSize = 20;
  private currentPage = 0;
  private isLoadingMore = false;
  private hasMoreMessages = true;
  private lastScrollPosition = 0;

  private filenameFromUrlPipe = new FilenameFromUrlPipe();

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?.userId ?? null;
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

  const oldestMessage = this.messages[0];
  const beforeDate = new Date(oldestMessage.sentAt);

  // Save the current scroll height and first message element
  const scrollHeightBefore = element.scrollHeight;
  const firstMessageElement = element.querySelector('.flex.flex-col');

  this.chatService.getMessagesBefore(
    this.activeConversation.conversationId,
    beforeDate,
    this.currentPage + 1,
    this.pageSize
  ).subscribe({
    next: (response) => {
      if (response.success && response.data) {
        // Store the new messages
        const newMessages = response.data.content.reverse();
        console.log("NEw MEssage",newMessages)
        // Prepend new messages
        this.messages = [...newMessages, ...this.messages];
        this.currentPage++;
        this.hasMoreMessages = !response.data.last;

        // Wait for Angular to update the DOM
        setTimeout(() => {
          if (firstMessageElement && newMessages.length > 0) {
            // Calculate the height of the new content
            const newFirstMessageElement = element.querySelector('.flex.flex-col');
            const newContentHeight = scrollHeightBefore - element.scrollHeight;

            // Adjust the scroll position to maintain the view
            element.scrollTop = newFirstMessageElement.clientHeight * newMessages.length;
          }
        }, 0);
      }
      this.isLoadingMore = false;
      this.cd.markForCheck();
    },
    error: (err) => {
      console.error('Error loading more messages:', err);
      this.isLoadingMore = false;
      this.cd.markForCheck();
    }
  });
}
  getFileIcon(attachment: Attachment): string {
    const extension = attachment.fileUrl.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'picture_as_pdf';
      case 'doc':
      case 'docx': return 'description';
      case 'xls':
      case 'xlsx': return 'grid_on';
      case 'ppt':
      case 'pptx': return 'slideshow';
      case 'zip':
      case 'rar':
      case '7z': return 'folder_zip';
      case 'txt': return 'notes';
      case 'mp3':
      case 'wav':
      case 'ogg': return 'audiotrack';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'image';
      case 'mp4':
      case 'mov':
      case 'avi': return 'videocam';
      default: return 'insert_drive_file';
    }
  }

  isMyMessage(senderId: number): boolean {
    return senderId === this.currentUserId;
  }

  trackByMessageId(index: number, message: Message): number {
    return message?.messageId ?? index;
  }

  openMediaViewer(attachment: Attachment): void {
    if (attachment.fileType.startsWith('image/') || attachment.fileType.startsWith('video/')) {
      this.dialog.open(MediaViewerComponent, {
        width: '90vw',
        maxWidth: '1200px',
        height: '90vh',
        panelClass: 'media-viewer-dialog',
        data: {
          mediaUrl: this.getSafeFileUrl(attachment.fileUrl),
          mediaType: attachment.fileType,
          fileName: this.filenameFromUrlPipe.transform(attachment.fileUrl),
        },
      });
    }
  }

  getSafeFileUrl(fileUrl: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(`${environment.baseUrl}${fileUrl}`);
  }

  toggleAudioPlayback(attachment: Attachment): void {
  if (!this.audioElements[attachment.attachmentId]) {
    this.audioElements[attachment.attachmentId] = new Audio(`${environment.wsUrl}${attachment.fileUrl}`);
    this.audioElements[attachment.attachmentId].addEventListener('ended', () => this.onAudioEnded(attachment));
  }

  const audio = this.audioElements[attachment.attachmentId];

  if (this.currentlyPlayingAudio === attachment.attachmentId) {
    audio.pause();
    this.currentlyPlayingAudio = null;
  } else {
    if (this.currentlyPlayingAudio !== null) {
      this.audioElements[this.currentlyPlayingAudio].pause();
    }

    audio.currentTime = 0;
    audio.play()
      .then(() => {
        this.currentlyPlayingAudio = attachment.attachmentId;
        this.cd.markForCheck();
      })
      .catch(err => {
        console.error('Error playing audio:', err);
        this.currentlyPlayingAudio = null;
      });
  }
}


  isAudioPlaying(attachment: Attachment): boolean {
    return this.currentlyPlayingAudio === attachment.attachmentId;
  }

  onAudioEnded(attachment: Attachment): void {
    this.currentlyPlayingAudio = null;
    this.cd.markForCheck();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  showDateSeparator(currentMessage: Message, allMessages: Message[], index?: number): boolean {
  // For the first message, always show the date separator
  if (index === 0) return true;

  // If index is not provided, find it (less efficient but works for *ngFor without index)
  const currentIndex = index !== undefined ? index : allMessages.findIndex(m => m.messageId === currentMessage.messageId);

  // If this is the first message or we couldn't find the index, show the separator
  if (currentIndex <= 0) return true;

  const currentDate = new Date(currentMessage.sentAt);
  const previousDate = new Date(allMessages[currentIndex - 1].sentAt);

  // Show separator if the dates are different
  return (
    currentDate.getDate() !== previousDate.getDate() ||
    currentDate.getMonth() !== previousDate.getMonth() ||
    currentDate.getFullYear() !== previousDate.getFullYear()
  );
}

getFullFileUrl(fileUrl: string): string {
  if (!fileUrl.startsWith('http')) {
    return `${environment.baseUrl}${fileUrl}`;
  }
  return fileUrl;
}


  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    // Clean up audio elements
    Object.values(this.audioElements).forEach(audio => {
      audio.pause();
      audio.removeEventListener('ended', () => {});
    });
  }
}
