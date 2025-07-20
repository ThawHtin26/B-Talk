package com.btalk.service.impl;

import com.btalk.constants.UserStatus;
import com.btalk.dto.UserDto;
import com.btalk.entity.User;
import com.btalk.exceptions.ResourceNotFoundException;
import com.btalk.repository.UserRepository;
import com.btalk.service.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDto getUserById(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        return convertToDto(user);
    }

    @Override
    public UserDto getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return convertToDto(user);
    }

    @Transactional
    public UserDto updateUserProfile(String userId, UserDto userDto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        
        if (userDto.getName() != null) {
            user.setName(userDto.getName());
        }

        if (userDto.getProfilePhotoUrl() != null) {
            user.setProfilePhotoUrl(userDto.getProfilePhotoUrl());
        }
        
        User updatedUser = userRepository.save(user);
        return convertToDto(updatedUser);
    }

    @Transactional
    public void updateUserStatus(String userId, UserStatus status) {
        userRepository.updateUserStatus(userId, status);
    }

    public List<UserDto> searchUsersByName(String name) {
        return userRepository.searchByName(name).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<UserDto> getUsersByIds(List<String> userIds) {
        return userRepository.findAllByIds(userIds).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private UserDto convertToDto(User user) {
        UserDto dto = new UserDto();
        dto.setUserId(user.getUserId());
        dto.setEmail(user.getEmail());
        dto.setName(user.getName());
        dto.setProfilePhotoUrl(user.getProfilePhotoUrl());
        return dto;
    }
}