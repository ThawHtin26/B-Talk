import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-media-viewer',
  imports: [CommonModule,MatIconModule],
  templateUrl: './media-viewer.component.html',
  styleUrl: './media-viewer.component.scss'
})
export class MediaViewerComponent {
   constructor(
    public dialogRef: MatDialogRef<MediaViewerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      mediaUrl: SafeUrl;
      mediaType: string;
      fileName: string;
    }
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
