package com.btalk.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ParticipantDto {
    private Long participantId;
    private Long userId;
    private String userName;
    private String userPhone;
    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;
}