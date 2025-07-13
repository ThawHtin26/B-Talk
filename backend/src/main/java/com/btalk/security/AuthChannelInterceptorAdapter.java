package com.btalk.security;

import com.btalk.utils.JwtTokenUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuthChannelInterceptorAdapter implements ChannelInterceptor {

    private final JwtTokenUtils jwtTokenUtil;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        try {
            StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
            if (accessor != null && accessor.getCommand() != null) {
                if (accessor.getCommand().toString().equals("CONNECT")) {
                    String token = accessor.getFirstNativeHeader("Authorization");
                    if (token != null && token.startsWith("Bearer ")) {
                        token = token.substring(7); // Remove "Bearer "
                        String username = jwtTokenUtil.extractUsername(token);
                        log.info("Authenticated WebSocket user: {}", username);
                        // Optionally set user on accessor if needed
                    }
                }
            }
        } catch (Exception ex) {
            log.error("Error during WebSocket authentication", ex);
        }
        return message;
    }
}
