package com.btalk.service;

import com.btalk.constants.UserStatus;
import com.btalk.dto.UserDto;
import java.util.List;
import java.util.UUID;

public interface UserService {
    UserDto getUserById(UUID userId);
    UserDto getUserByEmail(String email);
    UserDto updateUserProfile(UUID userId, UserDto userDto);
    void updateUserStatus(UUID userId, UserStatus status);
    List<UserDto> searchUsersByName(String name);
    List<UserDto> getUsersByIds(List<UUID> userIds);
}