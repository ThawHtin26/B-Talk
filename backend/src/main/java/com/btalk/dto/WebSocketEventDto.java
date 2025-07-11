package com.btalk.dto;

import lombok.Data;

@Data
public class WebSocketEventDto {
    private String type; // "NEW_MESSAGE", "MESSAGE_SEEN", "GROUP_UPDATE", etc.
    private Object payload;
}