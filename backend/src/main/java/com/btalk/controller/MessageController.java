package com.btalk.controller;

import com.btalk.dto.*;
import com.btalk.dto.response.ApiResponse;
import com.btalk.service.MessageService;
import com.btalk.utils.FileStorageUtils;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {
    
    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final FileStorageUtils fileStorageUtils;
    
    public MessageController(MessageService messageService, 
                           SimpMessagingTemplate messagingTemplate,
                           FileStorageUtils fileStorageUtils) {
        this.messageService = messageService;
        this.messagingTemplate = messagingTemplate;
        this.fileStorageUtils = fileStorageUtils;
    }

    // Send a new message
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<MessageDto> sendMessage(
        @RequestPart("message") String messageJson,
        @RequestPart(value = "attachments", required = false) List<MultipartFile> attachments) throws IOException {
        
        // Convert JSON string to MessageDto
        ObjectMapper objectMapper = new ObjectMapper();
        MessageDto messageDto = objectMapper.readValue(messageJson, MessageDto.class);
        
        // Process attachments
        if (attachments != null && !attachments.isEmpty()) {
            List<AttachmentDto> attachmentDtos = new ArrayList<>();
            for (MultipartFile file : attachments) {
                AttachmentDto savedAttachment = fileStorageUtils.storeFile(file);
                attachmentDtos.add(savedAttachment);
            }
            messageDto.setAttachments(attachmentDtos);
        }
        
        MessageDto savedMessage = messageService.sendMessage(messageDto);
        
        // Broadcast message
        messagingTemplate.convertAndSend(
            "/topic/conversation/" + savedMessage.getConversationId() + "/messages",
            ApiResponse.success("New message received", Map.of(
                "eventType", "NEW_MESSAGE",
                "message", savedMessage
            ))
        );
        
        return ApiResponse.success("Message sent successfully", savedMessage);
    }

    @GetMapping("/conversation/{conversationId}")
    public ApiResponse<List<MessageDto>> getConversationMessages(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        List<MessageDto> messages = messageService.getConversationMessages(conversationId, userId);
        return ApiResponse.success("Messages retrieved successfully", messages);
    }

    @GetMapping("/conversation/{conversationId}/unread")
    public ApiResponse<List<MessageDto>> getUnreadMessages(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        List<MessageDto> unreadMessages = messageService.getUnreadMessages(conversationId, userId);
        return ApiResponse.success("Unread messages retrieved successfully", unreadMessages);
    }

    @GetMapping("/conversation/{conversationId}/new")
    public ApiResponse<List<MessageDto>> getNewMessages(
            @PathVariable Long conversationId,
            @RequestParam Long userId,
            @RequestParam LocalDateTime after) {
        List<MessageDto> newMessages = messageService.getNewMessages(conversationId, userId, after);
        return ApiResponse.success("New messages retrieved successfully", newMessages);
    }

    @PostMapping("/read/conversation/{conversationId}")
    public ApiResponse<Void> markMessagesAsRead(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        messageService.markMessagesAsRead(conversationId, userId);
        // Broadcast read receipt to conversation participants
        messagingTemplate.convertAndSend(
            "/topic/conversation/" + conversationId + "/read",
            new ReadReceiptDto(userId, conversationId, LocalDateTime.now())
        );
        return ApiResponse.success("Messages marked as read successfully",null);
    }

    @PostMapping("/read/{messageId}")
    public ApiResponse<Void> markMessageAsRead(
            @PathVariable Long messageId,
            @RequestParam Long userId) {
        messageService.markMessageAsRead(messageId, userId);
        // Broadcast single message read receipt
        MessageDto message = messageService.getMessage(messageId);
        messagingTemplate.convertAndSend(
            "/topic/conversation/" + message.getConversationId() + "/read",
            new SingleMessageReadReceiptDto(userId, messageId, LocalDateTime.now())
        );
        return ApiResponse.success("Message marked as read successfully",null);
    }
}