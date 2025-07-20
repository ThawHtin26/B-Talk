package com.btalk.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SingleMessageReadReceiptDto {
	private String userId;
    private String messageId;
    private LocalDateTime readAt;
}
