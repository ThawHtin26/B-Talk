package com.btalk.repository;

import com.btalk.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {
    List<Attachment> findByMessageId(UUID messageId);
}