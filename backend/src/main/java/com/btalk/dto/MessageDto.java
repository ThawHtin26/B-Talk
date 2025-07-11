package com.btalk.dto;

import com.btalk.constants.MessageType;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class MessageDto {
    private Long messageId;
    private Long conversationId;
    private Long senderId;
    private String senderName;
    private String content;
    private MessageType messageType;
    private LocalDateTime sentAt;
    private String status; // "SENT", "DELIVERED", "SEEN"
    private List<AttachmentDto> attachments;
}