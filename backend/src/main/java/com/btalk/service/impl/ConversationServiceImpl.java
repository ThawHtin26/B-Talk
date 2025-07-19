package com.btalk.service.impl;

import com.btalk.constants.ConversationType;
import com.btalk.dto.ConversationDto;
import com.btalk.dto.ParticipantDto;
import com.btalk.entity.Conversation;
import com.btalk.entity.Participant;
import com.btalk.entity.User;
import com.btalk.entity.Notification.NotificationType;
import com.btalk.repository.ConversationRepository;
import com.btalk.repository.ParticipantRepository;
import com.btalk.repository.UserRepository;
import com.btalk.service.ConversationService;
import com.btalk.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationServiceImpl implements ConversationService {

    private final ConversationRepository conversationRepository;
    private final ParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Override
    public ConversationDto createConversation(String name, List<UUID> participantIds, UUID creatorId) {
        try {
            User creator = userRepository.findById(creatorId)
                    .orElseThrow(() -> new RuntimeException("Creator not found"));
            
            Conversation conversation = Conversation.builder()
                    .name(name)
                    .creatorId(creator.getUserId())
                    .createdAt(LocalDateTime.now())
                    .type(participantIds.size() < 2 ? ConversationType.PRIVATE: ConversationType.GROUP)
                    .build();

            Conversation savedConversation = conversationRepository.save(conversation);

            // Add participants
            for (UUID participantId : participantIds) {
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
    public ConversationDto getConversation(UUID conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        return convertToDto(conversation);
    }

    @Override
    public List<ConversationDto> getUserConversations(UUID userId) {
        List<Conversation> conversations = conversationRepository.findConversationsByUserId(userId);
        return conversations.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ParticipantDto> getConversationParticipants(UUID conversationId) {
        List<Participant> participants = participantRepository.findByConversationId(conversationId);
        return participants.stream()
                .map(this::convertParticipantToDto)
                .collect(Collectors.toList());
    }

    @Override
    public void addParticipant(UUID conversationId, UUID userId, UUID addedBy) {
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
    public void removeParticipant(UUID conversationId, UUID userId, UUID removedBy) {
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
    public void updateConversation(UUID conversationId, String name, UUID updatedBy) {
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
    public void deleteConversation(UUID conversationId, UUID deletedBy) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        // Delete all participants first
        List<Participant> participants = participantRepository.findByConversationId(conversationId);
        participantRepository.deleteAll(participants);

        // Delete the conversation
        conversationRepository.delete(conversation);

        // Send notification to all participants
        User deletedByUser = userRepository.findById(deletedBy)
                .orElseThrow(() -> new RuntimeException("Deleted by user not found"));

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
    }

    private ConversationDto convertToDto(Conversation conversation) {
        // Get participants for this conversation
        List<ParticipantDto> participants = getConversationParticipants(conversation.getConversationId());
        
        return ConversationDto.builder()
                .conversationId(conversation.getConversationId())
                .type(conversation.getType())
                .name(conversation.getName())
                .creatorId(conversation.getCreatorId())
                .createdAt(conversation.getCreatedAt())
                .participants(participants)
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
                .joinedAt(participant.getJoinedAt())
                .leftAt(participant.getLeftAt())
                .build();
    }
}