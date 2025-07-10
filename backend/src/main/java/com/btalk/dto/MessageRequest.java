package com.btalk.dto;


import com.btalk.constants.MessageType;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MessageRequest {
    @NotNull(message = "Conversation ID is required")
    private Long conversationId;
    
    private String content;
    
    @NotNull(message = "Message type is required")
    private MessageType messageType;
}