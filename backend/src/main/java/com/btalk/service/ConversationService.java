package com.btalk.service;

import com.btalk.dto.ConversationDto;
import com.btalk.dto.MessageDto;
import java.util.List;

public interface ConversationService {
    ConversationDto createPrivateConversation(Long creatorId, Long participantId);
    ConversationDto createGroupConversation(Long creatorId, String name, List<Long> participantIds);
    ConversationDto addParticipantsToGroup(Long conversationId, Long adderId, List<Long> participantIds);
    List<ConversationDto> getUserConversations(Long userId);
    ConversationDto getConversationDetails(Long conversationId, Long userId);
    void leaveConversation(Long conversationId, Long userId);
}