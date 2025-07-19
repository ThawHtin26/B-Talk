package com.btalk.security;

import com.btalk.utils.JwtTokenUtils;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
@Slf4j
public class CustomHandshakeHandler extends DefaultHandshakeHandler {

    private final JwtTokenUtils jwtTokenUtils;

    @Override
    protected Principal determineUser(ServerHttpRequest request,
                                      WebSocketHandler wsHandler,
                                      Map<String, Object> attributes) {
        log.info("CustomHandshakeHandler: Processing WebSocket handshake");
        List<String> authHeaders = request.getHeaders().get("Authorization");

        if (authHeaders != null && !authHeaders.isEmpty()) {
            String authHeader = authHeaders.get(0);
            log.info("CustomHandshakeHandler: Authorization header found");
            
            if (authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                log.info("CustomHandshakeHandler: Bearer token found, length: {}", token.length());
                
                try {
                    Claims claims = jwtTokenUtils.extractAllClaims(token);
                    String userId = claims.get("userId", String.class);
                    if (userId != null) {
                        log.info("CustomHandshakeHandler: WebSocket Principal = userId: {}", userId);
                        return () -> userId; //  sets Principal.getName() = userId
                    } else {
                        log.warn("CustomHandshakeHandler: No userId found in token claims");
                    }
                } catch (Exception e) {
                    log.error("CustomHandshakeHandler: Failed to extract claims: {}", e.getMessage());
                }
            } else {
                log.warn("CustomHandshakeHandler: Authorization header doesn't start with 'Bearer '");
            }
        } else {
            log.warn("CustomHandshakeHandler: No Authorization header found");
        }
        
        log.warn("CustomHandshakeHandler: Returning null Principal");
        return null;
    }
}
