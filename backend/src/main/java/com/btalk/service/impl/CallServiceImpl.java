package com.btalk.service.impl;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.btalk.constants.CallStatus;
import com.btalk.constants.CallType;
import com.btalk.dto.request.CallRequest;
import com.btalk.entity.Call;
import com.btalk.repository.CallRepository;
import com.btalk.repository.ConversationRepository;
import com.btalk.repository.ParticipantRepository;
import com.btalk.repository.UserRepository;
import com.btalk.service.CallService;
import com.btalk.dto.CallSignal;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class CallServiceImpl implements CallService {

    private final SimpMessagingTemplate messagingTemplate;
    private final CallRepository callRepository;
    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ParticipantRepository participantRepository;

    public CallServiceImpl(
            SimpMessagingTemplate messagingTemplate,
            CallRepository callRepository,
            UserRepository userRepository,
            ConversationRepository conversationRepository,
            ParticipantRepository participantRepository) {
        this.messagingTemplate = messagingTemplate;
        this.callRepository = callRepository;
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
    }

    @Override
    public void initiateCall(CallRequest request) {
        try {
            log.info("Initiating call: {}", request);
            
            // Validate that the caller exists
            if (!userRepository.existsById(request.getCallerId())) {
                throw new RuntimeException("Caller not found: " + request.getCallerId());
            }
            
            // For private calls, validate that the recipient exists
            if (CallType.PRIVATE.equals(request.getCallType()) && request.getRecipientId() != null) {
                if (!userRepository.existsById(request.getRecipientId())) {
                    throw new RuntimeException("Recipient not found: " + request.getRecipientId());
                }
            }
            
            // For group calls, validate that the conversation exists and has participants
            if (CallType.GROUP.equals(request.getCallType()) && request.getConversationId() != null) {
                if (!conversationRepository.existsById(request.getConversationId())) {
                    throw new RuntimeException("Conversation not found: " + request.getConversationId());
                }
                
                List<String> participants = participantRepository.findUserIdsByConversationId(request.getConversationId());
                if (participants.isEmpty()) {
                    throw new RuntimeException("No participants found in conversation: " + request.getConversationId());
                }
                
                // Validate that caller is a participant
                if (!participants.contains(request.getCallerId())) {
                    throw new RuntimeException("Caller is not a participant in conversation: " + request.getConversationId());
                }
            }
            
            Call call = new Call();
            call.setCallId(request.getCallId());
            call.setCallerId(request.getCallerId());
            call.setRecipientId(request.getRecipientId()); // This can be null for group calls
            call.setConversationId(request.getConversationId());
            call.setStartTime(LocalDateTime.now());
            call.setCallType(request.getCallType());
            call.setStatus(request.getStatus());

            callRepository.save(call);
            log.info("Call saved to database: {}", call.getCallId());

            if (CallType.PRIVATE.equals(request.getCallType())) {
                notifyPrivateCall(request);
            } else {
                notifyGroupCall(request);
            }
        } catch (Exception e) {
            log.error("Error initiating call", e);
            throw new RuntimeException("Failed to initiate call", e);
        }
    }

    @Override
    public void notifyPrivateCall(CallRequest request) {
        try {
            log.info("Notifying private call to recipient: {}", request.getRecipientId());
            
            // Send WebSocket notification to recipient (only the recipient should ring)
            messagingTemplate.convertAndSend(
                    "/user/" + request.getRecipientId() + "/queue/call/incoming",
                    request
            );
            
            // Send confirmation to caller (caller should not ring, just get confirmation)
            messagingTemplate.convertAndSend(
                    "/user/" + request.getCallerId() + "/queue/call/initiated",
                    request
            );
            
            log.info("Private call notifications sent successfully");
        } catch (Exception e) {
            log.error("Error notifying private call", e);
            throw new RuntimeException("Failed to notify private call", e);
        }
    }

    @Override
    public void notifyGroupCall(CallRequest request) {
        try {
            log.info("Notifying group call to conversation: {}", request.getConversationId());
            
            List<String> participantIds = participantRepository
                    .findUserIdsByConversationId(request.getConversationId())
                    .stream()
                    .filter(userId -> !userId.equals(request.getCallerId()))
                    .toList();

            log.info("Found {} participants for group call (excluding caller)", participantIds.size());

            participantIds.forEach(participantId -> {
                messagingTemplate.convertAndSend(
                        "/user/" + participantId + "/queue/call/incoming",
                        request
                );
            });
            
            // Send confirmation to caller
            messagingTemplate.convertAndSend(
                    "/user/" + request.getCallerId() + "/queue/call/initiated",
                    request
            );
            
            log.info("Group call notifications sent successfully to {} participants", participantIds.size());
        } catch (Exception e) {
            log.error("Error notifying group call", e);
            throw new RuntimeException("Failed to notify group call", e);
        }
    }

    @Override
    public void answerCall(CallRequest request) {
        try {
            log.info("Answering call: {}", request.getCallId());
            
            callRepository.findById(request.getCallId()).ifPresent(call -> {
                call.setStatus(CallStatus.ONGOING);
                callRepository.save(call);

                // Notify caller that call was answered
                messagingTemplate.convertAndSend(
                        "/user/" + request.getCallerId() + "/queue/call/answered",
                        request
                );
                
                // Notify recipient that call is active
                if (request.getRecipientId() != null) {
                    messagingTemplate.convertAndSend(
                            "/user/" + request.getRecipientId() + "/queue/call/active",
                            request
                    );
                }
                
                log.info("Call answered successfully");
            });
        } catch (Exception e) {
            log.error("Error answering call", e);
            throw new RuntimeException("Failed to answer call", e);
        }
    }

    @Override
    public void rejectCall(CallRequest request) {
        try {
            log.info("Rejecting call: {}", request.getCallId());
            
            callRepository.findById(request.getCallId()).ifPresent(call -> {
                call.setStatus(CallStatus.REJECTED);
                call.setEndTime(LocalDateTime.now());
                callRepository.save(call);

                // Notify caller that call was rejected
                messagingTemplate.convertAndSend(
                        "/user/" + request.getCallerId() + "/queue/call/rejected",
                        request
                );
                
                // Notify recipient that call was rejected
                if (request.getRecipientId() != null) {
                    messagingTemplate.convertAndSend(
                            "/user/" + request.getRecipientId() + "/queue/call/rejected",
                            request
                    );
                }
                
                log.info("Call rejected successfully");
            });
        } catch (Exception e) {
            log.error("Error rejecting call", e);
            throw new RuntimeException("Failed to reject call", e);
        }
    }

    @Override
    public void endCall(CallRequest request) {
        try {
            log.info("Ending call: {}", request.getCallId());
            
            callRepository.findById(request.getCallId()).ifPresent(call -> {
                call.setStatus(CallStatus.ENDED);
                call.setEndTime(LocalDateTime.now());
                
                // Calculate call duration
                if (call.getStartTime() != null && call.getEndTime() != null) {
                    Duration duration = Duration.between(call.getStartTime(), call.getEndTime());
                    call.setDuration((int) duration.toSeconds());
                }
                
                callRepository.save(call);

                // Notify all participants that call ended
                if (CallType.PRIVATE.equals(call.getCallType()) && call.getRecipientId() != null) {
                    messagingTemplate.convertAndSend(
                            "/user/" + call.getRecipientId() + "/queue/call/ended",
                            request
                    );
                } else if (CallType.GROUP.equals(call.getCallType()) && call.getConversationId() != null) {
                    List<String> participantIds = participantRepository.findUserIdsByConversationId(call.getConversationId());
                    participantIds.forEach(participantId -> {
                        messagingTemplate.convertAndSend(
                                "/user/" + participantId + "/queue/call/ended",
                                request
                        );
                    });
                }
                
                // Notify caller
                messagingTemplate.convertAndSend(
                        "/user/" + call.getCallerId() + "/queue/call/ended",
                        request
                );
                
                log.info("Call ended successfully");
            });
        } catch (Exception e) {
            log.error("Error ending call", e);
            throw new RuntimeException("Failed to end call", e);
        }
    }
}
