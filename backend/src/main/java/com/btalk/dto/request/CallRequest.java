package com.btalk.dto.request;

import com.btalk.constants.CallStatus;
import com.btalk.constants.CallType;
import lombok.Data;
import java.util.UUID;

@Data
public class CallRequest {
    private String callId;
    private UUID callerId;
    private UUID recipientId;
    private UUID conversationId;
    private CallStatus status;
    private CallType callType; 
}