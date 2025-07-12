package com.btalk.service.impl;

import com.btalk.dto.*;
import com.btalk.entity.*;
import com.btalk.repository.*;
import com.btalk.security.AuthChannelInterceptorAdapter;
import com.btalk.service.ConversationService;
import com.btalk.service.UserService;
import com.btalk.constants.ConversationType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
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
                                 AttachmentRepository attachmentRepository
                                 ) {
        
		this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.userService = userService;
        this.attachmentRepository = attachmentRepository;
    }

    @Override
    public ConversationDto createPrivateConversation(Long creatorId, Long participantId) {
        // Check if private conversation already exists
        Conversation existing = conversationRepository.findPrivateConversationBetweenUsers(creatorId, participantId);
        if (existing != null) {
            return convertToDto(existing, creatorId);
        }
        
        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.PRIVATE);
        conversation.setCreatorId(creatorId);
        conversation.setName(null); // Private conversations don't have names
        conversation = conversationRepository.save(conversation);
        
        // Add creator as participant
        addParticipant(conversation.getConversationId(), creatorId);
        
        // Add other participant
        addParticipant(conversation.getConversationId(), participantId);
        
        return convertToDto(conversation, creatorId);
    }

    @Override
    public ConversationDto createGroupConversation(Long creatorId, String name, List<Long> participantIds) {
        Conversation conversation = new Conversation();
        conversation.setType(ConversationType.GROUP);
        conversation.setCreatorId(creatorId);
        conversation.setName(name);
        conversation = conversationRepository.save(conversation);
        
        // Add creator as participant
        addParticipant(conversation.getConversationId(), creatorId);
        
        // Add other participants
        for (Long participantId : participantIds) {
            if (!participantId.equals(creatorId)) {
                addParticipant(conversation.getConversationId(), participantId);
            }
        }
        
        return convertToDto(conversation, creatorId);
    }

    @Override
    public ConversationDto addParticipantsToGroup(Long conversationId, Long adderId, List<Long> participantIds) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        
        if (conversation.getType() != ConversationType.GROUP) {
            throw new RuntimeException("Only group conversations can have participants added");
        }
        
        // Verify adder is a participant
        if (!participantRepository.existsByConversationIdAndUserId(conversationId, adderId)) {
            throw new RuntimeException("Only participants can add others to the conversation");
        }
        
        for (Long participantId : participantIds) {
            if (!participantRepository.existsByConversationIdAndUserId(conversationId, participantId)) {
                addParticipant(conversationId, participantId);
            }
        }
        
        return convertToDto(conversation, adderId);
    }

    @Override
    public List<ConversationDto> getUserConversations(Long userId) {
        List<Conversation> conversations = conversationRepository.findConversationsByUserId(userId);
        return conversations.stream()
                .map(conv -> convertToDto(conv, userId))
                .collect(Collectors.toList());
    }

    @Override
    public ConversationDto getConversationDetails(Long conversationId, Long userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        
        // Verify user is a participant
        if (!participantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new RuntimeException("User is not a participant in this conversation");
        }
        
        return convertToDto(conversation, userId);
    }

    @Override
    public void leaveConversation(Long conversationId, Long userId) {
        participantRepository.leaveConversation(conversationId, userId);
    }
    
    private void addParticipant(Long conversationId, Long userId) {
        Participant participant = new Participant();
        participant.setConversationId(conversationId);
        participant.setUserId(userId);
        participantRepository.save(participant);
    }
    
    private ConversationDto convertToDto(Conversation conversation, Long requestingUserId) {
        ConversationDto dto = new ConversationDto();
        dto.setConversationId(conversation.getConversationId());
        dto.setType(conversation.getType());
        dto.setName(conversation.getName());
        dto.setCreatorId(conversation.getCreatorId());
        dto.setCreatedAt(conversation.getCreatedAt());
        
        // Set participants
        List<Participant> participants = participantRepository.findByConversationId(conversation.getConversationId());
        dto.setParticipants(participants.stream()
                .map(this::convertParticipantToDto)
                .collect(Collectors.toList()));
        
        // Set last message
        Message lastMessage = messageRepository.findLastMessageByConversationId(conversation.getConversationId());
        if (lastMessage != null) {
            dto.setLastMessage(convertMessageToDto(lastMessage));
            dto.setLastMessageAt(lastMessage.getSentAt());
        }
        
        // Set unread count
        int unreadCount = messageRepository.countUnreadMessages(conversation.getConversationId(), requestingUserId);
        dto.setUnreadCount(unreadCount);
        
        return dto;
    }
    
    private ParticipantDto convertParticipantToDto(Participant participant) {
        ParticipantDto dto = new ParticipantDto();
        dto.setParticipantId(participant.getParticipantId());
        dto.setUserId(participant.getUserId());
        
        // Get user details from user service
        UserDto user = userService.getUserById(participant.getUserId());
        dto.setUserName(user.getName());
        dto.setUserPhone(user.getPhoneNumber());
        
        dto.setJoinedAt(participant.getJoinedAt());
        dto.setLeftAt(participant.getLeftAt());
        return dto;
    }
    
    private MessageDto convertMessageToDto(Message message) {
        MessageDto dto = new MessageDto();
        dto.setMessageId(message.getMessageId());
        dto.setConversationId(message.getConversationId());
        dto.setSenderId(message.getSenderId());
        
        // Get sender details from user service
        UserDto sender = userService.getUserById(message.getSenderId());
        dto.setSenderName(sender.getName());
        
        dto.setContent(message.getContent());
        dto.setMessageType(message.getMessageType());
        dto.setSentAt(message.getSentAt());
        dto.setStatus("DELIVERED"); // Default status
        
        // Set attachments if any
        List<Attachment> attachments = attachmentRepository.findByMessageId(message.getMessageId());
        dto.setAttachments(attachments.stream()
                .map(this::convertAttachmentToDto)
                .collect(Collectors.toList()));
        
        return dto;
    }
    
    private AttachmentDto convertAttachmentToDto(Attachment attachment) {
        AttachmentDto dto = new AttachmentDto();
        dto.setAttachmentId(attachment.getAttachmentId());
        dto.setFileUrl(attachment.getFileUrl());
        dto.setFileType(attachment.getFileType());
        dto.setFileSizeBytes(attachment.getFileSizeBytes());
        return dto;
    }
}