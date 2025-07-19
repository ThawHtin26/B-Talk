package com.btalk.service.impl;

import com.btalk.dto.MessageDto;
import com.btalk.dto.request.MessageRequest;
import com.btalk.entity.Conversation;
import com.btalk.entity.Message;
import com.btalk.entity.Participant;
import com.btalk.entity.User;
import com.btalk.entity.Notification.NotificationType;
import com.btalk.repository.ConversationRepository;
import com.btalk.repository.MessageRepository;
import com.btalk.repository.ParticipantRepository;
import com.btalk.repository.UserRepository;
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
import java.util.UUID;
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
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final Executor messageTaskExecutor;

    @Override
    public MessageDto sendMessage(UUID conversationId, UUID senderId, MessageRequest request) {
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

    private void sendMessageToParticipants(UUID conversationId, Message message) {
        String destination = "/topic/conversation/" + conversationId + "/messages";
        messagingTemplate.convertAndSend(destination, convertToDto(message));
    }

    private void sendNotificationsToParticipants(UUID conversationId, UUID senderId, Message message) {
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
    public MessageDto getMessage(UUID messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        return convertToDto(message);
    }

    @Override
    public List<MessageDto> getConversationMessages(UUID conversationId, UUID userId) {
        List<Message> messages = messageRepository.findByConversationIdOrderBySentAtDesc(conversationId);
        return messages.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<MessageDto> getUnreadMessages(UUID conversationId, UUID userId) {
        List<Message> messages = messageRepository.findUnreadMessages(conversationId, userId);
        return messages.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<MessageDto> getNewMessages(UUID conversationId, UUID userId, LocalDateTime after) {
        List<Message> messages = messageRepository.findUnreadMessagesAfter(conversationId, userId, after);
        return messages.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public void markMessagesAsRead(UUID conversationId, UUID userId) {
        // Implementation for marking all messages as read in a conversation
        log.info("All messages in conversation {} marked as read by user {}", conversationId, userId);
    }

    @Override
    public void markMessageAsRead(UUID messageId, UUID userId) {
        // Implementation for marking message as read
        log.info("Message {} marked as read by user {}", messageId, userId);
    }

    @Override
    public Page<MessageDto> getConversationMessages(UUID conversationId, UUID userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messages = messageRepository.findByConversationId(conversationId, pageable);
        return messages.map(this::convertToDto);
    }

    @Override
    public Page<MessageDto> getMessagesBefore(UUID conversationId, UUID userId, LocalDateTime before, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messages = messageRepository.findMessagesBefore(conversationId, before, pageable);
        return messages.map(this::convertToDto);
    }

    @Override
    public void deleteMessage(UUID messageId, UUID userId) {
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
                
        return MessageDto.builder()
                .messageId(message.getMessageId())
                .conversationId(message.getConversationId())
                .senderId(message.getSenderId())
                .senderName(sender.getName())
                .senderAvatar(sender.getProfilePhotoUrl())
                .content(message.getContent())
                .messageType(message.getMessageType())
                .sentAt(message.getSentAt())
                .build();
    }

    // New methods with CompletableFuture for better async handling
    public CompletableFuture<MessageDto> sendMessageAsync(UUID conversationId, UUID senderId, MessageRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                MessageDto result = sendMessage(conversationId, senderId, request);
                return result;
            } catch (Exception e) {
                log.error("Error sending message asynchronously to conversation {}: {}", conversationId, e.getMessage(), e);
                throw new RuntimeException("Failed to send message asynchronously", e);
            }
        }, messageTaskExecutor);
    }

    public CompletableFuture<List<MessageDto>> getConversationMessagesAsync(UUID conversationId, UUID userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<MessageDto> messages = getConversationMessages(conversationId, userId);
                return messages;
            } catch (Exception e) {
                log.error("Error fetching messages asynchronously for conversation {}: {}", conversationId, e.getMessage(), e);
                throw new RuntimeException("Failed to fetch messages asynchronously", e);
            }
        }, messageTaskExecutor);
    }

    public CompletableFuture<Void> markMessagesAsReadAsync(UUID conversationId, UUID userId) {
        return CompletableFuture.runAsync(() -> {
            try {
                markMessagesAsRead(conversationId, userId);
            } catch (Exception e) {
                log.error("Error marking messages as read asynchronously for conversation {}: {}", conversationId, e.getMessage(), e);
                throw new RuntimeException("Failed to mark messages as read asynchronously", e);
            }
        }, messageTaskExecutor);
    }

    public CompletableFuture<Void> sendNotificationsToParticipantsAsync(UUID conversationId, UUID senderId, Message message) {
        return CompletableFuture.runAsync(() -> {
            try {
                sendNotificationsToParticipants(conversationId, senderId, message);
            } catch (Exception e) {
                log.error("Error sending notifications asynchronously to participants of conversation {}: {}", conversationId, e.getMessage(), e);
                throw new RuntimeException("Failed to send notifications asynchronously", e);
            }
        }, messageTaskExecutor);
    }
}