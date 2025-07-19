package com.btalk.service;

import com.btalk.dto.request.RegisterRequest;
import com.btalk.dto.request.RefreshTokenRequest;
import com.btalk.dto.request.ForgotPasswordRequest;
import com.btalk.dto.request.ResetPasswordRequest;
import com.btalk.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse register(RegisterRequest registerRequest);
    AuthResponse login(String email, String password);
    AuthResponse refreshToken(RefreshTokenRequest refreshTokenRequest);
    void forgotPassword(ForgotPasswordRequest forgotPasswordRequest);
    void resetPassword(ResetPasswordRequest resetPasswordRequest);
}
