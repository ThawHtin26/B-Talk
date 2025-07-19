package com.btalk.dto;

import com.btalk.constants.MessageType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageDto {
    private UUID messageId;
    private UUID conversationId;
    private UUID senderId;
    private String senderName;
    private String senderAvatar;
    private String content;
    private MessageType messageType;
    private LocalDateTime sentAt;
    private String status; // "SENT", "DELIVERED", "SEEN"
    private List<AttachmentDto> attachments;
}