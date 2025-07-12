package com.btalk.dto;

import java.awt.TrayIcon.MessageType;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessage {
	private String content;
	private String sender;
	private MessageType messageType;
	@CreationTimestamp
	private LocalDateTime sendAt;
}
