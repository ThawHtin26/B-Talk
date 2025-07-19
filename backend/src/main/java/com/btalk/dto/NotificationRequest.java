package com.btalk.dto;

import com.btalk.entity.Notification.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {
    private UUID recipientId;
    private UUID senderId;
    private String title;
    private String message;
    private NotificationType type;
    private String data;
} 