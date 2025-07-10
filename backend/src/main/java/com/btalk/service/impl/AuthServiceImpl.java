package com.btalk.service.impl;


import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.btalk.dto.AuthResponse;
import com.btalk.dto.RegisterRequest;
import com.btalk.dto.UserResponse;
import com.btalk.entity.User;
import com.btalk.exceptions.UserAlreadyExistsException;
import com.btalk.repository.UserRepository;
import com.btalk.service.AuthService;
import com.btalk.utils.JwtTokenUtil;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenUtil jwtTokenUtil;

    @Override
    public AuthResponse register(RegisterRequest registerRequest) {
        try {
            if (userRepository.existsByPhoneNumber(registerRequest.getPhoneNumber())) {
                throw new UserAlreadyExistsException("Phone number already in use");
            }

            User user = new User();
            user.setPhoneNumber(registerRequest.getPhoneNumber());
            user.setName(registerRequest.getFirstName()+" "+registerRequest.getLastName());
            user.setLastName(registerRequest.getLastName());
            user.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));

            User savedUser = userRepository.save(user);
            String token = jwtTokenUtil.generateToken(savedUser);
            
            UserResponse userResponse = UserResponse.builder()
					.userId(user.getUserId())
					.phoneNumber(user.getPhoneNumber())
					.name(user.getName())
					.createdAt(user.getCreatedAt()).build();

            return new AuthResponse(token,userResponse);
        } catch (UserAlreadyExistsException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to register user: " + e.getMessage(), e);
        }
    }

    @Override
    public AuthResponse login(String phoneNumber, String password) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(phoneNumber, password)
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            Object principal = authentication.getPrincipal();
            if (!(principal instanceof User)) {
                throw new UsernameNotFoundException("Invalid user details");
            }

            User user = (User) principal;
            String token = jwtTokenUtil.generateToken(user);  
            UserResponse userResponse = UserResponse.builder()
            					.userId(user.getUserId())
            					.phoneNumber(user.getPhoneNumber())
            					.name(user.getName())
            					.createdAt(user.getCreatedAt()).build();
            					   
            return new AuthResponse(token,userResponse);
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid phone number or password", e);
        } catch (Exception e) {
            throw new RuntimeException("Login failed: " + e.getMessage(), e);
        }
    }
}

