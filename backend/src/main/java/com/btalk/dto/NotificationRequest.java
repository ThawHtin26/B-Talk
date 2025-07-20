package com.btalk.dto;


import com.btalk.constants.NotificationType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {
    private String recipientId;
    private String senderId;
    private String title;
    private String message;
    private NotificationType type;
    private String data;
} 