package com.btalk.service;

import com.btalk.constants.UserStatus;
import com.btalk.dto.UserDto;
import java.util.List;

public interface UserService {
    UserDto getUserById(String userId);
    UserDto getUserByEmail(String email);
    UserDto updateUserProfile(String userId, UserDto userDto);
    void updateUserStatus(String userId, UserStatus status);
    List<UserDto> searchUsersByName(String name);
    List<UserDto> getUsersByIds(List<String> userIds);
}