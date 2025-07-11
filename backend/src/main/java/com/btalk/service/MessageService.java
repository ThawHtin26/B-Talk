package com.btalk.service;

import com.btalk.dto.MessageDto;
import com.btalk.entity.Message;

public interface MessageService {
	public Message saveMessage(Long conversationId, String senderPhone, MessageDto messageDto);
	 public void markMessagesAsSeen(Long conversationId, String viewerPhone, Long lastSeenMessageId);
}
