package com.btalk.service;

import com.btalk.dto.NotificationDto;

import com.btalk.dto.NotificationRequest;
import com.btalk.constants.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NotificationService {
    
    NotificationDto createNotification(NotificationRequest request);
    
    void createNotificationAsync(NotificationRequest request);
    
    Page<NotificationDto> getUserNotifications(String userId, Pageable pageable);
    
    List<NotificationDto> getUnreadNotifications(String userId);
    
    Long getUnreadCount(String userId);
    
    void markAsRead(String notificationId);
    
    void markAllAsRead(String userId);
    
    void deleteNotification(String notificationId);
    
    void deleteAllNotifications(String userId);
    
    void sendRealTimeNotification(String recipientId, NotificationDto notification);
    
    void sendNotificationToUser(String recipientId, String title, String message, NotificationType type, String data);
    
    void sendNotificationToUserAsync(String recipientId, String title, String message, NotificationType type, String senderId, String data);
} 