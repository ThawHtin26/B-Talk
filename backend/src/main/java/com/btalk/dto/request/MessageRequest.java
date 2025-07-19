package com.btalk.dto.request;

import com.btalk.constants.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageRequest {
    
    @NotBlank(message = "Content is required")
    private String content;
    
    @NotNull(message = "Message type is required")
    private MessageType messageType;
    
    private String attachmentUrl;
    
    private String replyToMessageId;
} 