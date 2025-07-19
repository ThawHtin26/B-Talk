package com.btalk.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.btalk.entity.Conversation;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
    @Query("SELECT c FROM Conversation c JOIN Participant p ON c.conversationId = p.conversationId WHERE p.userId = :userId")
    List<Conversation> findConversationsByUserId(@Param("userId") UUID userId);
    
    @Query("SELECT c FROM Conversation c WHERE c.type = 'PRIVATE' AND EXISTS " +
           "(SELECT p1 FROM Participant p1 WHERE p1.conversationId = c.conversationId AND p1.userId = :userId1) " +
           "AND EXISTS (SELECT p2 FROM Participant p2 WHERE p2.conversationId = c.conversationId AND p2.userId = :userId2)")
    Conversation findPrivateConversationBetweenUsers(@Param("userId1") UUID userId1, @Param("userId2") UUID userId2);
}