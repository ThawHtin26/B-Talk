package com.btalk.controller;

import com.btalk.dto.MessageDto;
import com.btalk.service.MessageService;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {
    
    private final MessageService messageService;
    
    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping("/conversation/{conversationId}")
    public List<MessageDto> getConversationMessages(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        return messageService.getConversationMessages(conversationId, userId);
    }

    @GetMapping("/conversation/{conversationId}/unread")
    public List<MessageDto> getUnreadMessages(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        return messageService.getUnreadMessages(conversationId, userId);
    }

    @GetMapping("/conversation/{conversationId}/new")
    public List<MessageDto> getNewMessages(
            @PathVariable Long conversationId,
            @RequestParam Long userId,
            @RequestParam LocalDateTime after) {
        return messageService.getNewMessages(conversationId, userId, after);
    }

    @PostMapping("/read/conversation/{conversationId}")
    public void markMessagesAsRead(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        messageService.markMessagesAsRead(conversationId, userId);
    }

    @PostMapping("/read/{messageId}")
    public void markMessageAsRead(
            @PathVariable Long messageId,
            @RequestParam Long userId) {
        messageService.markMessageAsRead(messageId, userId);
    }
}