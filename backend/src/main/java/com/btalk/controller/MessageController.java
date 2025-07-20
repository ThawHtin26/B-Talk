package com.btalk.controller;

import com.btalk.dto.*;
import com.btalk.dto.response.ApiResponse;
import com.btalk.service.MessageService;
import com.btalk.utils.FileStorageUtils;
import com.btalk.repository.AttachmentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@Slf4j
public class MessageController {
    
    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final FileStorageUtils fileStorageUtils;
    private final AttachmentRepository attachmentRepository;
    
    public MessageController(MessageService messageService, 
                           SimpMessagingTemplate messagingTemplate,
                           FileStorageUtils fileStorageUtils,
                           AttachmentRepository attachmentRepository) {
        this.messageService = messageService;
        this.messagingTemplate = messagingTemplate;
        this.fileStorageUtils = fileStorageUtils;
        this.attachmentRepository = attachmentRepository;
    }

    // Send a new message
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<MessageDto> sendMessage(
        @RequestPart("message") String messageJson,
        @RequestPart(value = "attachments", required = false) List<MultipartFile> attachments) throws IOException {
        
        // Convert JSON string to MessageDto
        ObjectMapper objectMapper = new ObjectMapper();
        MessageDto messageDto = objectMapper.readValue(messageJson, MessageDto.class);
        
        // Convert MessageDto to MessageRequest
        com.btalk.dto.request.MessageRequest request = com.btalk.dto.request.MessageRequest.builder()
                .content(messageDto.getContent())
                .messageType(messageDto.getMessageType())
                .build();
        
        // Send message first to get the message ID
        MessageDto savedMessage = messageService.sendMessage(messageDto.getConversationId(), messageDto.getSenderId(), request);
        
        // Process attachments and save them to database
        if (attachments != null && !attachments.isEmpty()) {
            List<AttachmentDto> attachmentDtos = new ArrayList<>();
            for (MultipartFile file : attachments) {
                AttachmentDto savedAttachment = fileStorageUtils.storeFile(file);
                
                // Create attachment entity and save to database
                com.btalk.entity.Attachment attachment = new com.btalk.entity.Attachment();
                attachment.setMessageId(savedMessage.getMessageId());
                attachment.setFileUrl(savedAttachment.getFileUrl());
                attachment.setFileType(savedAttachment.getFileType());
                attachment.setFileSizeBytes(savedAttachment.getFileSizeBytes());
                
                // Save attachment to database
                com.btalk.entity.Attachment savedAttachmentEntity = attachmentRepository.save(attachment);
                
                // Convert to DTO for response
                AttachmentDto attachmentDto = new AttachmentDto(
                    savedAttachmentEntity.getAttachmentId(),
                    savedAttachmentEntity.getMessageId(),
                    savedAttachmentEntity.getFileUrl(),
                    savedAttachmentEntity.getFileType(),
                    savedAttachmentEntity.getFileSizeBytes()
                );
                
                attachmentDtos.add(attachmentDto);
            }
            
            // Update the saved message with attachments
            savedMessage.setAttachments(attachmentDtos);
        }
        
        // Broadcast message with attachments
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
            @PathVariable String conversationId,
            @RequestParam String userId) {
        List<MessageDto> messages = messageService.getConversationMessages(conversationId, userId);
        return ApiResponse.success("Messages retrieved successfully", messages);
    }

    @GetMapping("/conversation/{conversationId}/unread")
    public ApiResponse<List<MessageDto>> getUnreadMessages(
            @PathVariable String conversationId,
            @RequestParam String userId) {
        List<MessageDto> unreadMessages = messageService.getUnreadMessages(conversationId, userId);
        return ApiResponse.success("Unread messages retrieved successfully", unreadMessages);
    }

    @GetMapping("/conversation/{conversationId}/new")
    public ApiResponse<List<MessageDto>> getNewMessages(
            @PathVariable String conversationId,
            @RequestParam String userId,
            @RequestParam LocalDateTime after) {
        List<MessageDto> newMessages = messageService.getNewMessages(conversationId, userId, after);
        return ApiResponse.success("New messages retrieved successfully", newMessages);
    }

    @PostMapping("/read/conversation/{conversationId}")
    public ApiResponse<Void> markMessagesAsRead(
            @PathVariable String conversationId,
            @RequestParam String userId) {
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
            @PathVariable String messageId,
            @RequestParam String userId) {
        messageService.markMessageAsRead(messageId, userId);
        // Broadcast single message read receipt
        MessageDto message = messageService.getMessage(messageId);
        messagingTemplate.convertAndSend(
            "/topic/conversation/" + message.getConversationId() + "/read",
            new SingleMessageReadReceiptDto(userId, messageId, LocalDateTime.now())
        );
        return ApiResponse.success("Message marked as read successfully",null);
    }
    
    @GetMapping("/conversation/{conversationId}/page")
    public ApiResponse<Page<MessageDto>> getConversationMessagesPaginated(
            @PathVariable String conversationId,
            @RequestParam String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<MessageDto> messages = messageService.getConversationMessages(conversationId, userId, page, size);
        return ApiResponse.success("Messages retrieved successfully", messages);
    }

    @GetMapping("/conversation/{conversationId}/page/before")
    public ApiResponse<Page<MessageDto>> getMessagesBefore(
            @PathVariable String conversationId,
            @RequestParam String userId,
            @RequestParam Instant  before,  // Accept as String
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
    	LocalDateTime localBefore = LocalDateTime.ofInstant(before, ZoneId.systemDefault());
        Page<MessageDto> messages = messageService.getMessagesBefore(conversationId, userId, localBefore, page, size);
        return ApiResponse.success("Messages retrieved successfully", messages);
    }
    
}