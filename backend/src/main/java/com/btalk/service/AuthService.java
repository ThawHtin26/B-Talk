package com.btalk.service;

import com.btalk.dto.AuthResponse;
import com.btalk.dto.RegisterRequest;

public interface AuthService {
    AuthResponse register(RegisterRequest registerRequest);
    AuthResponse login(String phoneNumber, String password);
}
