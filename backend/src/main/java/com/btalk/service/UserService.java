package com.btalk.service;

import com.btalk.constants.UserStatus;
import com.btalk.dto.UserDto;
import java.util.List;

public interface UserService {
    UserDto getUserById(Long userId);
    UserDto getUserByPhoneNumber(String phoneNumber);
    UserDto updateUserProfile(Long userId, UserDto userDto);
    void updateUserStatus(Long userId, UserStatus status);
    List<UserDto> searchUsersByName(String name);
    List<UserDto> getUsersByIds(List<Long> userIds);
}