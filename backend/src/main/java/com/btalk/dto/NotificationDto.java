package com.btalk.dto;

import lombok.Data;

@Data
public class NotificationDto {
    private String type;
    private Object payload;
    
    public NotificationDto(String type, Object payload) {
        this.type = type;
        this.payload = payload;
    }
}