package com.btalk.dto;

import com.btalk.constants.SignalType;
import com.btalk.utils.UuidDeserializer;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;

@Data
public class WebRtcSignal {
    private String callId;
    private String callerId;
    
    @JsonProperty("recipientId")
    @JsonDeserialize(using = UuidDeserializer.class)
    private String recipientId;
    
    private String conversationId;
    private SignalType type; // Changed from signalType to type to match frontend
    private Object payload; // Changed from data to payload to match frontend
    
    // Additional fields for better signal handling
    private String[] participants; // For group calls
}