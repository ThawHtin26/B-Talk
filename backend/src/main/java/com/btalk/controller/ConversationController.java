package com.btalk.controller;

import com.btalk.dto.ConversationDto;
import com.btalk.dto.ParticipantUpdateDto;
import com.btalk.dto.response.ApiResponse;
import com.btalk.service.ConversationService;

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

    public ConversationController(ConversationService conversationService, 
                                SimpMessagingTemplate messagingTemplate) {
        this.conversationService = conversationService;
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping("/private")
    public ApiResponse<ConversationDto> createPrivateConversation(
            @RequestParam Long creatorId,
            @RequestParam Long participantId) {
        try {
            ConversationDto conversation = conversationService.createPrivateConversation(creatorId, participantId);
            
            // Notify both participants
            List<Long> participants = List.of(creatorId, participantId);
            for (Long userId : participants) {
            	// Ensure this matches what frontend expects
            	messagingTemplate.convertAndSendToUser(
            	    userId.toString(),
            	    "/queue/conversation-updates",  // Changed from "/queue/conversations"
            	    ApiResponse.success(
            	        "New conversation created",
            	        Map.of(
            	            "eventType", "NEW_CONVERSATION",
            	            "conversation", conversation
            	        )
            	    )
            	);
            }
            
            return ApiResponse.success("Private conversation created successfully", conversation);
        } catch (Exception e) {
            log.error("Failed to create private conversation", e);
            return ApiResponse.error("Failed to create conversation: " + e.getMessage());
        }
    }

    @PostMapping("/group")
    public ApiResponse<ConversationDto> createGroupConversation(
            @RequestParam Long creatorId,
            @RequestParam String name,
            @RequestBody List<Long> participantIds) {
        try {
            // Include creator in participants
            List<Long> allParticipants = new ArrayList<>(participantIds);
            if (!allParticipants.contains(creatorId)) {
                allParticipants.add(creatorId);
            }

            ConversationDto conversation = conversationService.createGroupConversation(creatorId, name, allParticipants);
            
            // Notify all participants
            for (Long participantId : allParticipants) {
                messagingTemplate.convertAndSendToUser(
                    participantId.toString(),
                    "/queue/conversations-updates",
                    ApiResponse.success(
                        "New group conversation created",
                        Map.of(
                            "conversation", conversation,
                            "eventType", "NEW_CONVERSATION"
                        )
                    )
                );
            }

            return ApiResponse.success("Group conversation created successfully", conversation);
        } catch (Exception e) {
            return ApiResponse.error("Failed to create group conversation: " + e.getMessage());
        }
    }
    
    @GetMapping("/user/{userId}")
    public ApiResponse<List<ConversationDto>> getUserConversations(@PathVariable Long userId) {
        try {
            List<ConversationDto> conversations = conversationService.getUserConversations(userId);
            return ApiResponse.success("Conversations retrieved successfully", conversations);
        } catch (Exception e) {
            return ApiResponse.error("Failed to get conversations: " + e.getMessage());
        }
    }
}