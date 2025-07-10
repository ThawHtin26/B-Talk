package com.btalk.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long userId;
    private String phoneNumber;
    private String firstName;
    private String lastName;
    private String profilePhotoUrl;
    private LocalDateTime createdAt;
}