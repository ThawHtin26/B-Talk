package com.btalk.controller;

import com.btalk.dto.ConversationDto;
import com.btalk.dto.ParticipantUpdateDto;
import com.btalk.dto.response.ApiResponse;
import com.btalk.entity.User;
import com.btalk.service.ConversationService;
import com.btalk.service.NotificationService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@Slf4j
@RequestMapping("/api/conversations")
public class ConversationController {
    private final ConversationService conversationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    public ConversationController(ConversationService conversationService, 
                                SimpMessagingTemplate messagingTemplate,
                                NotificationService notificationService) {
        this.conversationService = conversationService;
        this.messagingTemplate = messagingTemplate;
        this.notificationService = notificationService;
    }

    @PostMapping("/private")
    public ApiResponse<ConversationDto> createPrivateConversation(
            @RequestParam UUID creatorId,
            @RequestParam UUID participantId) {
        try {
            List<UUID> participants = List.of(creatorId, participantId);
            
            log.info("Creating private conversation between {} and {}", creatorId, participantId);
            ConversationDto conversation = conversationService.createConversation("", participants, creatorId);
            
            // Notify both participants with updated conversation data
            for (UUID userId : participants) {
                // Ensure this matches what frontend expects
                log.info("Sending conversation update to userId={}", userId);
                
                try {
                    messagingTemplate.convertAndSendToUser(
                        userId.toString(),
                        "/queue/conversation-updates",
                        conversation
                    );
                    log.info("Successfully sent conversation update to user {}", userId);
                } catch (Exception e) {
                    log.error("Failed to send conversation update to user {}: {}", userId, e.getMessage());
                }
                
                // Send notification count update
                try {
                    Long unreadCount = notificationService.getUnreadCount(userId);
                    messagingTemplate.convertAndSendToUser(
                        userId.toString(),
                        "/queue/unread-count",
                        unreadCount
                    );
                    log.info("Successfully sent unread count update to user {}: {}", userId, unreadCount);
                } catch (Exception e) {
                    log.error("Failed to send unread count update to user {}: {}", userId, e.getMessage());
                }
            }
            
            return ApiResponse.success("Private conversation created successfully", conversation);
        } catch (Exception e) {
            log.error("Failed to create private conversation", e);
            return ApiResponse.error("Failed to create conversation: " + e.getMessage());
        }
    }

    @PostMapping("/group")
    public ApiResponse<ConversationDto> createGroupConversation(
            @RequestParam UUID creatorId,
            @RequestParam String name,
            @RequestBody List<UUID> participantIds) {
        try {
            // Include creator in participants
            List<UUID> allParticipants = new ArrayList<>(participantIds);
            if (!allParticipants.contains(creatorId)) {
                allParticipants.add(creatorId);
            }

            log.info("Creating group conversation '{}' with {} participants", name, allParticipants.size());
            ConversationDto conversation = conversationService.createConversation(name, allParticipants, creatorId);
            
            // Notify all participants
            for (UUID participantId : allParticipants) {
                try {
                    messagingTemplate.convertAndSendToUser(
                        participantId.toString(),
                        "/queue/conversation-updates",
                        conversation
                    );
                    log.info("Successfully sent group conversation update to user {}", participantId);
                } catch (Exception e) {
                    log.error("Failed to send group conversation update to user {}: {}", participantId, e.getMessage());
                }
                
                // Send notification count update
                try {
                    Long unreadCount = notificationService.getUnreadCount(participantId);
                    messagingTemplate.convertAndSendToUser(
                        participantId.toString(),
                        "/queue/unread-count",
                        unreadCount
                    );
                    log.info("Successfully sent unread count update to user {}: {}", participantId, unreadCount);
                } catch (Exception e) {
                    log.error("Failed to send unread count update to user {}: {}", participantId, e.getMessage());
                }
            }

            return ApiResponse.success("Group conversation created successfully", conversation);
        } catch (Exception e) {
            log.error("Failed to create group conversation", e);
            return ApiResponse.error("Failed to create group conversation: " + e.getMessage());
        }
    }
    
    @GetMapping("/user/{userId}")
    public ApiResponse<List<ConversationDto>> getUserConversations(@PathVariable UUID userId) {
        try {
            List<ConversationDto> conversations = conversationService.getUserConversations(userId);
            return ApiResponse.success("Conversations retrieved successfully", conversations);
        } catch (Exception e) {
            return ApiResponse.error("Failed to get conversations: " + e.getMessage());
        }
    }
}