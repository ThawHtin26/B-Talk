package com.btalk.dto;

import lombok.Data;
import java.util.List;
import com.btalk.constants.SignalType;

@Data
public class CallSignal {
    private String conversationId;
    private String callerId;
    private String recipientId; // For private calls
    private List<String> participants; // For group calls (changed from Set to List to match frontend)
    private SignalType type; // "offer", "answer", "candidate", "ringing", "hangup"
    private Object payload; // SDP offer/answer or ICE candidate
    private String callId; // Add callId field to match frontend
}