package com.btalk.controller;

import com.btalk.dto.ConversationDto;
import com.btalk.service.ConversationService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {
    
    private final ConversationService conversationService;
    
    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }
    
    @PostMapping("/private")
    public ConversationDto createPrivateConversation(
            @RequestParam Long creatorId,
            @RequestParam Long participantId) {
        return conversationService.createPrivateConversation(creatorId, participantId);
    }
    
    @PostMapping("/group")
    public ConversationDto createGroupConversation(
            @RequestParam Long creatorId,
            @RequestParam String name,
            @RequestBody List<Long> participantIds) {
        return conversationService.createGroupConversation(creatorId, name, participantIds);
    }
    
    @PostMapping("/{conversationId}/participants")
    public ConversationDto addParticipants(
            @PathVariable Long conversationId,
            @RequestParam Long adderId,
            @RequestBody List<Long> participantIds) {
        return conversationService.addParticipantsToGroup(conversationId, adderId, participantIds);
    }
    
    @GetMapping("/user/{userId}")
    public List<ConversationDto> getUserConversations(@PathVariable Long userId) {
        return conversationService.getUserConversations(userId);
    }
    
    @GetMapping("/{conversationId}")
    public ConversationDto getConversationDetails(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        return conversationService.getConversationDetails(conversationId, userId);
    }
    
    @DeleteMapping("/{conversationId}/leave")
    public void leaveConversation(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        conversationService.leaveConversation(conversationId, userId);
    }
}