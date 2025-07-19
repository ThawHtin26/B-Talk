export interface Attachment {
  attachmentId: string; // UUID as string
  messageId: string; // UUID as string
  fileUrl: string;
  fileType: string;
  fileSizeBytes?: number;
}
