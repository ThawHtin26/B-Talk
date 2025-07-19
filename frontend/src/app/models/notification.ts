export interface Notification {
  notificationId: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export enum NotificationType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  NEW_CONVERSATION = 'NEW_CONVERSATION',
  MESSAGE_REACTION = 'MESSAGE_REACTION',
  USER_ONLINE = 'USER_ONLINE',
  USER_OFFLINE = 'USER_OFFLINE',
  CALL_INCOMING = 'CALL_INCOMING',
  CALL_MISSED = 'CALL_MISSED',
  CALL_ENDED = 'CALL_ENDED',
  FILE_SHARED = 'FILE_SHARED',
  MENTION = 'MENTION',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT'
}

export interface NotificationRequest {
  recipientId: string;
  senderId?: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: string;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  data?: Notification;
}

export interface NotificationListResponse {
  success: boolean;
  message: string;
  data?: {
    content: Notification[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  };
} 