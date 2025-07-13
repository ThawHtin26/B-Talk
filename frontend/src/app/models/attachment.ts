export interface Attachment {
  attachmentId?: number;
  messageId?: number;
  fileUrl: string;
  fileType: string;
  fileSizeBytes?: number;
}
