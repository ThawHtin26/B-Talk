package com.btalk.service;

import com.btalk.dto.ConversationDto;
import com.btalk.dto.ParticipantDto;
import java.util.List;

public interface ConversationService {
    ConversationDto createConversation(String name, List<String> participantIds, String creatorId);
    ConversationDto getConversation(String conversationId);
    List<ConversationDto> getUserConversations(String userId);
    List<ParticipantDto> getConversationParticipants(String conversationId);
    void addParticipant(String conversationId, String userId, String addedBy);
    void removeParticipant(String conversationId, String userId, String removedBy);
    void updateConversation(String conversationId, String name, String updatedBy);
    void deleteConversation(String conversationId, String deletedBy);
}