package com.btalk.dto;

import com.btalk.constants.MessageType;
import com.btalk.constants.CallType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageDto {
    private String messageId;
    private String conversationId;
    private String senderId;
    private String senderName;
    private String senderAvatar;
    private String content;
    private MessageType messageType;
    private LocalDateTime sentAt;
    private String status; // "SENT", "DELIVERED", "SEEN"
    private List<AttachmentDto> attachments;
    private Integer callDuration;
    private CallType callType;
    private String callStatus;
}