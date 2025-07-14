package com.btalk.security;

import com.btalk.utils.JwtTokenUtils;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
public class CustomHandshakeHandler extends DefaultHandshakeHandler {

    private final JwtTokenUtils jwtTokenUtils;

    @Override
    protected Principal determineUser(ServerHttpRequest request,
                                      WebSocketHandler wsHandler,
                                      Map<String, Object> attributes) {
        List<String> authHeaders = request.getHeaders().get("Authorization");

        if (authHeaders != null && !authHeaders.isEmpty()) {
            String authHeader = authHeaders.get(0);
            if (authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    Claims claims = jwtTokenUtils.extractAllClaims(token);
                    String userId = claims.get("userId", String.class);
                    if (userId != null) {
                        System.out.println("WebSocket Principal = userId: " + userId);
                        return () -> userId; //  sets Principal.getName() = userId
                    }
                } catch (Exception e) {
                    System.out.println("Failed to extract claims: " + e.getMessage());
                }
            }
        }
        return null;
    }
}
