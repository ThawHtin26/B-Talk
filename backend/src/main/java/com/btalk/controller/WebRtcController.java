package com.btalk.controller;

import com.btalk.constants.CallStatus;
import com.btalk.constants.CallType;
import com.btalk.constants.SignalType;
import com.btalk.dto.WebRtcSignal;
import com.btalk.dto.request.CallRequest;
import com.btalk.dto.response.ApiResponse;
import com.btalk.service.CallService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/calls")
public class WebRtcController {

    private final CallService callService;
    private final SimpMessagingTemplate messagingTemplate;
    private static final Logger logger = LoggerFactory.getLogger(WebRtcController.class);

    public WebRtcController(SimpMessagingTemplate messagingTemplate,CallService callService) {
        this.messagingTemplate = messagingTemplate;
        this.callService = callService;
    }


    @PostMapping("/start")
    public ApiResponse<String> startCall(@RequestBody CallRequest request) {
    	request.setStatus(CallStatus.RINGING);
    	callService.initiateCall(request);
        return ApiResponse.success("Call initiated");
    }

    @PostMapping("/end")
    public ApiResponse<String> endCall(@RequestBody CallRequest request) {
        callService.endCall(request);
        return ApiResponse.success("Call ended");
    }

    @PostMapping("/answer")
    public ApiResponse<String> answerCall(@RequestBody CallRequest request) {
        callService.answerCall(request);
        return ApiResponse.success("Call answered");
    }

    @PostMapping("/reject")
    public ApiResponse<String> rejectCall(@RequestBody CallRequest request) {
        callService.rejectCall(request);
        return ApiResponse.success("Call rejected");
    }

 
    @MessageMapping("/call/private/signal")
    public void handlePrivateSignal(@Payload WebRtcSignal signal) {
        try {
            if (signal.getRecipientId() == null) {
                logger.warn("Received private signal without recipient ID");
                return;
            }
            
            logger.debug("Forwarding private signal to user {}", signal.getRecipientId());
            messagingTemplate.convertAndSendToUser(
                signal.getRecipientId().toString(),
                "/queue/call/signals",
                signal
            );
        } catch (Exception e) {
            logger.error("Error handling private signal", e);
        }
    }

    @MessageMapping("/call/group/signal")
    public void handleGroupSignal(@Payload WebRtcSignal signal) {
        try {
            if (signal.getConversationId() == null) {
                logger.warn("Received group signal without conversation ID");
                return;
            }
            
            logger.debug("Broadcasting group signal to conversation {}", signal.getConversationId());
            messagingTemplate.convertAndSend(
                "/topic/call/" + signal.getConversationId() + "/signals",
                signal
            );
        } catch (Exception e) {
            logger.error("Error handling group signal", e);
        }
    }

    // Additional handler for call status signals
    @MessageMapping("/call/status")
    public void handleCallStatusSignal(@Payload WebRtcSignal signal) {
        try {
            if (signal.getSignalType() == SignalType.RINGING) {
                // Handle ringing notification
                messagingTemplate.convertAndSendToUser(
                    signal.getCallerId().toString(),
                    "/queue/call/status",
                    signal
                );
            } else if (signal.getSignalType() == SignalType.HANGUP) {
                // Handle call termination
                CallRequest request = new CallRequest();
                request.setCallId(signal.getCallId());
                request.setCallerId(signal.getCallerId());
                request.setRecipientId(signal.getRecipientId());
                request.setConversationId(signal.getConversationId());
                request.setStatus(CallStatus.ENDED);
                request.setCallType(signal.getRecipientId() != null ? CallType.PRIVATE : CallType.GROUP);
                
                callService.endCall(request);
            }
        } catch (Exception e) {
            logger.error("Error handling call status signal", e);
        }
    }
}