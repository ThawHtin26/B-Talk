package com.btalk.service;

import com.btalk.dto.MessageDto;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;

public interface MessageService {
    MessageDto sendMessage(MessageDto messageDto);
    MessageDto getMessage(Long messageId);
    List<MessageDto> getConversationMessages(Long conversationId, Long userId);
    List<MessageDto> getUnreadMessages(Long conversationId, Long userId);
    List<MessageDto> getNewMessages(Long conversationId, Long userId, LocalDateTime after);
    void markMessagesAsRead(Long conversationId, Long userId);
    void markMessageAsRead(Long messageId, Long userId);
    Page<MessageDto> getConversationMessages(Long conversationId, Long userId, int page, int size);
    Page<MessageDto> getMessagesBefore(Long conversationId, Long userId, LocalDateTime before, int page, int size);
}