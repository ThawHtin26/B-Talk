package com.btalk.service.impl;

import com.btalk.dto.*;
import com.btalk.entity.*;
import com.btalk.repository.*;
import com.btalk.service.ConversationService;
import com.btalk.service.UserService;
import com.btalk.constants.ConversationType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ConversationServiceImpl implements ConversationService {

    private final ConversationRepository conversationRepository;
    private final ParticipantRepository participantRepository;
    private final AttachmentRepository attachmentRepository;
    private final MessageRepository messageRepository;
    private final UserService userService;
    
    public ConversationServiceImpl(ConversationRepository conversationRepository,
                                 ParticipantRepository participantRepository,
                                 MessageRepository messageRepository,
                                 UserService userService,
                                 AttachmentRepository attachmentRepository) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.userService = userService;
        this.attachmentRepository = attachmentRepository;
    }

    @Override
    public ConversationDto createPrivateConversation(Long creatorId, Long participantId) {
        try {
            // Check if private conversation already exists
            Conversation existing = conversationRepository.findPrivateConversationBetweenUsers(creatorId, participantId);
            if (existing != null) {
                return convertToDto(existing, creatorId);
            }
            
            Conversation conversation = new Conversation();
            conversation.setType(ConversationType.PRIVATE);
            conversation.setCreatorId(creatorId);
            conversation.setName(null);
            conversation = conversationRepository.save(conversation);
            
            addParticipant(conversation.getConversationId(), creatorId);
            addParticipant(conversation.getConversationId(), participantId);
            
            return convertToDto(conversation, creatorId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create private conversation: " + e.getMessage(), e);
        }
    }

    @Override
    public ConversationDto createGroupConversation(Long creatorId, String name, List<Long> participantIds) {
        try {
            Conversation conversation = new Conversation();
            conversation.setType(ConversationType.GROUP);
            conversation.setCreatorId(creatorId);
            conversation.setName(name);
            conversation = conversationRepository.save(conversation);
            
            addParticipant(conversation.getConversationId(), creatorId);
            
            for (Long participantId : participantIds) {
                if (!participantId.equals(creatorId)) {
                    addParticipant(conversation.getConversationId(), participantId);
                }
            }
            
            return convertToDto(conversation, creatorId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create group conversation: " + e.getMessage(), e);
        }
    }

    @Override
    public ConversationDto addParticipantsToGroup(Long conversationId, Long adderId, List<Long> participantIds) {
        try {
            Conversation conversation = conversationRepository.findById(conversationId)
                    .orElseThrow(() -> new RuntimeException("Conversation not found"));
            
            if (conversation.getType() != ConversationType.GROUP) {
                throw new RuntimeException("Only group conversations can have participants added");
            }
            
            if (!participantRepository.existsByConversationIdAndUserId(conversationId, adderId)) {
                throw new RuntimeException("Only participants can add others to the conversation");
            }
            
            for (Long participantId : participantIds) {
                if (!participantRepository.existsByConversationIdAndUserId(conversationId, participantId)) {
                    addParticipant(conversationId, participantId);
                }
            }
            
            return convertToDto(conversation, adderId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to add participants to group: " + e.getMessage(), e);
        }
    }

    @Override
    public List<ConversationDto> getUserConversations(Long userId) {
        try {
            List<Conversation> conversations = conversationRepository.findConversationsByUserId(userId);
            return conversations.stream()
                    .map(conv -> convertToDto(conv, userId))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            throw new RuntimeException("Failed to get user conversations: " + e.getMessage(), e);
        }
    }

    @Override
    public ConversationDto getConversationDetails(Long conversationId, Long userId) {
        try {
            Conversation conversation = conversationRepository.findById(conversationId)
                    .orElseThrow(() -> new RuntimeException("Conversation not found"));
            
            if (!participantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
                throw new RuntimeException("User is not a participant in this conversation");
            }
            
            return convertToDto(conversation, userId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get conversation details: " + e.getMessage(), e);
        }
    }

    @Override
    public void leaveConversation(Long conversationId, Long userId) {
        try {
            participantRepository.leaveConversation(conversationId, userId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to leave conversation: " + e.getMessage(), e);
        }
    }
    
    private void addParticipant(Long conversationId, Long userId) {
        try {
            Participant participant = new Participant();
            participant.setConversationId(conversationId);
            participant.setUserId(userId);
            participantRepository.save(participant);
        } catch (Exception e) {
            throw new RuntimeException("Failed to add participant: " + e.getMessage(), e);
        }
    }
    
    private ConversationDto convertToDto(Conversation conversation, Long requestingUserId) {
        try {
            ConversationDto dto = new ConversationDto();
            dto.setConversationId(conversation.getConversationId());
            dto.setType(conversation.getType());
            dto.setName(conversation.getName());
            dto.setCreatorId(conversation.getCreatorId());
            dto.setCreatedAt(conversation.getCreatedAt());
            
            List<Participant> participants = participantRepository.findByConversationId(conversation.getConversationId());
            dto.setParticipants(participants.stream()
                    .map(this::convertParticipantToDto)
                    .collect(Collectors.toList()));
            
            Message lastMessage = messageRepository.findLastMessageByConversationId(conversation.getConversationId());
            if (lastMessage != null) {
                dto.setLastMessage(convertMessageToDto(lastMessage));
                dto.setLastMessageAt(lastMessage.getSentAt());
            }
            
            int unreadCount = messageRepository.countUnreadMessages(conversation.getConversationId(), requestingUserId);
            dto.setUnreadCount(unreadCount);
            
            return dto;
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert conversation to DTO: " + e.getMessage(), e);
        }
    }
    
    private ParticipantDto convertParticipantToDto(Participant participant) {
        try {
            ParticipantDto dto = new ParticipantDto();
            dto.setParticipantId(participant.getParticipantId());
            dto.setUserId(participant.getUserId());
            
            UserDto user = userService.getUserById(participant.getUserId());
            dto.setUserName(user.getName());
            dto.setUserPhone(user.getPhoneNumber());
            
            dto.setJoinedAt(participant.getJoinedAt());
            dto.setLeftAt(participant.getLeftAt());
            return dto;
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert participant to DTO: " + e.getMessage(), e);
        }
    }
    
    private MessageDto convertMessageToDto(Message message) {
        try {
            MessageDto dto = new MessageDto();
            dto.setMessageId(message.getMessageId());
            dto.setConversationId(message.getConversationId());
            dto.setSenderId(message.getSenderId());
            
            UserDto sender = userService.getUserById(message.getSenderId());
            dto.setSenderName(sender.getName());
            
            dto.setContent(message.getContent());
            dto.setMessageType(message.getMessageType());
            dto.setSentAt(message.getSentAt());
            dto.setStatus("DELIVERED");
            
            List<Attachment> attachments = attachmentRepository.findByMessageId(message.getMessageId());
            dto.setAttachments(attachments.stream()
                    .map(this::convertAttachmentToDto)
                    .collect(Collectors.toList()));
            
            return dto;
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert message to DTO: " + e.getMessage(), e);
        }
    }
    
    private AttachmentDto convertAttachmentToDto(Attachment attachment) {
        try {
            AttachmentDto dto = new AttachmentDto();
            dto.setAttachmentId(attachment.getAttachmentId());
            dto.setFileUrl(attachment.getFileUrl());
            dto.setFileType(attachment.getFileType());
            dto.setFileSizeBytes(attachment.getFileSizeBytes());
            return dto;
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert attachment to DTO: " + e.getMessage(), e);
        }
    }
    


    private MessageDto mapToDto(Message message) {
        MessageDto dto = new MessageDto();
        dto.setMessageId(message.getMessageId());
        dto.setConversationId(message.getConversationId());
        dto.setSenderId(message.getSenderId());
        dto.setContent(message.getContent());
        dto.setMessageType(message.getMessageType());
        dto.setSentAt(message.getSentAt());
        dto.setStatus("SENT"); // You can enhance this later
        dto.setAttachments(Collections.emptyList()); // Placeholder if attachments not used yet
        dto.setSenderName(null); // Optional: load from user table if needed
        return dto;
    }

    @Override
    public MessageDto getConversationById(Long conversationId) {
        Message message = messageRepository.findTopByConversationIdOrderBySentAtDesc(conversationId)
                .orElseThrow(() -> new RuntimeException("No message found for conversation ID: " + conversationId));

        return mapToDto(message);
    }
}