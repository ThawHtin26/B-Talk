package com.btalk.service;

import com.btalk.dto.MessageDto;
import java.time.LocalDateTime;
import java.util.List;

public interface MessageService {
    MessageDto sendMessage(MessageDto messageDto);
    MessageDto getMessage(Long messageId);
    List<MessageDto> getConversationMessages(Long conversationId, Long userId);
    List<MessageDto> getUnreadMessages(Long conversationId, Long userId);
    List<MessageDto> getNewMessages(Long conversationId, Long userId, LocalDateTime after);
    void markMessagesAsRead(Long conversationId, Long userId);
    void markMessageAsRead(Long messageId, Long userId);
}