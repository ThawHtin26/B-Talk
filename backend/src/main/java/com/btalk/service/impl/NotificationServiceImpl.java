package com.btalk.service.impl;

import com.btalk.dto.NotificationDto;

import com.btalk.dto.NotificationRequest;
import com.btalk.entity.Notification;
import com.btalk.entity.User;
import com.btalk.constants.NotificationType;
import com.btalk.repository.NotificationRepository;
import com.btalk.repository.UserRepository;
import com.btalk.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final Executor notificationTaskExecutor;

    @Override
    public NotificationDto createNotification(NotificationRequest request) {
        try {
            User recipient = userRepository.findById(request.getRecipientId())
                    .orElseThrow(() -> new RuntimeException("Recipient not found"));
            
            User sender = null;
            if (request.getSenderId() != null) {
                sender = userRepository.findById(request.getSenderId())
                        .orElse(null);
            }

            Notification notification = Notification.builder()
                    .recipient(recipient)
                    .sender(sender)
                    .title(request.getTitle())
                    .message(request.getMessage())
                    .type(request.getType())
                    .data(request.getData())
                    .isRead(false)
                    .isDeleted(false)
                    .createdAt(LocalDateTime.now())
                    .build();

            Notification savedNotification = notificationRepository.save(notification);
            
            // Send real-time notification
            sendRealTimeNotification(request.getRecipientId(), convertToDto(savedNotification));
            
            return convertToDto(savedNotification);
        } catch (Exception e) {
            log.error("Error creating notification: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create notification", e);
        }
    }

    @Override
    @Async("notificationTaskExecutor")
    public void createNotificationAsync(NotificationRequest request) {
        try {
            createNotification(request);
        } catch (Exception e) {
            log.error("Error creating async notification: {}", e.getMessage(), e);
        }
    }

    @Override
    public Page<NotificationDto> getUserNotifications(String userId, Pageable pageable) {
        Page<Notification> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable);
        return notifications.map(this::convertToDto);
    }

    @Override
    public List<NotificationDto> getUnreadNotifications(String userId) {
        List<Notification> notifications = notificationRepository.findUnreadByRecipientId(userId);
        return notifications.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public Long getUnreadCount(String userId) {
        return notificationRepository.countUnreadByRecipientId(userId);
    }

    @Override
    @Transactional
    public void markAsRead(String notificationId) {
        notificationRepository.markAsRead(notificationId, LocalDateTime.now());
    }

    @Override
    @Transactional
    public void markAllAsRead(String userId) {
        notificationRepository.markAllAsRead(userId, LocalDateTime.now());
    }

    @Override
    @Transactional
    public void deleteNotification(String notificationId) {
        notificationRepository.deleteById(notificationId);
    }

    @Override
    @Transactional
    public void deleteAllNotifications(String userId) {
        notificationRepository.deleteAllByRecipientId(userId);
    }

    @Override
    public void sendRealTimeNotification(String recipientId, NotificationDto notification) {
        try {
            log.info("Sending real-time notification to user {}: {}", recipientId, notification.getTitle());
            String destination = "/user/" + recipientId + "/queue/notifications";
            messagingTemplate.convertAndSend(destination, notification);
            log.info("Successfully sent notification to user {}", recipientId);
            
            // Send updated unread count
            sendUnreadCountUpdate(recipientId);
        } catch (Exception e) {
            log.error("Error sending real-time notification to user {}: {}", recipientId, e.getMessage());
        }
    }

    private void sendUnreadCountUpdate(String recipientId) {
        try {
            Long unreadCount = getUnreadCount(recipientId);
            String destination = "/user/" + recipientId + "/queue/unread-count";
            messagingTemplate.convertAndSend(destination, unreadCount);
            log.info("Successfully sent unread count update to user {}: {}", recipientId, unreadCount);
        } catch (Exception e) {
            log.error("Error sending unread count update to user {}: {}", recipientId, e.getMessage());
        }
    }

    @Override
    public void sendNotificationToUser(String recipientId, String title, String message, NotificationType type, String data) {
        NotificationRequest request = NotificationRequest.builder()
                .recipientId(recipientId)
                .title(title)
                .message(message)
                .type(type)
                .data(data)
                .build();
        
        createNotification(request);
    }

    @Override
    @Async("notificationTaskExecutor")
    public void sendNotificationToUserAsync(String recipientId, String title, String message, NotificationType type, String senderId, String data) {
        try {
            NotificationRequest request = NotificationRequest.builder()
                    .recipientId(recipientId)
                    .senderId(senderId)
                    .title(title)
                    .message(message)
                    .type(type)
                    .data(data)
                    .build();
            
            createNotification(request);
        } catch (Exception e) {
            log.error("Error sending async notification to user {}: {}", recipientId, e.getMessage(), e);
        }
    }

    private NotificationDto convertToDto(Notification notification) {
        return NotificationDto.builder()
                .notificationId(notification.getNotificationId())
                .recipientId(notification.getRecipient().getUserId())
                .senderId(notification.getSender() != null ? notification.getSender().getUserId() : null)
                .senderName(notification.getSender() != null ? notification.getSender().getUsername() : null)
                .senderAvatar(notification.getSender() != null ? notification.getSender().getProfilePhotoUrl() : null)
                .title(notification.getTitle())
                .message(notification.getMessage())
                .type(notification.getType())
                .data(notification.getData())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .build();
    }

    // Additional async methods for better performance
    @Async("notificationTaskExecutor")
    public CompletableFuture<NotificationDto> createNotificationWithCompletableFuture(NotificationRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            return createNotification(request);
        }, notificationTaskExecutor);
    }

    @Async("notificationTaskExecutor")
    public CompletableFuture<Void> sendNotificationToUserWithCompletableFuture(String recipientId, String title, String message, 
                                                              NotificationType type, String senderId, String data) {
        return CompletableFuture.runAsync(() -> {
            sendNotificationToUserAsync(recipientId, title, message, type, senderId, data);
        }, notificationTaskExecutor);
    }

    @Async("notificationTaskExecutor")
    public CompletableFuture<Void> sendRealTimeNotificationAsync(String recipientId, NotificationDto notification) {
        return CompletableFuture.runAsync(() -> {
            sendRealTimeNotification(recipientId, notification);
        }, notificationTaskExecutor);
    }

    @Async("notificationTaskExecutor")
    public CompletableFuture<List<NotificationDto>> getUserNotificationsAsync(String userId, Pageable pageable) {
        return CompletableFuture.supplyAsync(() -> {
            return getUserNotifications(userId, pageable).getContent();
        }, notificationTaskExecutor);
    }
} 