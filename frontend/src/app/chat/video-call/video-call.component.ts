import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-video-call',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.scss']
})
export class VideoCallComponent {
  @Output() endCall = new EventEmitter<void>();
  isMuted = false;
  isVideoOff = false;
  isFullscreen = false;

  toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  toggleVideo(): void {
    this.isVideoOff = !this.isVideoOff;
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
  }

  hangUp(): void {
    this.endCall.emit();
  }
}