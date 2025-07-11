package com.btalk.service;

import com.btalk.dto.request.RegisterRequest;
import com.btalk.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse register(RegisterRequest registerRequest);
    AuthResponse login(String phoneNumber, String password);
}
