package com.btalk.repository;

import com.btalk.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByConversationIdOrderBySentAtDesc(Long conversationId);
    
    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId ORDER BY m.sentAt DESC LIMIT 1")
    Message findLastMessageByConversationId(@Param("conversationId") Long conversationId);
    
    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversationId = :conversationId AND m.senderId != :userId AND " +
           "NOT EXISTS (SELECT r FROM MessageRead r WHERE r.messageId = m.messageId AND r.userId = :userId)")
    int countUnreadMessages(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
    
    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId AND m.senderId != :userId AND " +
           "NOT EXISTS (SELECT r FROM MessageRead r WHERE r.messageId = m.messageId AND r.userId = :userId)")
    List<Message> findUnreadMessages(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
    
    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId AND m.senderId != :userId AND " +
           "m.sentAt > :after AND " +
           "NOT EXISTS (SELECT r FROM MessageRead r WHERE r.messageId = m.messageId AND r.userId = :userId)")
    List<Message> findUnreadMessagesAfter(@Param("conversationId") Long conversationId, 
                                         @Param("userId") Long userId, 
                                         @Param("after") LocalDateTime after);
    
    Optional<Message> findTopByConversationIdOrderBySentAtDesc(Long conversationId);
}