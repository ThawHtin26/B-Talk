package com.btalk.controller;

import com.btalk.dto.UserDto;
import com.btalk.dto.response.ApiResponse;
import com.btalk.service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/search")
    public ApiResponse<List<UserDto>> searchUsers(@RequestParam String query) {
        try {
            List<UserDto> users = userService.searchUsersByName(query);
            return ApiResponse.success("Users retrieved successfully", users);
        } catch (Exception e) {
            return ApiResponse.error("Failed to search users: " + e.getMessage());
        }
    }

    @GetMapping("/batch")
    public ApiResponse<List<UserDto>> getUsersByIds(@RequestParam List<String> ids) {
        try {
            List<UserDto> users = userService.getUsersByIds(ids);
            return ApiResponse.success("Users retrieved successfully", users);
        } catch (Exception e) {
            return ApiResponse.error("Failed to get users: " + e.getMessage());
        }
    }
}