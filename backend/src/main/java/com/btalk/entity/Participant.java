package com.btalk.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "participants")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Participant {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID participantId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @CreationTimestamp
    private LocalDateTime joinedAt;

    private LocalDateTime leftAt;
}