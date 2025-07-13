package com.btalk.controller;

import org.apache.commons.io.FilenameUtils;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.btalk.utils.FileStorageUtils;
import com.btalk.dto.AttachmentDto;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    private final FileStorageUtils fileStorageUtils;

    public FileUploadController(FileStorageUtils fileStorageUtils) {
        this.fileStorageUtils = fileStorageUtils;
    }

    @PostMapping("/upload")
    public ResponseEntity<AttachmentDto> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            AttachmentDto attachmentDto = fileStorageUtils.storeFile(file);
            return ResponseEntity.ok(attachmentDto);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    
    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> getFile(@PathVariable String filename) {
        try {
            // 1. Get the base upload directory
            Path uploadDir = Paths.get(fileStorageUtils.getUploadDir()).normalize().toAbsolutePath();
            
            // 2. Resolve the filename against the upload directory
            Path filePath = uploadDir.resolve(filename).normalize();
            
            // 3. SECURITY CHECK: Verify the resolved path stays within the upload directory
            if (!filePath.startsWith(uploadDir)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                       .body(new ByteArrayResource("Access denied".getBytes()));
            }

            // 4. Check if file exists
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            // 5. Determine content type
            String contentType = determineContentType(filePath, filename);
            
            // 6. Return the file
            return ResponseEntity.ok()
                   .contentType(MediaType.parseMediaType(contentType))
                   .header(HttpHeaders.CONTENT_DISPOSITION, 
                          "inline; filename=\"" + resource.getFilename() + "\"")
                   .body(resource);
            
        } catch (InvalidPathException e) {
            return ResponseEntity.badRequest()
                   .body(new ByteArrayResource("Invalid file path".getBytes()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                   .body(new ByteArrayResource("Failed to retrieve file".getBytes()));
        }
    }

    
    @DeleteMapping("/{fileUrl}")
    public ResponseEntity<Void> deleteFile(@PathVariable String fileUrl) {
        try {
            fileStorageUtils.deleteFile(fileUrl);
            return ResponseEntity.noContent().build();
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    private String determineContentType(Path filePath, String filename) throws IOException {
        // Try to probe content type first
        String contentType = Files.probeContentType(filePath);
        
        // Fallback for common file types if probe fails
        if (contentType == null) {
            contentType = switch (FilenameUtils.getExtension(filename).toLowerCase()) {
                case "png" -> "image/png";
                case "jpg", "jpeg" -> "image/jpeg";
                case "pdf" -> "application/pdf";
                case "txt" -> "text/plain";
                default -> "application/octet-stream";
            };
        }
        return contentType;
    }
}