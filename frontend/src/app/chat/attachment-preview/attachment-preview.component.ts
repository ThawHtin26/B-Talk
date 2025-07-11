import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Attachment } from '../../models/attachment';
import { FileSizePipe } from '../../pipes/file-size.pipe';


@Component({
  selector: 'app-attachment-preview',
  standalone: true,
  imports: [CommonModule,FileSizePipe],
  templateUrl: './attachment-preview.component.html',
  styleUrls: ['./attachment-preview.component.scss']
})
export class AttachmentPreviewComponent {
  @Input() attachment!: Attachment;

  getIcon(): string {
    if (this.attachment.fileType.startsWith('image/')) {
      return 'image';
    } else if (this.attachment.fileType.startsWith('video/')) {
      return 'video';
    } else if (this.attachment.fileType.startsWith('audio/')) {
      return 'audio';
    } else {
      return 'document';
    }
  }

   openFullscreen(){

  }
}