package com.btalk.dto;

import lombok.Data;

@Data
public class CallInitiationDto {
    private Long conversationId;
    private Long initiatorId;
    private boolean isVideo;
}