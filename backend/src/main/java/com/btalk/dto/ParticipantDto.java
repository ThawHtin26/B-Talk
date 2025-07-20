package com.btalk.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantDto {
    private String participantId;
    private String userId;
    private String userName;
    private String userEmail;
    private String conversationId;
    private String joinedAt;
    private String leftAt;
}