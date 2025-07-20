package com.btalk.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import com.btalk.constants.MessageType;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String messageId;

    @Column(name = "conversation_id", nullable = false)
    private String conversationId;

    @Column(name = "sender_id", nullable = false)
    private String senderId;

    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageType messageType;

    @CreationTimestamp
    private LocalDateTime sentAt;

    @Column(name = "call_duration")
    private Integer callDuration; // Duration in seconds for call messages

    @Column(name = "call_type")
    @Enumerated(EnumType.STRING)
    private com.btalk.constants.CallType callType; // Type of call for call messages

    @Column(name = "call_status")
    private String callStatus; // Status of the call (MISSED, ENDED, REJECTED)
}