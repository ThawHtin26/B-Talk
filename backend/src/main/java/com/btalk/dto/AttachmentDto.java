package com.btalk.dto;

import lombok.Data;

@Data
public class AttachmentDto {
    private Long attachmentId;
    private String fileUrl;
    private String fileType;
    private Long fileSizeBytes;
}