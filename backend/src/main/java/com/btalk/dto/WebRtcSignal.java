package com.btalk.dto;

import com.btalk.constants.SignalType;

import lombok.Data;

@Data
public class WebRtcSignal {
    private String callId;
    private Long callerId;
    private Long recipientId;
    private Long conversationId;
    private SignalType signalType;
    private Object data;
}