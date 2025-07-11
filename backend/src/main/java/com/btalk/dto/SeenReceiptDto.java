package com.btalk.dto;

public record SeenReceiptDto(
    Long conversationId,
    Long messageId,
    String status // "DELIVERED" or "SEEN"
) {
}