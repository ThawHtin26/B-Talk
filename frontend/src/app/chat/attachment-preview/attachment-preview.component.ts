import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Attachment } from '../../models/attachment';
import { FileSizePipe } from '../../pipes/file-size.pipe';
import { environment } from '../../../environments/environment';

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

   openFullscreen(){

  }
}