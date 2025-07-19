package com.btalk.dto;

import lombok.Data;
import java.util.Set;
import java.util.UUID;
import com.btalk.constants.SignalType;

@Data
public class CallSignal {
    private UUID conversationId;
    private UUID callerId;
    private UUID recipientId; // For private calls
    private Set<UUID> participants; // For group calls
    private SignalType type; // "offer", "answer", "candidate", "ringing", "hangup"
    private Object payload; // SDP offer/answer or ICE candidate
}