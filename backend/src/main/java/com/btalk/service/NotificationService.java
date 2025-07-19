package com.btalk.service;

import com.btalk.dto.NotificationDto;
import com.btalk.dto.NotificationRequest;
import com.btalk.entity.Notification.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface NotificationService {
    
    NotificationDto createNotification(NotificationRequest request);
    
    void createNotificationAsync(NotificationRequest request);
    
    Page<NotificationDto> getUserNotifications(UUID userId, Pageable pageable);
    
    List<NotificationDto> getUnreadNotifications(UUID userId);
    
    Long getUnreadCount(UUID userId);
    
    void markAsRead(UUID notificationId);
    
    void markAllAsRead(UUID userId);
    
    void deleteNotification(UUID notificationId);
    
    void deleteAllNotifications(UUID userId);
    
    void sendRealTimeNotification(UUID recipientId, NotificationDto notification);
    
    void sendNotificationToUser(UUID recipientId, String title, String message, NotificationType type, String data);
    
    void sendNotificationToUserAsync(UUID recipientId, String title, String message, NotificationType type, UUID senderId, String data);
} 