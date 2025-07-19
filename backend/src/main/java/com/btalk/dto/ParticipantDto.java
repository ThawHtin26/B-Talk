package com.btalk.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantDto {
    private UUID participantId;
    private UUID userId;
    private String userName;
    private String userEmail;
    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;
}