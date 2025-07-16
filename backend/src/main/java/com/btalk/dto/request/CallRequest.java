package com.btalk.dto.request;


import com.btalk.constants.CallStatus;
import com.btalk.constants.CallType;

import lombok.Data;

@Data
public class CallRequest {
    private String callId;
    private Long callerId;
    private Long recipientId;
    private Long conversationId;
    private CallStatus status;
    private CallType callType; 
}