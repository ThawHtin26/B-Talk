package com.btalk.websocket;

import com.btalk.constants.UserStatus;

import com.btalk.dto.ConversationDto;
import com.btalk.service.ConversationService;
import com.btalk.service.UserService;

import java.security.Principal;
import java.util.List;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final UserService userService;
    private final ConversationService conversationService;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Principal user = headers.getUser();

        if (user != null) {
            try {
                String userId = user.getName();
                log.info("User connected: {}", userId);
                userService.updateUserStatus(userId, UserStatus.ONLINE);
            } catch (Exception e) {
                log.error("Failed to update user status to ONLINE", e);
            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        if (headers == null) {
            log.warn("Received disconnect event with null headers");
            return;
        }

        Principal user = headers.getUser();
        if (user == null) {
            log.warn("Disconnect event has no authenticated user");
            return;
        }

        try {
            String userId = user.getName();
            log.info("User disconnected: {}", userId);
            
            // Update user status
            userService.updateUserStatus(userId, UserStatus.OFFLINE);
            
            // Notify all active conversations that user went offline
            try {
                List<ConversationDto> conversations = conversationService.getUserConversations(userId);
                if (conversations != null && !conversations.isEmpty()) {
                    for (ConversationDto conversation : conversations) {
                        try {
                            messagingTemplate.convertAndSend(
                                "/topic/conversation/" + conversation.getConversationId() + "/user-offline",
                                userId
                            );
                        } catch (Exception e) {
                            log.error("Failed to send offline notification for conversation {}: {}", 
                                    conversation.getConversationId(), e.getMessage());
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Failed to get user conversations for offline notifications: {}", e.getMessage());
            }
        } catch (Exception e) {
            log.error("Error handling disconnect event: {}", e.getMessage());
        }
    }
    
    @EventListener
    public void handleSessionConnected(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        Principal user = accessor.getUser(); // must not be null
        log.info("WebSocket connected: {}", user != null ? user.getName() : "null");
    }


}