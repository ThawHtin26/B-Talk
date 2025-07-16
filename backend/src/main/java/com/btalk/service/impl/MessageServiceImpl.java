package com.btalk.service.impl;

import com.btalk.constants.MessageType;
import com.btalk.dto.*;
import com.btalk.entity.*;
import com.btalk.exceptions.ResourceNotFoundException;
import com.btalk.repository.*;
import com.btalk.service.MessageService;
import com.btalk.service.UserService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class MessageServiceImpl implements MessageService {
    
    private final MessageRepository messageRepository;
    private final AttachmentRepository attachmentRepository;
    private final ParticipantRepository participantRepository;
    private final MessageReadRepository messageReadRepository;
    private final UserService userService;
    
    public MessageServiceImpl(MessageRepository messageRepository,
                            AttachmentRepository attachmentRepository,
                            ParticipantRepository participantRepository,
                            MessageReadRepository messageReadRepository,
                            UserService userService) {
        this.messageRepository = messageRepository;
        this.attachmentRepository = attachmentRepository;
        this.participantRepository = participantRepository;
        this.messageReadRepository = messageReadRepository;
        this.userService = userService;
    }

    @Override
    public MessageDto sendMessage(MessageDto messageDto) {
        // Verify sender is a participant in the conversation
        if (!participantRepository.existsByConversationIdAndUserId(messageDto.getConversationId(), messageDto.getSenderId())) {
            throw new RuntimeException("Sender is not a participant in this conversation");
        }
        
        Message message = new Message();
        message.setConversationId(messageDto.getConversationId());
        message.setSenderId(messageDto.getSenderId());
        message.setContent(messageDto.getContent());
        message.setMessageType(messageDto.getMessageType());
        message.setSentAt(LocalDateTime.now());
        message = messageRepository.save(message);
        
        // Save attachments if any
        if (messageDto.getAttachments() != null && !messageDto.getAttachments().isEmpty()) {
            for (AttachmentDto attachmentDto : messageDto.getAttachments()) {
                Attachment attachment = new Attachment();
                attachment.setMessageId(message.getMessageId());
                attachment.setFileUrl(attachmentDto.getFileUrl());
                attachment.setFileType(attachmentDto.getFileType());
                attachment.setFileSizeBytes(attachmentDto.getFileSizeBytes());
                attachmentRepository.save(attachment);
            }
        }
        
        return convertToDto(message);
    }

    @Override
    public List<MessageDto> getConversationMessages(Long conversationId, Long userId) {
        // Verify user is a participant
        if (!participantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new RuntimeException("User is not a participant in this conversation");
        }
        
        List<Message> messages = messageRepository.findByConversationIdOrderBySentAtDesc(conversationId);
        return messages.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public void markMessagesAsRead(Long conversationId, Long userId) {
        List<Message> unreadMessages = messageRepository.findUnreadMessages(conversationId, userId);
        for (Message message : unreadMessages) {
            MessageRead messageRead = new MessageRead();
            messageRead.setMessageId(message.getMessageId());
            messageRead.setUserId(userId);
            messageRead.setReadAt(LocalDateTime.now());
            messageReadRepository.save(messageRead);
        }
    }
    
    private MessageDto convertToDto(Message message) {
        MessageDto dto = new MessageDto();
        dto.setMessageId(message.getMessageId());
        dto.setConversationId(message.getConversationId());
        dto.setSenderId(message.getSenderId());
        
        // Get sender details from user service
        UserDto sender = userService.getUserById(message.getSenderId());
        dto.setSenderName(sender.getName());
        
        dto.setContent(message.getContent());
        dto.setMessageType(message.getMessageType());
        dto.setSentAt(message.getSentAt());
        dto.setStatus("DELIVERED"); // Default status
        
        // Set attachments if any
        List<Attachment> attachments = attachmentRepository.findByMessageId(message.getMessageId());
        dto.setAttachments(attachments.stream()
                .map(this::convertAttachmentToDto)
                .collect(Collectors.toList()));
        
        return dto;
    }
    
    private AttachmentDto convertAttachmentToDto(Attachment attachment) {
        AttachmentDto dto = new AttachmentDto();
        dto.setAttachmentId(attachment.getAttachmentId());
        dto.setFileUrl(attachment.getFileUrl());
        dto.setFileType(attachment.getFileType());
        dto.setFileSizeBytes(attachment.getFileSizeBytes());
        return dto;
    }
    
    @Override
    public List<MessageDto> getUnreadMessages(Long conversationId, Long userId) {
        // Verify user is a participant
        if (!participantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new RuntimeException("User is not a participant in this conversation");
        }
        
        List<Message> messages = messageRepository.findUnreadMessages(conversationId, userId);
        return messages.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<MessageDto> getNewMessages(Long conversationId, Long userId, LocalDateTime after) {
        // Verify user is a participant
        if (!participantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new RuntimeException("User is not a participant in this conversation");
        }
        
        List<Message> messages = messageRepository.findUnreadMessagesAfter(conversationId, userId, after);
        return messages.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public void markMessageAsRead(Long messageId, Long userId) {
        if (!messageReadRepository.existsByMessageIdAndUserId(messageId, userId)) {
            MessageRead messageRead = new MessageRead();
            messageRead.setMessageId(messageId);
            messageRead.setUserId(userId);
            messageRead.setReadAt(LocalDateTime.now());
            messageReadRepository.save(messageRead);
        }
    }
    
    @Override
    public MessageDto getMessage(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));
        
        MessageDto messageDto = new MessageDto();
        messageDto.setMessageId(message.getMessageId());
        messageDto.setConversationId(message.getConversationId());
        messageDto.setSenderId(message.getSenderId());
        UserDto sender = userService.getUserById(message.getSenderId());
        messageDto.setSenderName(sender.getName());
        messageDto.setContent(message.getContent());
        messageDto.setMessageType(message.getMessageType());
        messageDto.setSentAt(messageDto.getSentAt());
        return messageDto;
    }

    @Override
    public Page<MessageDto> getConversationMessages(Long conversationId, Long userId, int page, int size) {
        if (!participantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new RuntimeException("User is not a participant in this conversation");
        }
        
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messages = messageRepository.findByConversationId(conversationId, pageable);
        return messages.map(this::convertToDto);
    }

    @Override
    public Page<MessageDto> getMessagesBefore(Long conversationId, Long userId, LocalDateTime before, int page, int size) {
        if (!participantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new RuntimeException("User is not a participant in this conversation");
        }
        
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messages = messageRepository.findMessagesBefore(conversationId, before, pageable);
        
        for(Message message : messages.getContent()) {
        	log.info("Message is {}",message.toString());
        }
        log.info("Message size is : {}",messages.getSize());
        return messages.map(this::convertToDto);
    }

}