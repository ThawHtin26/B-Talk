package com.btalk.repository;

import com.btalk.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, String> {
    List<Attachment> findByMessageId(String messageId);
}