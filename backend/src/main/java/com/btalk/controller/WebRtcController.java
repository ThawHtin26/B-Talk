package com.btalk.controller;

import com.btalk.dto.WebRtcSignal;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class WebRtcController {

    private final SimpMessagingTemplate messagingTemplate;

    public WebRtcController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/call/private/signal")
    public void handlePrivateSignal(@Payload WebRtcSignal signal) {
        // Route the signaling message to the recipient
        messagingTemplate.convertAndSendToUser(
            signal.getRecipientId().toString(),
            "/queue/call/signals",
            signal
        );
    }

    @MessageMapping("/call/group/signal")
    public void handleGroupSignal(@Payload WebRtcSignal signal) {
        // Broadcast the signaling message to all participants in the group
        messagingTemplate.convertAndSend(
            "/topic/call/" + signal.getConversationId() + "/signals",
            signal
        );
    }
}