package com.btalk.dto;

import com.btalk.entity.Notification.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDto {
    private UUID notificationId;
    private UUID recipientId;
    private UUID senderId;
    private String senderName;
    private String senderAvatar;
    private String title;
    private String message;
    private NotificationType type;
    private String data;
    private Boolean isRead;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}