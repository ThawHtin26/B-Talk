package com.btalk.dto.request;

import com.btalk.constants.CallStatus;
import com.btalk.constants.CallType;
import com.btalk.utils.UuidDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;

@Data
public class CallRequest {
    @JsonDeserialize(using = UuidDeserializer.class)
    private String callId;
    
    @JsonDeserialize(using = UuidDeserializer.class)
    private String callerId;
    
    @JsonDeserialize(using = UuidDeserializer.class)
    private String recipientId;
    
    @JsonDeserialize(using = UuidDeserializer.class)
    private String conversationId;
    
    private CallStatus status;
    private CallType callType; 
}