package com.btalk.repository;

import com.btalk.entity.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ParticipantRepository extends JpaRepository<Participant, String> {
    List<Participant> findByConversationId(String conversationId);
    
    @Query("SELECT p FROM Participant p WHERE p.conversationId = :conversationId AND p.userId = :userId")
    Participant findByConversationIdAndUserId(@Param("conversationId") String conversationId, @Param("userId") String userId);
    
    @Modifying
    @Query("UPDATE Participant p SET p.leftAt = CURRENT_TIMESTAMP WHERE p.conversationId = :conversationId AND p.userId = :userId")
    void leaveConversation(@Param("conversationId") String conversationId, @Param("userId") String userId);
    
    boolean existsByConversationIdAndUserId(String conversationId, String userId);
    
    @Query("SELECT p.userId FROM Participant p WHERE p.conversationId = :conversationId")
    List<String> findUserIdsByConversationId(@Param("conversationId") String conversationId);
}