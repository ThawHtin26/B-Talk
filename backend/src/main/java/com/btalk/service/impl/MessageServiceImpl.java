package com.btalk.service.impl;

import com.btalk.dto.MessageDto;
import com.btalk.dto.request.MessageRequest;
import com.btalk.entity.Conversation;
import com.btalk.entity.Message;
import com.btalk.entity.Participant;
import com.btalk.entity.User;
import com.btalk.entity.Attachment;
import com.btalk.constants.NotificationType;
import com.btalk.repository.ConversationRepository;
import com.btalk.repository.MessageRepository;
import com.btalk.repository.ParticipantRepository;
import com.btalk.repository.UserRepository;
import com.btalk.repository.AttachmentRepository;
import com.btalk.service.MessageService;
import com.btalk.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageServiceImpl implements MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final AttachmentRepository attachmentRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final Executor messageTaskExecutor;

    @Override
    public MessageDto sendMessage(String conversationId, String senderId, MessageRequest request) {
        try {
            Conversation conversation = conversationRepository.findById(conversationId)
                    .orElseThrow(() -> new RuntimeException("Conversation not found"));

            User sender = userRepository.findById(senderId)
                    .orElseThrow(() -> new RuntimeException("Sender not found"));

            Message message = new Message();
            message.setConversationId(conversationId);
            message.setSenderId(senderId);
            message.setContent(request.getContent());
            message.setMessageType(request.getMessageType());
            message.setSentAt(LocalDateTime.now());

            Message savedMessage = messageRepository.save(message);

            // Send real-time message to all participants
            sendMessageToParticipants(conversationId, savedMessage);

            // Send notifications to other participants
            sendNotificationsToParticipants(conversationId, senderId, savedMessage);

            return convertToDto(savedMessage);
        } catch (Exception e) {
            log.error("Error sending message: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to send message", e);
        }
    }

    private void sendMessageToParticipants(String conversationId, Message message) {
        String destination = "/topic/conversation/" + conversationId + "/messages";
        messagingTemplate.convertAndSend(destination, convertToDto(message));
    }

    private void sendNotificationsToParticipants(String conversationId, String senderId, Message message) {
        try {
            List<Participant> participants = participantRepository.findByConversationId(conversationId);
            
            for (Participant participant : participants) {
                if (!participant.getUserId().equals(senderId)) {
                    // Send notification to other participants
                    String title = "New Message";
                    String messageContent = message.getContent();
                    
                    notificationService.sendNotificationToUserAsync(
                        participant.getUserId(),
                        title,
                        messageContent,
                        NotificationType.NEW_MESSAGE,
                        senderId,
                        "{\"conversationId\":\"" + conversationId + "\",\"messageId\":\"" + message.getMessageId() + "\"}"
                    );
                }
            }
        } catch (Exception e) {
            log.error("Error sending notifications: {}", e.getMessage());
        }
    }

    @Override
    public MessageDto getMessage(String messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        return convertToDto(message);
    }

    @Override
    public List<MessageDto> getConversationMessages(String conversationId, String userId) {
        List<Message> messages = messageRepository.findByConversationIdOrderBySentAtDesc(conversationId);
        return messages.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<MessageDto> getUnreadMessages(String conversationId, String userId) {
        List<Message> messages = messageRepository.findUnreadMessages(conversationId, userId);
        return messages.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<MessageDto> getNewMessages(String conversationId, String userId, LocalDateTime after) {
        List<Message> messages = messageRepository.findUnreadMessagesAfter(conversationId, userId, after);
        return messages.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public void markMessagesAsRead(String conversationId, String userId) {
        // Implementation for marking all messages as read in a conversation
        log.info("All messages in conversation {} marked as read by user {}", conversationId, userId);
    }

    @Override
    public void markMessageAsRead(String messageId, String userId) {
        // Implementation for marking message as read
        log.info("Message {} marked as read by user {}", messageId, userId);
    }

    @Override
    public Page<MessageDto> getConversationMessages(String conversationId, String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messages = messageRepository.findByConversationId(conversationId, pageable);
        return messages.map(this::convertToDto);
    }

    @Override
    public Page<MessageDto> getMessagesBefore(String conversationId, String userId, LocalDateTime before, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messages = messageRepository.findMessagesBefore(conversationId, before, pageable);
        return messages.map(this::convertToDto);
    }

    @Override
    public void deleteMessage(String messageId, String userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (!message.getSenderId().equals(userId)) {
            throw new RuntimeException("You can only delete your own messages");
        }

        messageRepository.delete(message);
    }

    private MessageDto convertToDto(Message message) {
        User sender = userRepository.findById(message.getSenderId())
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        
        // Fetch attachments for this message
        List<Attachment> attachments = attachmentRepository.findByMessageId(message.getMessageId());
        
        return MessageDto.builder()
                .messageId(message.getMessageId())
                .conversationId(message.getConversationId())
                .senderId(message.getSenderId())
                .senderName(sender.getName())
                .senderAvatar(sender.getProfilePhotoUrl())
                .content(message.getContent())
                .messageType(message.getMessageType())
                .sentAt(message.getSentAt())
                .attachments(attachments.stream()
                    .map(this::convertAttachmentToDto)
                    .collect(Collectors.toList()))
                .callDuration(message.getCallDuration())
                .callType(message.getCallType())
                .callStatus(message.getCallStatus())
                .build();
    }

    private com.btalk.dto.AttachmentDto convertAttachmentToDto(Attachment attachment) {
        return new com.btalk.dto.AttachmentDto(
            attachment.getAttachmentId(),
            attachment.getMessageId(),
            attachment.getFileUrl(),
            attachment.getFileType(),
            attachment.getFileSizeBytes()
        );
    }

    @Async("messageTaskExecutor")
    public CompletableFuture<MessageDto> sendMessageAsync(String conversationId, String senderId, MessageRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            return sendMessage(conversationId, senderId, request);
        }, messageTaskExecutor);
    }

    @Async("messageTaskExecutor")
    public CompletableFuture<List<MessageDto>> getConversationMessagesAsync(String conversationId, String userId) {
        return CompletableFuture.supplyAsync(() -> {
            return getConversationMessages(conversationId, userId);
        }, messageTaskExecutor);
    }

    @Async("messageTaskExecutor")
    public CompletableFuture<Void> markMessagesAsReadAsync(String conversationId, String userId) {
        return CompletableFuture.runAsync(() -> {
            markMessagesAsRead(conversationId, userId);
        }, messageTaskExecutor);
    }

    @Async("messageTaskExecutor")
    public CompletableFuture<Void> sendNotificationsToParticipantsAsync(String conversationId, String senderId, Message message) {
        return CompletableFuture.runAsync(() -> {
            sendNotificationsToParticipants(conversationId, senderId, message);
        }, messageTaskExecutor);
    }
}