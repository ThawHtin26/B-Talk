package com.btalk.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReadReceiptDto {
	private UUID userId;
    private UUID conversationId;
    private LocalDateTime readAt;
}
