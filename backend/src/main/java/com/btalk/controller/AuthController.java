package com.btalk.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.btalk.dto.request.LoginRequest;
import com.btalk.dto.request.RegisterRequest;
import com.btalk.dto.request.RefreshTokenRequest;
import com.btalk.dto.request.ForgotPasswordRequest;
import com.btalk.dto.request.ResetPasswordRequest;
import com.btalk.dto.response.ApiResponse;
import com.btalk.dto.response.AuthResponse;
import com.btalk.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            log.info("Registration request received for email: {}", registerRequest.getEmail());
            AuthResponse response = authService.register(registerRequest);
            log.info("Registration successful for email: {}", registerRequest.getEmail());
            return ResponseEntity.ok(new ApiResponse(true, "User registered successfully", response));
        } catch (Exception e) {
            log.error("Registration failed for email: {}", registerRequest.getEmail(), e);
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage(), null));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            log.info("Login request received for email: {}", loginRequest.getEmail());
            AuthResponse response = authService.login(loginRequest.getEmail(), loginRequest.getPassword());
            log.info("Login successful for email: {}", loginRequest.getEmail());
            return ResponseEntity.ok(new ApiResponse(true, "Login successful", response));
        } catch (Exception e) {
            log.error("Login failed for email: {}", loginRequest.getEmail(), e);
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage(), null));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@Valid @RequestBody RefreshTokenRequest refreshTokenRequest) {
        try {
            log.info("Refresh token request received");
            AuthResponse response = authService.refreshToken(refreshTokenRequest);
            log.info("Token refresh successful");
            return ResponseEntity.ok(new ApiResponse(true, "Token refreshed successfully", response));
        } catch (Exception e) {
            log.error("Token refresh failed", e);
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage(), null));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest forgotPasswordRequest) {
        try {
            log.info("Forgot password request received for email: {}", forgotPasswordRequest.getEmail());
            authService.forgotPassword(forgotPasswordRequest);
            log.info("Forgot password successful for email: {}", forgotPasswordRequest.getEmail());
            return ResponseEntity.ok(new ApiResponse(true, "Password reset email sent", null));
        } catch (Exception e) {
            log.error("Forgot password failed for email: {}", forgotPasswordRequest.getEmail(), e);
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage(), null));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest resetPasswordRequest) {
        try {
            log.info("Reset password request received");
            authService.resetPassword(resetPasswordRequest);
            log.info("Password reset successful");
            return ResponseEntity.ok(new ApiResponse(true, "Password reset successfully", null));
        } catch (Exception e) {
            log.error("Password reset failed", e);
            return ResponseEntity.badRequest().body(new ApiResponse(false, e.getMessage(), null));
        }
    }
}