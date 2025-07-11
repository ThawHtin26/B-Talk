package com.btalk.dto;

import lombok.Data;

@Data
public class UserSearchDto {
    private String query;
    private int limit = 10;
}