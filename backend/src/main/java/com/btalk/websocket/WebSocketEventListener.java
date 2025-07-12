package com.btalk.websocket;

import com.btalk.constants.UserStatus;
import com.btalk.service.UserService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final UserService userService;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Long userId = Long.parseLong(headers.getUser().getName());
        log.info("User connected: {}", userId);
        
        try {
            userService.updateUserStatus(userId, UserStatus.ONLINE);
        } catch (Exception e) {
            log.error("Error updating user status to ONLINE for user {}", userId, e);
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Long userId = Long.parseLong(headers.getUser().getName());
        log.info("User disconnected: {}", userId);
        
        try {
            userService.updateUserStatus(userId, UserStatus.OFFLINE);
        } catch (Exception e) {
            log.error("Error updating user status to OFFLINE for user {}", userId, e);
        }
    }
}