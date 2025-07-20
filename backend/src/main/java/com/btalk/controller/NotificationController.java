package com.btalk.controller;

import com.btalk.dto.NotificationDto;

import com.btalk.dto.NotificationRequest;
import com.btalk.service.NotificationService;
import com.btalk.service.impl.NotificationServiceImpl;
import com.btalk.dto.response.ApiResponse;
import com.btalk.entity.User;
import com.btalk.constants.NotificationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.btalk.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationDto>>> getUserNotifications(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            String userId = extractUserIdFromAuthentication(authentication);
            Pageable pageable = PageRequest.of(page, size);
            Page<NotificationDto> notifications = notificationService.getUserNotifications(userId, pageable);
            
            return ResponseEntity.ok(ApiResponse.<Page<NotificationDto>>builder()
                    .success(true)
                    .message("Notifications retrieved successfully")
                    .data(notifications)
                    .build());
        } catch (Exception e) {
            log.error("Error getting user notifications: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.<Page<NotificationDto>>builder()
                    .success(false)
                    .message("Failed to get notifications: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/unread")
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getUnreadNotifications(Authentication authentication) {
        try {
            String userId = extractUserIdFromAuthentication(authentication);
            List<NotificationDto> notifications = notificationService.getUnreadNotifications(userId);
            
            return ResponseEntity.ok(ApiResponse.<List<NotificationDto>>builder()
                    .success(true)
                    .message("Unread notifications retrieved successfully")
                    .data(notifications)
                    .build());
        } catch (Exception e) {
            log.error("Error getting unread notifications: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.<List<NotificationDto>>builder()
                    .success(false)
                    .message("Failed to get unread notifications: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(Authentication authentication) {
        try {
            String userId = extractUserIdFromAuthentication(authentication);
            Long count = notificationService.getUnreadCount(userId);
            
            return ResponseEntity.ok(ApiResponse.<Long>builder()
                    .success(true)
                    .message("Unread count retrieved successfully")
                    .data(count)
                    .build());
        } catch (Exception e) {
            log.error("Error getting unread count: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.<Long>builder()
                    .success(false)
                    .message("Failed to get unread count: " + e.getMessage())
                    .build());
        }
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            Authentication authentication,
            @PathVariable String notificationId) {
        try {
            String userId = extractUserIdFromAuthentication(authentication);
            notificationService.markAsRead(notificationId);
            
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("Notification marked as read")
                    .build());
        } catch (Exception e) {
            log.error("Error marking notification as read: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.<Void>builder()
                    .success(false)
                    .message("Failed to mark notification as read: " + e.getMessage())
                    .build());
        }
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(Authentication authentication) {
        try {
            String userId = extractUserIdFromAuthentication(authentication);
            notificationService.markAllAsRead(userId);
            
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("All notifications marked as read")
                    .build());
        } catch (Exception e) {
            log.error("Error marking all notifications as read: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.<Void>builder()
                    .success(false)
                    .message("Failed to mark all notifications as read: " + e.getMessage())
                    .build());
        }
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            Authentication authentication,
            @PathVariable String notificationId) {
        try {
            String userId = extractUserIdFromAuthentication(authentication);
            notificationService.deleteNotification(notificationId);
            
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("Notification deleted successfully")
                    .build());
        } catch (Exception e) {
            log.error("Error deleting notification: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.<Void>builder()
                    .success(false)
                    .message("Failed to delete notification: " + e.getMessage())
                    .build());
        }
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteAllNotifications(Authentication authentication) {
        try {
            String userId = extractUserIdFromAuthentication(authentication);
            notificationService.deleteAllNotifications(userId);
            
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message("All notifications deleted successfully")
                    .build());
        } catch (Exception e) {
            log.error("Error deleting all notifications: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.<Void>builder()
                    .success(false)
                    .message("Failed to delete all notifications: " + e.getMessage())
                    .build());
        }
    }

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<NotificationDto>> sendNotification(@RequestBody NotificationRequest request) {
        try {
            NotificationDto notification = notificationService.createNotification(request);
            
            return ResponseEntity.ok(ApiResponse.<NotificationDto>builder()
                    .success(true)
                    .message("Notification sent successfully")
                    .data(notification)
                    .build());
        } catch (Exception e) {
            log.error("Error sending notification: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.<NotificationDto>builder()
                    .success(false)
                    .message("Failed to send notification: " + e.getMessage())
                    .build());
        }
    }

    @PostMapping("/test-realtime")
    public ResponseEntity<ApiResponse<String>> testRealTimeNotification(Authentication authentication) {
        try {
            String userId = extractUserIdFromAuthentication(authentication);
            
            // Create a test notification
            NotificationRequest testRequest = NotificationRequest.builder()
                    .recipientId(userId)
                    .title("Test Real-time Notification")
                    .message("This is a test notification sent at " + java.time.LocalDateTime.now())
                    .type(NotificationType.SYSTEM_ANNOUNCEMENT)
                    .data("{\"test\": true}")
                    .build();
            
            NotificationDto notification = notificationService.createNotification(testRequest);
            
            return ResponseEntity.ok(ApiResponse.<String>builder()
                    .success(true)
                    .message("Test notification sent successfully")
                    .data("Test notification sent to user: " + userId)
                    .build());
        } catch (Exception e) {
            log.error("Error sending test notification: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.<String>builder()
                    .success(false)
                    .message("Failed to send test notification: " + e.getMessage())
                    .build());
        }
    }

    @PostMapping("/test-async")
    public ResponseEntity<ApiResponse<String>> testAsyncNotification(Authentication authentication) {
        try {
            String userId = extractUserIdFromAuthentication(authentication);
            
            // Create a test notification using CompletableFuture
            NotificationRequest testRequest = NotificationRequest.builder()
                    .recipientId(userId)
                    .title("Test Async Notification")
                    .message("This is a test async notification sent at " + java.time.LocalDateTime.now())
                    .type(NotificationType.SYSTEM_ANNOUNCEMENT)
                    .data("{\"test\": true, \"async\": true}")
                    .build();
            
            // Use CompletableFuture for async processing
            ((NotificationServiceImpl) notificationService).createNotificationWithCompletableFuture(testRequest)
                    .thenAccept(notification -> {
                        log.info("Async notification created successfully: {}", notification.getTitle());
                    })
                    .exceptionally(throwable -> {
                        log.error("Async notification failed: {}", throwable.getMessage());
                        return null;
                    });
            
            return ResponseEntity.ok(ApiResponse.<String>builder()
                    .success(true)
                    .message("Test async notification initiated successfully")
                    .data("Test async notification initiated for user: " + userId)
                    .build());
        } catch (Exception e) {
            log.error("Error initiating async test notification: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.<String>builder()
                    .success(false)
                    .message("Failed to initiate async test notification: " + e.getMessage())
                    .build());
        }
    }

    @PostMapping("/test-websocket")
    public ResponseEntity<ApiResponse<String>> testWebSocketConnection(Authentication authentication) {
        try {
            String userId = extractUserIdFromAuthentication(authentication);
            
            log.info("Testing WebSocket connection for user: {}", userId);
            
            // Send a simple test message via WebSocket
            String testMessage = "WebSocket connection test at " + java.time.LocalDateTime.now();
            
            // Use the messaging template to send a test message
            String destination = "/user/" + userId + "/queue/notifications";
            log.info("📤 Sending test message to destination: {}", destination);
            
            // Create a simple test notification DTO
            NotificationDto testNotification = NotificationDto.builder()
                    .notificationId(java.util.UUID.randomUUID().toString())
                    .recipientId(userId)
                    .title("WebSocket Test")
                    .message(testMessage)
                    .type(NotificationType.SYSTEM_ANNOUNCEMENT)
                    .isRead(false)
                    .createdAt(java.time.LocalDateTime.now())
                    .build();
            
            ((NotificationServiceImpl) notificationService).sendRealTimeNotificationAsync(userId, testNotification)
                    .thenRun(() -> {
                        log.info("WebSocket test message sent successfully to user: {}", userId);
                    })
                    .exceptionally(throwable -> {
                        log.error("WebSocket test message failed for user {}: {}", userId, throwable.getMessage());
                        return null;
                    });
            
            return ResponseEntity.ok(ApiResponse.<String>builder()
                    .success(true)
                    .message("WebSocket test message sent successfully")
                    .data("Test message sent to user: " + userId)
                    .build());
        } catch (Exception e) {
            log.error("Error testing WebSocket connection: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ApiResponse.<String>builder()
                    .success(false)
                    .message("Failed to test WebSocket connection: " + e.getMessage())
                    .build());
        }
    }

    private String extractUserIdFromAuthentication(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new IllegalArgumentException("Authentication or principal is null");
        }

        Object principal = authentication.getPrincipal();
        
        if (principal instanceof User) {
            return ((User) principal).getUserId();
        } else if (principal instanceof String) {
            String principalStr = (String) principal;
            // Check if it's an email address
            if (principalStr.contains("@")) {
                // It's an email, we need to get the user from the database
                try {
                    User user = userRepository.findByEmail(principalStr)
                            .orElseThrow(() -> new IllegalArgumentException("User not found for email: " + principalStr));
                    return user.getUserId();
                } catch (Exception e) {
                    log.error("Error finding user by email: {}", principalStr, e);
                    throw new IllegalArgumentException("Invalid user email: " + principalStr);
                }
            } else {
                // It's a string ID
                return principalStr;
            }
        } else {
            throw new IllegalArgumentException("Unexpected principal type: " + principal.getClass().getName());
        }
    }
} 