package com.btalk.dto;

import com.btalk.constants.ConversationType;
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
public class ConversationDto {
    private UUID conversationId;
    private ConversationType type;
    private String name;
    private UUID creatorId;
    private LocalDateTime createdAt;
    private LocalDateTime lastMessageAt;
    private List<ParticipantDto> participants;
    private MessageDto lastMessage;
    private int unreadCount;
}