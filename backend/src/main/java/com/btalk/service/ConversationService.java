package com.btalk.service;

import com.btalk.dto.ConversationDto;
import com.btalk.dto.ParticipantDto;
import java.util.List;
import java.util.UUID;

public interface ConversationService {
    ConversationDto createConversation(String name, List<UUID> participantIds, UUID creatorId);
    ConversationDto getConversation(UUID conversationId);
    List<ConversationDto> getUserConversations(UUID userId);
    List<ParticipantDto> getConversationParticipants(UUID conversationId);
    void addParticipant(UUID conversationId, UUID userId, UUID addedBy);
    void removeParticipant(UUID conversationId, UUID userId, UUID removedBy);
    void updateConversation(UUID conversationId, String name, UUID updatedBy);
    void deleteConversation(UUID conversationId, UUID deletedBy);
}