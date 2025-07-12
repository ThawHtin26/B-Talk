package com.btalk.controller;

import java.util.List;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.stereotype.Controller;
import com.btalk.dto.MessageDto;
import com.btalk.dto.NotificationDto;
import com.btalk.entity.Participant;
import com.btalk.repository.ParticipantRepository;
import com.btalk.service.MessageService;

@Controller
public class ChatController {
    
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;
    private final ParticipantRepository participantRepository;
    
    public ChatController(SimpMessagingTemplate messagingTemplate, MessageService messageService,ParticipantRepository participantRepository) {
        this.messagingTemplate = messagingTemplate;
        this.messageService = messageService;
        this.participantRepository = participantRepository;
    }
    
    @MessageMapping("/chat/{conversationId}/send")
    public void sendMessage(@DestinationVariable Long conversationId, @Payload MessageDto messageDto) {
        // Save the message
        MessageDto savedMessage = messageService.sendMessage(messageDto);
        
        // Broadcast to all participants in the conversation
        messagingTemplate.convertAndSend("/topic/conversation/" + conversationId, savedMessage);
        
        // Send notification to each participant (excluding sender)
        List<Participant> participants = participantRepository.findByConversationId(conversationId);
        for (Participant participant : participants) {
            if (!participant.getUserId().equals(savedMessage.getSenderId())) {
                messagingTemplate.convertAndSendToUser(
                    participant.getUserId().toString(),
                    "/queue/notifications",
                    new NotificationDto("new_message", savedMessage)
                );
            }
        }
    }
    
    @SubscribeMapping("/user/queue/notifications")
    public void handleUserSubscription() {
        // This method is just for establishing the subscription
    }
    
    @MessageMapping("/chat/{conversationId}/read")
    public void markMessagesAsRead(@DestinationVariable Long conversationId, @Payload Long userId) {
        messageService.markMessagesAsRead(conversationId, userId);
    }
}