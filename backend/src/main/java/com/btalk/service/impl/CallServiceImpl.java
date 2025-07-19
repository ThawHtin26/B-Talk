package com.btalk.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

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

@Service
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
        Call call = new Call();
        call.setCallId(UUID.randomUUID().toString());
        call.setCallerId(request.getCallerId());
        call.setConversationId(request.getConversationId());
        call.setStartTime(LocalDateTime.now());
        call.setCallType(request.getCallType());
        call.setStatus(request.getStatus());

        callRepository.save(call);

        if (CallType.PRIVATE.equals(request.getCallType())) {
            notifyPrivateCall(request);
        } else {
            notifyGroupCall(request);
        }
    }

    @Override
    public void notifyPrivateCall(CallRequest request) {
        messagingTemplate.convertAndSend(
                "/user/" + request.getRecipientId().toString() + "/queue/call/incoming",
                request
        );
    }

    @Override
    public void notifyGroupCall(CallRequest request) {
        List<UUID> participantIds = participantRepository
                .findUserIdsByConversationId(request.getConversationId())
                .stream()
                .filter(userId -> !userId.equals(request.getCallerId()))
                .toList();

        participantIds.forEach(participantId -> {
            messagingTemplate.convertAndSend(
                    "/user/" + participantId.toString() + "/queue/call/incoming",
                    request
            );
        });
    }

    @Override
    public void answerCall(CallRequest request) {
        callRepository.findById(request.getCallId()).ifPresent(call -> {
            call.setStatus(CallStatus.ONGOING);
            callRepository.save(call);

            messagingTemplate.convertAndSend(
                    "/user/" + request.getCallerId().toString() + "/queue/call/answered",
                    request
            );
        });
    }

    @Override
    public void rejectCall(CallRequest request) {
        callRepository.findById(request.getCallId()).ifPresent(call -> {
            call.setStatus(CallStatus.REJECTED);
            callRepository.save(call);

            messagingTemplate.convertAndSend(
                    "/user/" + request.getCallerId().toString() + "/queue/call/rejected",
                    request
            );
        });
    }

    @Override
    public void endCall(CallRequest request) {
        callRepository.findById(request.getCallId()).ifPresent(call -> {
            call.setStatus(CallStatus.ENDED);
            call.setEndTime(LocalDateTime.now());
            callRepository.save(call);

            messagingTemplate.convertAndSend(
                    "/user/" + request.getCallerId().toString() + "/queue/call/ended",
                    request
            );
        });
    }
}
