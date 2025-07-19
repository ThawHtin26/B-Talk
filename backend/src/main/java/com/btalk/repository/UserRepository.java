package com.btalk.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.btalk.constants.UserStatus;
import com.btalk.entity.User;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByResetToken(String resetToken);
    
    @Query("SELECT u FROM User u WHERE u.name LIKE %:name%")
    List<User> searchByName(@Param("name") String name);
    
    @Modifying
    @Query("UPDATE User u SET u.status = :status WHERE u.userId = :userId")
    void updateUserStatus(@Param("userId") UUID userId, @Param("status") UserStatus status);
    
    @Query("SELECT u FROM User u WHERE u.userId IN :userIds")
    List<User> findAllByIds(@Param("userIds") List<UUID> userIds);
    
    @Modifying
    @Query("UPDATE User u SET u.resetToken = :resetToken, u.resetTokenExpiry = :resetTokenExpiry WHERE u.email = :email")
    void updateResetToken(@Param("email") String email, @Param("resetToken") String resetToken, @Param("resetTokenExpiry") java.time.LocalDateTime resetTokenExpiry);
    
    @Modifying
    @Query("UPDATE User u SET u.passwordHash = :passwordHash, u.resetToken = NULL, u.resetTokenExpiry = NULL WHERE u.resetToken = :resetToken")
    void updatePasswordByResetToken(@Param("resetToken") String resetToken, @Param("passwordHash") String passwordHash);
}
