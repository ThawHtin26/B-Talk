package com.btalk.dto;

import com.btalk.constants.SignalType;
import lombok.Data;
import java.util.UUID;

@Data
public class WebRtcSignal {
    private String callId;
    private UUID callerId;
    private UUID recipientId;
    private UUID conversationId;
    private SignalType signalType;
    private Object data;
}