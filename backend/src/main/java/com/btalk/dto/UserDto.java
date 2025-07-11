package com.btalk.dto;

import lombok.Data;

@Data
public class UserDto {
    private Long userId;
    private String phoneNumber;
    private String name;
    private String profilePhotoUrl;
}