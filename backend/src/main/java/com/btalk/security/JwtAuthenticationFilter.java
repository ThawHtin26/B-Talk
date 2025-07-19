package com.btalk.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.btalk.entity.User;
import com.btalk.repository.UserRepository;
import com.btalk.utils.JwtTokenUtils;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenUtils jwtTokenUtil;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            final String authHeader = request.getHeader("Authorization");
            final String jwt;
            final String email;

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                filterChain.doFilter(request, response);
                return;
            }

            jwt = authHeader.substring(7);
            
            try {
                email = jwtTokenUtil.extractUsername(jwt);
                String tokenType = jwtTokenUtil.extractTokenType(jwt);
                
                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    User user = userRepository.findByEmail(email)
                            .orElse(null);

                    if (user != null && jwtTokenUtil.validateToken(jwt, user)) {
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                user,
                                null,
                                user.getAuthorities()
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        log.debug("User {} authenticated successfully", email);
                    } else {
                        log.warn("Invalid token for user: {}", email);
                    }
                }
            } catch (Exception e) {
                log.warn("JWT token validation failed: {}", e.getMessage());
                // Don't throw exception, just continue without authentication
            }
        } catch (Exception e) {
            log.error("Error processing JWT authentication", e);
        }

        filterChain.doFilter(request, response);
    }
}
