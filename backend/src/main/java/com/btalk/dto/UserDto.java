package com.btalk.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class UserDto {
    private UUID userId;
    private String email;
    private String name;
    private String profilePhotoUrl;
}