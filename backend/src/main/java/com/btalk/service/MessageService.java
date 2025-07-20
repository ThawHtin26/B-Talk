package com.btalk.service;

import com.btalk.dto.MessageDto;
import com.btalk.dto.request.MessageRequest;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;

public interface MessageService {
    MessageDto sendMessage(String conversationId, String senderId, MessageRequest request);
    MessageDto getMessage(String messageId);
    List<MessageDto> getConversationMessages(String conversationId, String userId);
    List<MessageDto> getUnreadMessages(String conversationId, String userId);
    List<MessageDto> getNewMessages(String conversationId, String userId, LocalDateTime after);
    void markMessagesAsRead(String conversationId, String userId);
    void markMessageAsRead(String messageId, String userId);
    Page<MessageDto> getConversationMessages(String conversationId, String userId, int page, int size);
    Page<MessageDto> getMessagesBefore(String conversationId, String userId, LocalDateTime before, int page, int size);
    void deleteMessage(String messageId, String userId);
}