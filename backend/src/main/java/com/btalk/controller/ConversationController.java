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
            @RequestParam String creatorId,
            @RequestParam String participantId) {
        try {
            List<String> participants = List.of(creatorId, participantId);
            
            log.info("Creating private conversation between {} and {}", creatorId, participantId);
            ConversationDto conversation = conversationService.createConversation("", participants, creatorId);
            
            log.info("Private conversation created successfully: {}", conversation.getConversationId());
            
            // Notify both participants with updated conversation data
            for (String userId : participants) {
                // Ensure this matches what frontend expects
                log.info("Sending conversation update to userId={}", userId);
                
                try {
                    ApiResponse<Map<String, Object>> response = ApiResponse.success("New conversation created", Map.of(
                        "eventType", "NEW_CONVERSATION",
                        "conversation", conversation
                    ));
                    
                    messagingTemplate.convertAndSendToUser(
                        userId,
                        "/queue/conversation-updates",
                        response
                    );
                    log.info("Successfully sent conversation update to user {}: {}", userId, response);
                } catch (Exception e) {
                    log.error("Failed to send conversation update to user {}: {}", userId, e.getMessage(), e);
                }
                
                // Send notification count update
                try {
                    Long unreadCount = notificationService.getUnreadCount(userId);
                    messagingTemplate.convertAndSendToUser(
                        userId,
                        "/queue/unread-count",
                        unreadCount
                    );
                    log.info("Successfully sent unread count update to user {}: {}", userId, unreadCount);
                } catch (Exception e) {
                    log.error("Failed to send unread count update to user {}: {}", userId, e.getMessage(), e);
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
            @RequestParam String creatorId,
            @RequestParam String name,
            @RequestBody List<String> participantIds) {
        try {
            // Include creator in participants
            List<String> allParticipants = new ArrayList<>(participantIds);
            if (!allParticipants.contains(creatorId)) {
                allParticipants.add(creatorId);
            }

            log.info("Creating group conversation '{}' with {} participants", name, allParticipants.size());
            ConversationDto conversation = conversationService.createConversation(name, allParticipants, creatorId);
            
            log.info("Group conversation created successfully: {}", conversation.getConversationId());
            
            // Notify all participants
            for (String participantId : allParticipants) {
                try {
                    ApiResponse<Map<String, Object>> response = ApiResponse.success("New group conversation created", Map.of(
                        "eventType", "NEW_CONVERSATION",
                        "conversation", conversation
                    ));
                    
                    messagingTemplate.convertAndSendToUser(
                        participantId,
                        "/queue/conversation-updates",
                        response
                    );
                    log.info("Successfully sent group conversation update to user {}: {}", participantId, response);
                } catch (Exception e) {
                    log.error("Failed to send group conversation update to user {}: {}", participantId, e.getMessage(), e);
                }
                
                // Send notification count update
                try {
                    Long unreadCount = notificationService.getUnreadCount(participantId);
                    messagingTemplate.convertAndSendToUser(
                        participantId,
                        "/queue/unread-count",
                        unreadCount
                    );
                    log.info("Successfully sent unread count update to user {}: {}", participantId, unreadCount);
                } catch (Exception e) {
                    log.error("Failed to send unread count update to user {}: {}", participantId, e.getMessage(), e);
                }
            }

            return ApiResponse.success("Group conversation created successfully", conversation);
        } catch (Exception e) {
            log.error("Failed to create group conversation", e);
            return ApiResponse.error("Failed to create group conversation: " + e.getMessage());
        }
    }
    
    @GetMapping("/user/{userId}")
    public ApiResponse<List<ConversationDto>> getUserConversations(@PathVariable String userId) {
        try {
            List<ConversationDto> conversations = conversationService.getUserConversations(userId);
            return ApiResponse.success("Conversations retrieved successfully", conversations);
        } catch (Exception e) {
            return ApiResponse.error("Failed to get conversations: " + e.getMessage());
        }
    }
}