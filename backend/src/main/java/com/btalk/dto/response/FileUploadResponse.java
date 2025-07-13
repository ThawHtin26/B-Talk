package com.btalk.dto.response;

public record FileUploadResponse(
        String filename,
        String url,
        String contentType,
        long size
    ) {}