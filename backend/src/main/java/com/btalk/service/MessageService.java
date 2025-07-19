package com.btalk.service;

import com.btalk.dto.MessageDto;
import com.btalk.dto.request.MessageRequest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;

public interface MessageService {
    MessageDto sendMessage(UUID conversationId, UUID senderId, MessageRequest request);
    MessageDto getMessage(UUID messageId);
    List<MessageDto> getConversationMessages(UUID conversationId, UUID userId);
    List<MessageDto> getUnreadMessages(UUID conversationId, UUID userId);
    List<MessageDto> getNewMessages(UUID conversationId, UUID userId, LocalDateTime after);
    void markMessagesAsRead(UUID conversationId, UUID userId);
    void markMessageAsRead(UUID messageId, UUID userId);
    Page<MessageDto> getConversationMessages(UUID conversationId, UUID userId, int page, int size);
    Page<MessageDto> getMessagesBefore(UUID conversationId, UUID userId, LocalDateTime before, int page, int size);
    void deleteMessage(UUID messageId, UUID userId);
}