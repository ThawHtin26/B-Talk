package com.btalk.utils;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.btalk.dto.AttachmentDto;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Component
public class FileStorageUtils {

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${file.base-url}")
    private String baseUrl;

    public AttachmentDto storeFile(MultipartFile file) throws IOException {
        // Extract file extension
        String originalFilename = file.getOriginalFilename();
        String extension = "";

        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        // Generate unique filename
        String storedFilename = UUID.randomUUID() + extension;

        // Create the target path
        Path targetPath = Paths.get(uploadDir).resolve(storedFilename).normalize();

        // Ensure directory exists
        Files.createDirectories(targetPath.getParent());

        // Copy file to location
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        // Build AttachmentDto
        AttachmentDto dto = new AttachmentDto();
        dto.setFileUrl(baseUrl + "/" + storedFilename);         // ✅ Browser-safe
        dto.setFileType(file.getContentType());
        dto.setFileSizeBytes(file.getSize());

        return dto;
    }

    public void deleteFile(String filename) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(filename).normalize();
        Files.deleteIfExists(filePath);
    }

    public String getUploadDir() {
        return uploadDir;
    }
}
