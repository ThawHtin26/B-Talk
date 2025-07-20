import { environment } from './../../../environments/environment';
import { Component, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';
import { FileUploadService} from '../../services/file-upload.service'; // New service for file uploads
import { finalize } from 'rxjs/operators';
import { Attachment } from '../../models/attachment';
import { from, throwError } from 'rxjs';
import { HttpEvent, HttpEventType, HttpClient } from '@angular/common/http';
import { Message } from '../../models/message';
import { ApiResponse } from '../../models/api-response';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.scss']
})
export class MessageInputComponent {
  @Output() videoCall = new EventEmitter<void>();
  private chatService = inject(ChatService);
  private cdRef = inject(ChangeDetectorRef);
  private mediaRecorder: MediaRecorder | null = null;
  private authService = inject(AuthService);
  private audioChunks: Blob[] = [];
  private http = inject(HttpClient);

  messageContent = '';
  attachments: File[] = [];
  attachmentPreviews: {file: File, url: string, uploadProgress?: number, error?: string}[] = [];
  isRecording = false;
  isUploading = false;
  maxFileSizeMB = 10;
  acceptedFileTypes = 'image/*, video/*, .pdf, .doc, .docx, .xls, .xlsx';


private uploadAttachments(): Promise<Message> {
  this.isUploading = true;
  this.cdRef.detectChanges();

  return this.chatService.activeConversation$.pipe(
    take(1),
    switchMap(activeConversation => {
      if (!activeConversation) {
        return throwError(() => new Error('No active conversation'));
      }

      const formData = new FormData();

      const messageData = {
        conversationId: activeConversation.conversationId,
        content: this.messageContent,
        senderId: this.authService.getCurrentUser()?.userId,
        messageType: this.attachments.length > 0 ? 'MEDIA' : 'TEXT',
        status: 'SENT'
      };

      const messageJson = JSON.stringify(messageData);
      formData.append('message', messageJson);

      this.attachments.forEach(file => {
        formData.append('attachments', file, file.name);
      });

      return this.http.post<ApiResponse<Message>>(
        `${environment.apiUrl}/messages`,
        formData,
        {
          reportProgress: true,
          observe: 'events'
        }
      ).pipe(
        map((event: HttpEvent<ApiResponse<Message>>) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const progress = Math.round(100 * event.loaded / event.total);
            this.attachmentPreviews = this.attachmentPreviews.map(preview => ({
              ...preview,
              uploadProgress: progress
            }));
            this.cdRef.detectChanges();
          } else if (event.type === HttpEventType.Response) {
            if (event.body?.success && event.body.data) {
              console.log('Message sent successfully:', event.body.data);
              console.log('Message attachments:', event.body.data.attachments);
              // Clean up local object URLs after successful upload
              this.cleanupLocalFileUrls();
              return event.body.data;
            }
            throw new Error('Failed to upload message');
          }
          return null;
        }),
        filter(message => message !== null),
        take(1),
        catchError(error => {
          this.attachmentPreviews = this.attachmentPreviews.map(preview => ({
            ...preview,
            error: error.message || 'Upload failed',
            uploadProgress: undefined
          }));
          this.cdRef.detectChanges();
          return throwError(() => error);
        })
      );
    }),
    finalize(() => {
      this.isUploading = false;
      this.cdRef.detectChanges();
    })
  ).toPromise() as Promise<Message>;
}

private cleanupLocalFileUrls(): void {
  this.attachmentPreviews.forEach(preview => {
    URL.revokeObjectURL(preview.url);
  });
}

private resetForm(): void {
  this.cleanupLocalFileUrls();
  this.messageContent = '';
  this.attachments = [];
  this.attachmentPreviews = [];
  this.isUploading = false;
  this.cdRef.detectChanges();
}
  sendMessage(): void {
    if (this.isUploading) return;

    this.chatService.activeConversation$
      .pipe(take(1))
      .subscribe(activeConversation => {
        if (!activeConversation || (!this.messageContent.trim() && this.attachments.length === 0)) {
          return;
        }

        if (this.attachments.length > 0) {
          this.uploadAttachments().then((message) => {
            this.resetForm();
          }).catch(error => {
            console.error('Upload failed', error);
          });
        } else {
          this.chatService.sendMessage(
            activeConversation.conversationId,
            this.messageContent,
            []
          ).subscribe({
            next: () => this.resetForm(),
            error: (err) => console.error('Failed to send message', err)
          });
        }
      });
  }


// sendMessage(): void {
//   if (this.isUploading) return;

//   this.chatService.activeConversation$
//     .pipe(take(1))
//     .subscribe(activeConversation => {
//       if (!activeConversation || (!this.messageContent.trim() && this.attachments.length === 0)) return;

//       if (this.attachments.length > 0) {
//         this.uploadAttachments().then(() => {
//           this.resetForm();
//         }).catch(error => {
//           console.error('Message sending failed', error);
//         });
//       } else {
//         this.sendTextMessage(activeConversation.conversationId);
//       }
//     });
// }


  private sendTextMessage(conversationId: string): void {
    this.chatService.sendMessage(
      conversationId,
      this.messageContent,
      [] // No attachments
    ).subscribe({
      next: () => this.resetForm(),
      error: (err) => console.error('Failed to send message', err)
    });
  }
onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const newFiles = Array.from(input.files);

    for (const file of newFiles) {
      if (file.size > this.maxFileSizeMB * 1024 * 1024) {
        alert(`File ${file.name} exceeds maximum size of ${this.maxFileSizeMB}MB`);
        continue;
      }

      if (!this.isFileTypeAllowed(file)) {
        alert(`File type ${file.type || file.name.split('.').pop()} is not allowed`);
        continue;
      }

      this.attachments.push(file);

      // Only create preview for images and videos
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        this.attachmentPreviews.push({
          file,
          url: this.createObjectURL(file),
          uploadProgress: 0
        });
      } else {
        this.attachmentPreviews.push({
          file,
          url: '', // No preview for non-media files
          uploadProgress: 0
        });
      }
    }

    input.value = '';
    this.cdRef.detectChanges();
  }
}
  private isFileTypeAllowed(file: File): boolean {
    const allowedTypes = this.acceptedFileTypes.split(',')
      .map(type => type.trim().toLowerCase());

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const fileType = file.type.toLowerCase();

    return allowedTypes.some(allowedType => {
      if (allowedType.startsWith('.')) {
        return '.' + fileExtension === allowedType;
      }
      return fileType.startsWith(allowedType.replace('/*', ''));
    });
  }

  createObjectURL(file: File): string {
    return URL.createObjectURL(file);
  }

  removeAttachment(index: number): void {
    URL.revokeObjectURL(this.attachmentPreviews[index].url);
    this.attachments.splice(index, 1);
    this.attachmentPreviews.splice(index, 1);
    this.cdRef.detectChanges();
  }

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.handleRecordedAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not start audio recording. Please check microphone permissions.');
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

    startVideoCall(): void {
    if (this.isUploading) return;
    this.videoCall.emit();
  }

  private handleRecordedAudio(audioBlob: Blob): void {
    // Convert the audio blob to a file
    const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });

    // Add to attachments
    this.attachments.push(audioFile);
    this.attachmentPreviews.push({
      file: audioFile,
      url: this.createObjectURL(audioFile),
      uploadProgress: 0
    });

    this.cdRef.detectChanges();
  }

  // File utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const fileType = file.type.toLowerCase();

    // Images
    if (fileType.startsWith('image/')) return 'image';

    // Videos
    if (fileType.startsWith('video/')) return 'videocam';

    // Audio
    if (fileType.startsWith('audio/')) return 'audiotrack';

    // Documents
    switch (extension) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
      case 'docx':
        return 'description';
      case 'xls':
      case 'xlsx':
        return 'grid_on';
      case 'ppt':
      case 'pptx':
        return 'slideshow';
      case 'zip':
      case 'rar':
      case '7z':
        return 'folder_zip';
      case 'txt':
        return 'subject';
      default:
        return 'insert_drive_file';
    }
  }
}
