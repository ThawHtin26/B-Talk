package com.btalk.dto;


import lombok.Data;

import java.util.Set;

import com.btalk.constants.SignalType;

@Data
public class CallSignal {
    private Long conversationId;
    private Long callerId;
    private Long recipientId; // For private calls
    private Set<Long> participants; // For group calls
    private SignalType type; // "offer", "answer", "candidate", "ringing", "hangup"
    private Object payload; // SDP offer/answer or ICE candidate
}