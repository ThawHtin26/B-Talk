package com.btalk.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReadReceiptDto {
	private Long userId;
    private Long conversationId;
    private LocalDateTime readAt;
}
