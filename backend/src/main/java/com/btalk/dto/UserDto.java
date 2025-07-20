package com.btalk.dto;

import lombok.Data;

@Data
public class UserDto {
    private String userId;
    private String email;
    private String name;
    private String profilePhotoUrl;
}