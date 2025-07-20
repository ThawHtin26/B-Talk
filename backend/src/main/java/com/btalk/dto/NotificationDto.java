package com.btalk.dto;

import com.btalk.constants.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDto {
    private String notificationId;
    private String recipientId;
    private String senderId;
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