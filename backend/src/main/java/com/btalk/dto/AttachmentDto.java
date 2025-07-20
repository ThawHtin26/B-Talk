package com.btalk.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentDto {
    private String attachmentId;
    private String messageId;
    private String fileUrl;
    private String fileType;
    private Long fileSizeBytes;
}