import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { WebSocketService } from '../../services/web-socket.service';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.scss']
})
export class MessageInputComponent {
  @Output() videoCall = new EventEmitter<void>();
  message = '';
  attachments: File[] = [];
  isRecording = false;

  constructor(
    private chatService: ChatService,
    private wsService: WebSocketService
  ) {}

  sendMessage(): void {
    if (this.message.trim() || this.attachments.length) {
      this.chatService.activeConversation$.subscribe(conv => {
        if (conv) {
          this.chatService.sendMessage(conv.conversationId, this.message, this.attachments).subscribe({
            next: (msg) => {
              this.wsService.sendMessage(msg);
              this.message = '';
              this.attachments = [];
            },
            error: err => console.error('Failed to send message', err)
          });
        }
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.attachments = Array.from(input.files);
    }
  }

  startVideoCall(): void {
    this.videoCall.emit();
  }

  startRecording(): void {
    this.isRecording = true;
    // Implement recording logic
  }

  stopRecording(): void {
    this.isRecording = false;
    // Implement recording stop and send logic
  }

  removeAttachment(file:File){

  }

  createObjectURL(file:File){
    
  }

}