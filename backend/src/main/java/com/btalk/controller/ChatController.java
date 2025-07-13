package com.btalk.controller;

import java.util.List;
import java.util.Map;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.stereotype.Controller;
import com.btalk.dto.MessageDto;
import com.btalk.dto.NotificationDto;
import com.btalk.dto.response.ApiResponse;
import com.btalk.entity.Participant;
import com.btalk.repository.ParticipantRepository;
import com.btalk.service.ConversationService;
import com.btalk.service.MessageService;

import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;
    private final ParticipantRepository participantRepository;
    private final ConversationService conversationService;

    public ChatController(SimpMessagingTemplate messagingTemplate,
                          MessageService messageService,
                          ParticipantRepository participantRepository,
                          ConversationService conversationService) {
        this.messagingTemplate = messagingTemplate;
        this.messageService = messageService;
        this.participantRepository = participantRepository;
        this.conversationService = conversationService;
    }

    @MessageMapping("/chat/{conversationId}/send")
    public void sendMessage(@DestinationVariable Long conversationId, @Payload MessageDto messageDto) {
        try {
            MessageDto savedMessage = messageService.sendMessage(messageDto);
            List<Long> participantIds = participantRepository.findUserIdsByConversationId(conversationId);

            messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/messages",
                ApiResponse.success("New message received", Map.of(
                    "eventType", "NEW_MESSAGE",
                    "message", savedMessage
                ))
            );

            for (Long participantId : participantIds) {
            	messagingTemplate.convertAndSendToUser(
            		    participantId.toString(),
            		    "/queue/conversation-updates",
            		    ApiResponse.success("Conversation updated", Map.of(
            		        "eventType", "CONVERSATION_UPDATED",
            		        "conversation", conversationService.getConversationById(conversationId)
            		    ))
            		);
            }
        } catch (Exception e) {
            log.error("Failed to send message", e);
            messagingTemplate.convertAndSendToUser(
                messageDto.getSenderId().toString(),
                "/queue/errors",
                ApiResponse.error("Failed to send message: " + e.getMessage())
            );
        }
    }

    @MessageMapping("/chat/{conversationId}/read")
    public void markMessagesAsRead(@DestinationVariable Long conversationId, @Payload Long userId) {
        messageService.markMessagesAsRead(conversationId, userId);
    }
}
