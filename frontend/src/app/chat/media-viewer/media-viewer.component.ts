import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SafeUrl, DomSanitizer } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-media-viewer',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './media-viewer.component.html',
  styleUrl: './media-viewer.component.scss'
})
export class MediaViewerComponent {
  safeUrl: SafeUrl;
  downloadUrl: string;

  constructor(
    public dialogRef: MatDialogRef<MediaViewerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      fileUrl: string;
      fileName: string;
      fileType: string;
    },
    private sanitizer: DomSanitizer
  ) {
    // Create safe URL for display
    this.safeUrl = this.sanitizer.bypassSecurityTrustUrl(this.getFullFileUrl(data.fileUrl));
    // Create download URL
    this.downloadUrl = this.getFullFileUrl(data.fileUrl);
  }

  private getFullFileUrl(fileUrl: string): string {
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    
    if (fileUrl.startsWith('/api/files/')) {
      return `${environment.baseUrl}${fileUrl}`;
    }
    
    return `${environment.apiUrl}/files/${fileUrl}`;
  }

  close(): void {
    this.dialogRef.close();
  }

  download(): void {
    const link = document.createElement('a');
    link.href = this.downloadUrl;
    link.download = this.data.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
