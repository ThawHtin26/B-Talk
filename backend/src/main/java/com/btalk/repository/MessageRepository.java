package com.btalk.repository;

import com.btalk.entity.Message;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByConversationIdOrderBySentAtDesc(UUID conversationId);
    
    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId ORDER BY m.sentAt DESC LIMIT 1")
    Message findLastMessageByConversationId(@Param("conversationId") UUID conversationId);
    
    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversationId = :conversationId AND m.senderId != :userId AND " +
           "NOT EXISTS (SELECT r FROM MessageRead r WHERE r.messageId = m.messageId AND r.userId = :userId)")
    int countUnreadMessages(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);
    
    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId AND m.senderId != :userId AND " +
           "NOT EXISTS (SELECT r FROM MessageRead r WHERE r.messageId = m.messageId AND r.userId = :userId)")
    List<Message> findUnreadMessages(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);
    
    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId AND m.senderId != :userId AND " +
           "m.sentAt > :after AND " +
           "NOT EXISTS (SELECT r FROM MessageRead r WHERE r.messageId = m.messageId AND r.userId = :userId)")
    List<Message> findUnreadMessagesAfter(@Param("conversationId") UUID conversationId, 
                                         @Param("userId") UUID userId, 
                                         @Param("after") LocalDateTime after);
    
    Optional<Message> findTopByConversationIdOrderBySentAtDesc(UUID conversationId);
    
    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId ORDER BY m.sentAt DESC")
    Page<Message> findByConversationId(@Param("conversationId") UUID conversationId, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId AND m.sentAt <= :before ORDER BY m.sentAt DESC")
   Page<Message> findMessagesBefore(
            @Param("conversationId") UUID conversationId,
            @Param("before") LocalDateTime before,
            Pageable pageable);
}