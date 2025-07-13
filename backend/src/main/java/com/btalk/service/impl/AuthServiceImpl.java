package com.btalk.service.impl;


import lombok.RequiredArgsConstructor;

import java.util.stream.Collectors;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.btalk.dto.request.RegisterRequest;
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
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenUtils jwtTokenUtil;

    @Override
    public AuthResponse register(RegisterRequest registerRequest) {
        try {
            // Validate input
            if (StringUtil.isNullOrEmpty(registerRequest.getPhoneNumber()) || 
                StringUtil.isNullOrEmpty(registerRequest.getPassword())) {
                throw new IllegalArgumentException("Phone number and password are required");
            }

            // Check if user exists
            if (userRepository.existsByPhoneNumber(registerRequest.getPhoneNumber())) {
                throw new UserAlreadyExistsException("Phone number already registered");
            }

            // Create and save user with encoded password
            User user = new User();
            user.setPhoneNumber(registerRequest.getPhoneNumber().trim());
            user.setName((registerRequest.getFirstName() + " " + registerRequest.getLastName()).trim());
            user.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
            
            // Ensure password was encoded properly
            if (user.getPasswordHash() == null || user.getPasswordHash().isEmpty()) {
                throw new IllegalStateException("Password encoding failed");
            }

            User savedUser = userRepository.save(user);
            
            // Generate token and build response
            String token = jwtTokenUtil.generateToken(savedUser);

            UserResponse userResponse = UserResponse.builder()
					.userId(user.getUserId())
					.phoneNumber(user.getPhoneNumber())
					.name(user.getName())
					.createdAt(user.getCreatedAt()).build();
            
            return new AuthResponse(token, userResponse);
            
        } catch (UserAlreadyExistsException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Registration failed: " + e.getMessage(), e);
        }
    }
    @Override
    public AuthResponse login(String phoneNumber, String password) {
        // Input validation
        if (StringUtil.isNullOrEmpty(phoneNumber) || StringUtil.isNullOrEmpty(password)) {
            throw new IllegalArgumentException("Phone number and password must not be empty");
        }

        try {
            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    phoneNumber.trim(), 
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
            
            // Generate JWT token
            String token = jwtTokenUtil.generateToken(user);
            
            // Build user response DTO
            UserResponse userResponse = UserResponse.builder()
                .userId(user.getUserId())
                .phoneNumber(user.getPhoneNumber())
                .name(user.getName())
                .createdAt(user.getCreatedAt())
                .build();
            
            return new AuthResponse(token, userResponse);
            
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid credentials", e);
            
        } catch (DisabledException e) {
            throw new DisabledException("User account is disabled", e);
            
        } catch (LockedException e) {
            throw new LockedException("User account is locked", e);
            
        } catch (AuthenticationException e) {
            throw new AuthenticationServiceException("Authentication failed", e);
            
        } catch (Exception e) {
            throw new AuthenticationServiceException("Login processing failed", e);
        }
    }
}

