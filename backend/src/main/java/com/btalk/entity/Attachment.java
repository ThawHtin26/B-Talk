package com.btalk.entity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Entity
@Table(name = "attachments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Attachment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID attachmentId;

    @Column(name = "message_id", nullable = false)
    private UUID messageId;

    @Column(nullable = false)
    private String fileUrl;

    @Column(nullable = false)
    private String fileType;

    private Long fileSizeBytes;
}