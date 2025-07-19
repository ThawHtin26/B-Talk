package com.btalk.repository;

import com.btalk.entity.MessageRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.UUID;

public interface MessageReadRepository extends JpaRepository<MessageRead, UUID> {
    boolean existsByMessageIdAndUserId(UUID messageId, UUID userId);
    
    @Modifying
    @Query("DELETE FROM MessageRead mr WHERE mr.messageId = :messageId")
    void deleteByMessageId(@Param("messageId") UUID messageId);
    
    @Modifying
    @Query("DELETE FROM MessageRead mr WHERE mr.messageId IN (SELECT m.messageId FROM Message m WHERE m.conversationId = :conversationId)")
    void deleteByConversationId(@Param("conversationId") UUID conversationId);
}