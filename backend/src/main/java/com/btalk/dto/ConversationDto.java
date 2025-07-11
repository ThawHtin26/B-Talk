package com.btalk.dto;

import com.btalk.constants.ConversationType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ConversationDto {
    private Long conversationId;
    private ConversationType type;
    private String name;
    private Long creatorId;
    private LocalDateTime createdAt;
    private LocalDateTime lastMessageAt;
    private List<ParticipantDto> participants;
    private MessageDto lastMessage;
    private int unreadCount;
}