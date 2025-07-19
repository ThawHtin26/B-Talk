package com.btalk.service.impl;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.btalk.dto.request.RegisterRequest;
import com.btalk.dto.request.RefreshTokenRequest;
import com.btalk.dto.request.ForgotPasswordRequest;
import com.btalk.dto.request.ResetPasswordRequest;
import com.btalk.dto.response.AuthResponse;
import com.btalk.dto.response.UserResponse;
import com.btalk.entity.User;
import com.btalk.exceptions.UserAlreadyExistsException;
import com.btalk.repository.UserRepository;
import com.btalk.service.AuthService;
import com.btalk.utils.JwtTokenUtils;

import ch.qos.logback.core.util.StringUtil;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenUtils jwtTokenUtil;

    @Override
    public AuthResponse register(RegisterRequest registerRequest) {
        try {
            log.info("Starting registration for email: {}", registerRequest.getEmail());
            
            // Validate input
            if (StringUtil.isNullOrEmpty(registerRequest.getEmail()) || 
                StringUtil.isNullOrEmpty(registerRequest.getPassword())) {
                throw new IllegalArgumentException("Email and password are required");
            }

            // Check if user exists
            if (userRepository.existsByEmail(registerRequest.getEmail())) {
                throw new UserAlreadyExistsException("Email already registered");
            }

            // Create and save user with encoded password
            User user = new User();
            user.setEmail(registerRequest.getEmail().trim().toLowerCase());
            user.setName((registerRequest.getFirstName() + " " + registerRequest.getLastName()).trim());
            user.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
            
            // Ensure password was encoded properly
            if (user.getPasswordHash() == null || user.getPasswordHash().isEmpty()) {
                throw new IllegalStateException("Password encoding failed");
            }

            User savedUser = userRepository.save(user);
            log.info("User registered successfully: {}", savedUser.getEmail());
            
            // Generate tokens and build response
            String accessToken = jwtTokenUtil.generateToken(savedUser);
            String refreshToken = jwtTokenUtil.generateRefreshToken(savedUser);

            UserResponse userResponse = UserResponse.builder()
                    .userId(user.getUserId().toString())
                    .email(user.getEmail())
                    .name(user.getName())
                    .createdAt(user.getCreatedAt()).build();
            
            return AuthResponse.builder()
                    .token(accessToken)
                    .refreshToken(refreshToken)
                    .user(userResponse)
                    .build();
            
        } catch (UserAlreadyExistsException e) {
            log.warn("Registration failed - user already exists: {}", registerRequest.getEmail());
            throw e;
        } catch (Exception e) {
            log.error("Registration failed for email: {}", registerRequest.getEmail(), e);
            throw new RuntimeException("Registration failed: " + e.getMessage(), e);
        }
    }
    
    @Override
    public AuthResponse login(String email, String password) {
        log.info("Starting login for email: {}", email);
        
        // Input validation
        if (StringUtil.isNullOrEmpty(email) || StringUtil.isNullOrEmpty(password)) {
            throw new IllegalArgumentException("Email and password must not be empty");
        }

        try {
            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    email.trim().toLowerCase(), 
                    password.trim()
                )
            );

            // Set authentication in security context
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Extract user details
            Object principal = authentication.getPrincipal();
            if (!(principal instanceof UserDetails)) {
                throw new AuthenticationServiceException("Invalid authentication principal type");
            }

            User user = (User) principal;
            
            // Generate JWT tokens
            String accessToken = jwtTokenUtil.generateToken(user);
            String refreshToken = jwtTokenUtil.generateRefreshToken(user);
            
            log.info("User logged in successfully: {}", user.getEmail());
            
            // Build user response DTO
            UserResponse userResponse = UserResponse.builder()
                .userId(user.getUserId().toString())
                .email(user.getEmail())
                .name(user.getName())
                .createdAt(user.getCreatedAt())
                .build();
            
            return AuthResponse.builder()
                    .token(accessToken)
                    .refreshToken(refreshToken)
                    .user(userResponse)
                    .build();
            
        } catch (BadCredentialsException e) {
            log.warn("Login failed - invalid credentials for email: {}", email);
            throw new BadCredentialsException("Invalid credentials", e);
            
        } catch (DisabledException e) {
            log.warn("Login failed - disabled account for email: {}", email);
            throw new DisabledException("User account is disabled", e);
            
        } catch (LockedException e) {
            log.warn("Login failed - locked account for email: {}", email);
            throw new LockedException("User account is locked", e);
            
        } catch (AuthenticationException e) {
            log.warn("Login failed - authentication error for email: {}", email);
            throw new AuthenticationServiceException("Authentication failed", e);
            
        } catch (Exception e) {
            log.error("Login processing failed for email: {}", email, e);
            throw new AuthenticationServiceException("Login processing failed", e);
        }
    }

    @Override
    public AuthResponse refreshToken(RefreshTokenRequest refreshTokenRequest) {
        try {
            log.info("Processing refresh token request");
            
            if (StringUtil.isNullOrEmpty(refreshTokenRequest.getRefreshToken())) {
                throw new IllegalArgumentException("Refresh token is required");
            }

            String refreshToken = refreshTokenRequest.getRefreshToken();
            
            // Extract username from refresh token
            String email = jwtTokenUtil.extractUsername(refreshToken);
            
            // Find user
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            
            // Validate refresh token
            if (!jwtTokenUtil.validateRefreshToken(refreshToken, user)) {
                throw new IllegalArgumentException("Invalid refresh token");
            }
            
            // Generate new tokens
            String newAccessToken = jwtTokenUtil.generateToken(user);
            String newRefreshToken = jwtTokenUtil.generateRefreshToken(user);
            
            log.info("Tokens refreshed successfully for user: {}", email);
            
            // Build user response DTO
            UserResponse userResponse = UserResponse.builder()
                .userId(user.getUserId().toString())
                .email(user.getEmail())
                .name(user.getName())
                .createdAt(user.getCreatedAt())
                .build();
            
            return AuthResponse.builder()
                    .token(newAccessToken)
                    .refreshToken(newRefreshToken)
                    .user(userResponse)
                    .build();
                    
        } catch (Exception e) {
            log.error("Token refresh failed", e);
            throw new RuntimeException("Token refresh failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void forgotPassword(ForgotPasswordRequest forgotPasswordRequest) {
        try {
            log.info("Processing forgot password request for email: {}", forgotPasswordRequest.getEmail());
            
            String email = forgotPasswordRequest.getEmail().trim().toLowerCase();
            
            // Find user
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            
            // Generate reset token
            String resetToken = UUID.randomUUID().toString();
            LocalDateTime resetTokenExpiry = LocalDateTime.now().plusHours(24); // 24 hours expiry
            
            // Update user with reset token
            userRepository.updateResetToken(email, resetToken, resetTokenExpiry);
            
            log.info("Reset token generated for user: {}", email);
            
            // TODO: Send email with reset link
            // For now, we'll just log the token (in production, send via email)
            log.info("Reset token for {}: {}", email, resetToken);
            
        } catch (Exception e) {
            log.error("Forgot password failed for email: {}", forgotPasswordRequest.getEmail(), e);
            throw new RuntimeException("Forgot password failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void resetPassword(ResetPasswordRequest resetPasswordRequest) {
        try {
            log.info("Processing reset password request");
            
            String resetToken = resetPasswordRequest.getResetToken();
            String newPassword = resetPasswordRequest.getNewPassword();
            
            // Find user by reset token
            User user = userRepository.findByResetToken(resetToken)
                    .orElseThrow(() -> new IllegalArgumentException("Invalid reset token"));
            
            // Check if token is expired
            if (user.getResetTokenExpiry() != null && user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("Reset token has expired");
            }
            
            // Encode new password
            String encodedPassword = passwordEncoder.encode(newPassword);
            
            // Update password and clear reset token
            userRepository.updatePasswordByResetToken(resetToken, encodedPassword);
            
            log.info("Password reset successfully for user: {}", user.getEmail());
            
        } catch (Exception e) {
            log.error("Password reset failed", e);
            throw new RuntimeException("Password reset failed: " + e.getMessage(), e);
        }
    }
}

