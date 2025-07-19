package com.btalk.security;

import com.btalk.entity.User;

import com.btalk.repository.UserRepository;
import com.btalk.utils.JwtTokenUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Optional;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(0)
public class AuthChannelInterceptorAdapter implements ChannelInterceptor {

    private final JwtTokenUtils jwtTokenUtil;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            log.info("Processing WebSocket CONNECT request");
            String token = accessor.getFirstNativeHeader("Authorization");

            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
                log.info("Token found, length: {}", token.length());

                try {
                    String email = jwtTokenUtil.extractUsername(token);
                    log.info("Extracted email from token: {}", email);
                    Optional<User> optionalUser = userRepository.findByEmail(email);

                    if (optionalUser.isPresent()) {
                        String userId = optionalUser.get().getUserId().toString();

                        // Set custom Principal here
                        accessor.setUser(new StompPrincipal(userId.toString()));

                        log.info("WebSocket connected successfully for userId={}", userId);
                    } else {
                        log.warn("No user found for email: {}", email);
                    }
                } catch (Exception e) {
                    log.error("Token parsing failed: {}", e.getMessage());
                }
            } else {
                log.warn("No valid Authorization header found in WebSocket CONNECT");
            }
        }

        return message;
    }


}
