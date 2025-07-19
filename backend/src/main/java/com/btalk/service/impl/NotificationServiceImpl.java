package com.btalk.service.impl;

import com.btalk.dto.NotificationDto;
import com.btalk.dto.NotificationRequest;
import com.btalk.entity.Notification;
import com.btalk.entity.User;
import com.btalk.entity.Notification.NotificationType;
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
import java.util.UUID;
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
    public Page<NotificationDto> getUserNotifications(UUID userId, Pageable pageable) {
        Page<Notification> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable);
        return notifications.map(this::convertToDto);
    }

    @Override
    public List<NotificationDto> getUnreadNotifications(UUID userId) {
        List<Notification> notifications = notificationRepository.findUnreadByRecipientId(userId);
        return notifications.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public Long getUnreadCount(UUID userId) {
        return notificationRepository.countUnreadByRecipientId(userId);
    }

    @Override
    @Transactional
    public void markAsRead(UUID notificationId) {
        notificationRepository.markAsRead(notificationId, LocalDateTime.now());
    }

    @Override
    @Transactional
    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsRead(userId, LocalDateTime.now());
    }

    @Override
    @Transactional
    public void deleteNotification(UUID notificationId) {
        notificationRepository.deleteById(notificationId);
    }

    @Override
    @Transactional
    public void deleteAllNotifications(UUID userId) {
        notificationRepository.deleteAllByRecipientId(userId);
    }

    @Override
    public void sendRealTimeNotification(UUID recipientId, NotificationDto notification) {
        try {
            log.info("Sending real-time notification to user {}: {}", recipientId, notification.getTitle());
            String destination = "/user/" + recipientId.toString() + "/queue/notifications";
            messagingTemplate.convertAndSend(destination, notification);
            log.info("Successfully sent notification to user {}", recipientId);
            
            // Send updated unread count
            sendUnreadCountUpdate(recipientId);
        } catch (Exception e) {
            log.error("Error sending real-time notification to user {}: {}", recipientId, e.getMessage());
        }
    }

    private void sendUnreadCountUpdate(UUID recipientId) {
        try {
            Long unreadCount = getUnreadCount(recipientId);
            String destination = "/user/" + recipientId.toString() + "/queue/unread-count";
            messagingTemplate.convertAndSend(destination, unreadCount);
            log.info("Successfully sent unread count update to user {}: {}", recipientId, unreadCount);
        } catch (Exception e) {
            log.error("Error sending unread count update to user {}: {}", recipientId, e.getMessage());
        }
    }

    @Override
    public void sendNotificationToUser(UUID recipientId, String title, String message, NotificationType type, String data) {
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
    public void sendNotificationToUserAsync(UUID recipientId, String title, String message, NotificationType type, UUID senderId, String data) {
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

    // New methods with CompletableFuture for better async handling
    public CompletableFuture<NotificationDto> createNotificationWithCompletableFuture(NotificationRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return createNotification(request);
            } catch (Exception e) {
                log.error("Error creating notification asynchronously: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to create notification asynchronously", e);
            }
        }, notificationTaskExecutor);
    }

    public CompletableFuture<Void> sendNotificationToUserWithCompletableFuture(UUID recipientId, String title, String message, 
                                                              NotificationType type, UUID senderId, String data) {
        return CompletableFuture.runAsync(() -> {
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
                throw new RuntimeException("Failed to send async notification", e);
            }
        }, notificationTaskExecutor);
    }

    public CompletableFuture<Void> sendRealTimeNotificationAsync(UUID recipientId, NotificationDto notification) {
        return CompletableFuture.runAsync(() -> {
            try {
                sendRealTimeNotification(recipientId, notification);
            } catch (Exception e) {
                log.error("Error sending real-time notification asynchronously to user {}: {}", recipientId, e.getMessage(), e);
                throw new RuntimeException("Failed to send real-time notification asynchronously", e);
            }
        }, notificationTaskExecutor);
    }

    public CompletableFuture<List<NotificationDto>> getUserNotificationsAsync(UUID userId, Pageable pageable) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Page<NotificationDto> notifications = getUserNotifications(userId, pageable);
                return notifications.getContent();
            } catch (Exception e) {
                log.error("Error fetching notifications asynchronously: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to fetch notifications asynchronously", e);
            }
        }, notificationTaskExecutor);
    }
} 