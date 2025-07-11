package com.btalk.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import com.btalk.constants.ConversationType;

import java.time.LocalDateTime;

@Entity
@Table(name = "conversations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Conversation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long conversationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConversationType type;

    private String name;

    @Column(name = "creator_id", nullable = false)
    private Long creatorId;

    @CreationTimestamp
    private LocalDateTime createdAt;
}