package com.btalk.dto.response;

import lombok.Data;

@Data
public class AttachmentDto {
    private Long attachmentId;
    private String fileUrl;
    private String fileType;
    private Long fileSizeBytes;
    private String thumbnailUrl;
}