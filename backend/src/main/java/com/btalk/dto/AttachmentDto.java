package com.btalk.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class AttachmentDto {
    private UUID attachmentId;
    private String fileUrl;
    private String fileType;
    private Long fileSizeBytes;
}