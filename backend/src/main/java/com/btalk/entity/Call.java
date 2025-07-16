package com.btalk.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

import com.btalk.constants.CallStatus;
import com.btalk.constants.CallType;

@Entity
@Table(name = "calls")
@Data
public class Call {

    @Id
    @Column(name = "call_id", nullable = false, updatable = false)
    private String callId;

    @Column(name = "caller_id", nullable = false)
    private Long callerId;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "call_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private CallType callType; // e.g., "AUDIO" or "VIDEO"

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private CallStatus status; // e.g., "RINGING", "ACCEPTED", "REJECTED", "ENDED"
  
}

