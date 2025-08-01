package com.btalk.repository;

import com.btalk.constants.NotificationType;
import com.btalk.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    
    @Query("SELECT n FROM Notification n WHERE n.recipient.userId = :userId AND n.isDeleted = false ORDER BY n.createdAt DESC")
    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(@Param("userId") String userId, Pageable pageable);
    
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.recipient.userId = :userId AND n.isRead = false AND n.isDeleted = false")
    Long countUnreadByRecipientId(@Param("userId") String userId);
    
    @Query("SELECT n FROM Notification n WHERE n.recipient.userId = :userId AND n.isRead = false AND n.isDeleted = false ORDER BY n.createdAt DESC")
    List<Notification> findUnreadByRecipientId(@Param("userId") String userId);
    
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.recipient.userId = :userId AND n.isRead = false")
    void markAllAsRead(@Param("userId") String userId, @Param("readAt") LocalDateTime readAt);
    
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.notificationId = :notificationId")
    void markAsRead(@Param("notificationId") String notificationId, @Param("readAt") LocalDateTime readAt);
    
    @Modifying
    @Query("UPDATE Notification n SET n.isDeleted = true WHERE n.recipient.userId = :userId")
    void deleteAllByRecipientId(@Param("userId") String userId);
    
    @Modifying
    @Query("UPDATE Notification n SET n.isDeleted = true WHERE n.notificationId = :notificationId")
    void deleteById(@Param("notificationId") String notificationId);
    
    @Query("SELECT n FROM Notification n WHERE n.recipient.userId = :userId AND n.type = :type AND n.isDeleted = false ORDER BY n.createdAt DESC")
    List<Notification> findByRecipientIdAndType(@Param("userId") String userId, @Param("type")NotificationType type);
} 