package com.btalk.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReadReceiptDto {
	private String userId;
    private String conversationId;
    private LocalDateTime readAt;
}
