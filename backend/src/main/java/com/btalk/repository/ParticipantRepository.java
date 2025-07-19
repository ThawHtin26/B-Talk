package com.btalk.repository;

import com.btalk.entity.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<Participant, UUID> {
    List<Participant> findByConversationId(UUID conversationId);
    
    @Query("SELECT p FROM Participant p WHERE p.conversationId = :conversationId AND p.userId = :userId")
    Participant findByConversationIdAndUserId(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);
    
    @Modifying
    @Query("UPDATE Participant p SET p.leftAt = CURRENT_TIMESTAMP WHERE p.conversationId = :conversationId AND p.userId = :userId")
    void leaveConversation(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);
    
    boolean existsByConversationIdAndUserId(UUID conversationId, UUID userId);
    
    @Query("SELECT p.userId FROM Participant p WHERE p.conversationId = :conversationId")
    List<UUID> findUserIdsByConversationId(@Param("conversationId") UUID conversationId);
}