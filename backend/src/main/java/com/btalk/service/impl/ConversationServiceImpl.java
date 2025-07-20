package com.btalk.service.impl;

import com.btalk.constants.ConversationType;

import com.btalk.dto.ConversationDto;
import com.btalk.dto.ParticipantDto;
import com.btalk.dto.MessageDto;
import com.btalk.entity.Conversation;
import com.btalk.entity.Participant;
import com.btalk.entity.User;
import com.btalk.entity.Message;
import com.btalk.constants.NotificationType;
import com.btalk.repository.ConversationRepository;
import com.btalk.repository.ParticipantRepository;
import com.btalk.repository.UserRepository;
import com.btalk.repository.MessageRepository;
import com.btalk.service.ConversationService;
import com.btalk.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationServiceImpl implements ConversationService {

    private final ConversationRepository conversationRepository;
    private final ParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final NotificationService notificationService;

    @Override
    public ConversationDto createConversation(String name, List<String> participantIds, String creatorId) {
        try {
            User creator = userRepository.findById(creatorId)
                    .orElseThrow(() -> new RuntimeException("Creator not found"));
            
            Conversation conversation = Conversation.builder()
                    .name(name)
                    .creatorId(creator.getUserId())
                    .createdAt(LocalDateTime.now())
                    .type(participantIds.size() == 2 ? ConversationType.PRIVATE: ConversationType.GROUP)
                    .build();

            Conversation savedConversation = conversationRepository.save(conversation);

            // Add participants
            for (String participantId : participantIds) {
                User participant = userRepository.findById(participantId)
                        .orElseThrow(() -> new RuntimeException("Participant not found"));

                Participant participantEntity = Participant.builder()
                        .conversationId(savedConversation.getConversationId())
                        .userId(participant.getUserId())
                        .joinedAt(LocalDateTime.now())
                        .build();

                participantRepository.save(participantEntity);

                // Send notification to participants (except creator)
                if (!participantId.equals(creatorId)) {
                    String title = "New Conversation";
                    String message = creator.getUsername() + " added you to a new conversation: " + name;
                    
                    notificationService.sendNotificationToUserAsync(
                        participantId,
                        title,
                        message,
                        NotificationType.NEW_CONVERSATION,
                        creatorId,
                        "{\"conversationId\":\"" + savedConversation.getConversationId() + "\",\"conversationName\":\"" + name + "\"}"
                    );
                }
            }

            return convertToDto(savedConversation);
        } catch (Exception e) {
            log.error("Error creating conversation: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create conversation", e);
        }
    }

    @Override
    public ConversationDto getConversation(String conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        return convertToDto(conversation);
    }

    @Override
    public List<ConversationDto> getUserConversations(String userId) {
        List<Conversation> conversations = conversationRepository.findConversationsByUserId(userId);
        return conversations.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ParticipantDto> getConversationParticipants(String conversationId) {
        List<Participant> participants = participantRepository.findByConversationId(conversationId);
        return participants.stream()
                .map(this::convertParticipantToDto)
                .collect(Collectors.toList());
    }

    @Override
    public void addParticipant(String conversationId, String userId, String addedBy) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        User addedByUser = userRepository.findById(addedBy)
                .orElseThrow(() -> new RuntimeException("Added by user not found"));

        // Check if participant already exists
        if (participantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new RuntimeException("User is already a participant in this conversation");
        }

        Participant participant = Participant.builder()
                .conversationId(conversationId)
                .userId(userId)
                .joinedAt(LocalDateTime.now())
                .build();

        participantRepository.save(participant);

        // Send notification to added user
        String title = "Added to Conversation";
        String message = addedByUser.getName() + " added you to: " + conversation.getName();
        
        notificationService.sendNotificationToUserAsync(
            userId,
            title,
            message,
            NotificationType.NEW_CONVERSATION,
            addedBy,
            "{\"conversationId\":\"" + conversationId + "\",\"conversationName\":\"" + conversation.getName() + "\"}"
        );
    }

    @Override
    public void removeParticipant(String conversationId, String userId, String removedBy) {
        Participant participant = participantRepository.findByConversationIdAndUserId(conversationId, userId);
        if (participant == null) {
            throw new RuntimeException("Participant not found");
        }

        participantRepository.delete(participant);

        // Send notification to removed user
        User removedByUser = userRepository.findById(removedBy)
                .orElseThrow(() -> new RuntimeException("Removed by user not found"));

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        String title = "Removed from Conversation";
        String message = removedByUser.getName() + " removed you from: " + conversation.getName();
        
        notificationService.sendNotificationToUserAsync(
            userId,
            title,
            message,
            NotificationType.SYSTEM_ANNOUNCEMENT,
            removedBy,
            "{\"conversationId\":\"" + conversationId + "\",\"conversationName\":\"" + conversation.getName() + "\"}"
        );
    }

    @Override
    public void updateConversation(String conversationId, String name, String updatedBy) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        conversation.setName(name);
        conversationRepository.save(conversation);

        // Send notification to all participants
        List<Participant> participants = participantRepository.findByConversationId(conversationId);
        User updatedByUser = userRepository.findById(updatedBy)
                .orElseThrow(() -> new RuntimeException("Updated by user not found"));

        for (Participant participant : participants) {
            if (!participant.getUserId().equals(updatedBy)) {
                String title = "Conversation Updated";
                String message = updatedByUser.getName() + " updated the conversation name to: " + name;
                
                notificationService.sendNotificationToUserAsync(
                    participant.getUserId(),
                    title,
                    message,
                    NotificationType.SYSTEM_ANNOUNCEMENT,
                    updatedBy,
                    "{\"conversationId\":\"" + conversationId + "\",\"conversationName\":\"" + name + "\"}"
                );
            }
        }
    }

    @Override
    public void deleteConversation(String conversationId, String deletedBy) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        // Get all participants before deleting
        List<Participant> participants = participantRepository.findByConversationId(conversationId);
        User deletedByUser = userRepository.findById(deletedBy)
                .orElseThrow(() -> new RuntimeException("Deleted by user not found"));

        // Send notification to all participants
        for (Participant participant : participants) {
            if (!participant.getUserId().equals(deletedBy)) {
                String title = "Conversation Deleted";
                String message = deletedByUser.getName() + " deleted the conversation: " + conversation.getName();
                
                notificationService.sendNotificationToUserAsync(
                    participant.getUserId(),
                    title,
                    message,
                    NotificationType.SYSTEM_ANNOUNCEMENT,
                    deletedBy,
                    "{\"conversationId\":\"" + conversationId + "\",\"conversationName\":\"" + conversation.getName() + "\"}"
                );
            }
        }

        // Delete all participants
        participantRepository.deleteAll(participants);

        // Delete the conversation
        conversationRepository.delete(conversation);
    }

    private ConversationDto convertToDto(Conversation conversation) {
        // Get participants for this conversation
        List<Participant> participants = participantRepository.findByConversationId(conversation.getConversationId());
        List<ParticipantDto> participantDtos = participants.stream()
                .map(this::convertParticipantToDto)
                .collect(Collectors.toList());

        // Get last message
        MessageDto lastMessage = null;
        Message lastMessageEntity = messageRepository.findLastMessageByConversationId(conversation.getConversationId());
        if (lastMessageEntity != null) {
            lastMessage = convertMessageToDto(lastMessageEntity);
        }
        
        // Calculate unread count for the current user (this will be calculated per user)
        // For now, we'll set it to 0 and let the frontend calculate it based on user context
        int unreadCount = 0;

        return ConversationDto.builder()
                .conversationId(conversation.getConversationId())
                .name(conversation.getName())
                .type(conversation.getType())
                .creatorId(conversation.getCreatorId())
                .createdAt(conversation.getCreatedAt())
                .participants(participantDtos)
                .lastMessage(lastMessage)
                .unreadCount(unreadCount)
                .build();
    }

    private MessageDto convertMessageToDto(Message message) {
        User sender = userRepository.findById(message.getSenderId())
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        
        return MessageDto.builder()
                .messageId(message.getMessageId())
                .conversationId(message.getConversationId())
                .senderId(message.getSenderId())
                .senderName(sender.getName())
                .content(message.getContent())
                .messageType(message.getMessageType())
                .status("SENT") // Default status for existing messages
                .sentAt(message.getSentAt())
                .attachments(null) // TODO: Add attachments if needed
                .callDuration(message.getCallDuration())
                .callType(message.getCallType())
                .callStatus(message.getCallStatus())
                .build();
    }

    private ParticipantDto convertParticipantToDto(Participant participant) {
        User user = userRepository.findById(participant.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ParticipantDto.builder()
                .participantId(participant.getParticipantId())
                .userId(participant.getUserId())
                .userName(user.getName())
                .userEmail(user.getEmail())
                .conversationId(participant.getConversationId())
                .joinedAt(participant.getJoinedAt().toString())
                .build();
    }
}