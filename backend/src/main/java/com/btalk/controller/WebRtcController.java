package com.btalk.controller;

import com.btalk.constants.CallStatus;
import com.btalk.constants.CallType;
import com.btalk.constants.SignalType;
import com.btalk.dto.CallSignal;
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

    public WebRtcController(SimpMessagingTemplate messagingTemplate, CallService callService) {
        this.messagingTemplate = messagingTemplate;
        this.callService = callService;
    }

    @PostMapping("/start")
    public ApiResponse<String> startCall(@RequestBody CallRequest request) {
        try {
            logger.info("Starting call: {}", request);
            request.setStatus(CallStatus.RINGING);
            callService.initiateCall(request);
            return ApiResponse.success("Call initiated successfully");
        } catch (Exception e) {
            logger.error("Error starting call", e);
            return ApiResponse.error("Failed to start call: " + e.getMessage());
        }
    }

    @PostMapping("/end")
    public ApiResponse<String> endCall(@RequestBody CallRequest request) {
        try {
            logger.info("Ending call: {}", request);
            callService.endCall(request);
            return ApiResponse.success("Call ended successfully");
        } catch (Exception e) {
            logger.error("Error ending call", e);
            return ApiResponse.error("Failed to end call: " + e.getMessage());
        }
    }

    @PostMapping("/answer")
    public ApiResponse<String> answerCall(@RequestBody CallRequest request) {
        try {
            logger.info("Answering call: {}", request);
            callService.answerCall(request);
            return ApiResponse.success("Call answered successfully");
        } catch (Exception e) {
            logger.error("Error answering call", e);
            return ApiResponse.error("Failed to answer call: " + e.getMessage());
        }
    }

    @PostMapping("/reject")
    public ApiResponse<String> rejectCall(@RequestBody CallRequest request) {
        try {
            logger.info("Rejecting call: {}", request);
            callService.rejectCall(request);
            return ApiResponse.success("Call rejected successfully");
        } catch (Exception e) {
            logger.error("Error rejecting call", e);
            return ApiResponse.error("Failed to reject call: " + e.getMessage());
        }
    }

    @MessageMapping("/call/private/signal")
    public void handlePrivateSignal(@Payload CallSignal signal) {
        try {
            logger.info("Received private signal: type={}, callerId={}, recipientId={}, callId={}", 
                signal.getType(), signal.getCallerId(), signal.getRecipientId(), signal.getCallId());
            
            if (signal.getRecipientId() == null) {
                logger.warn("Received private signal without recipient ID");
                return;
            }
            
            // Validate signal type
            if (signal.getType() == null) {
                logger.warn("Received signal without type");
                return;
            }
            
            logger.info("Forwarding private signal to user {} for call {}", signal.getRecipientId(), signal.getCallId());
            messagingTemplate.convertAndSend(
                "/user/" + signal.getRecipientId() + "/queue/call/signals",
                signal
            );
            
            logger.info("Private signal forwarded successfully");
        } catch (Exception e) {
            logger.error("Error handling private signal", e);
        }
    }

    @MessageMapping("/call/group/signal")
    public void handleGroupSignal(@Payload CallSignal signal) {
        try {
            logger.info("Received group signal: type={}, conversationId={}, callId={}", 
                signal.getType(), signal.getConversationId(), signal.getCallId());
            
            if (signal.getConversationId() == null) {
                logger.warn("Received group signal without conversation ID");
                return;
            }
            
            // Validate signal type
            if (signal.getType() == null) {
                logger.warn("Received signal without type");
                return;
            }
            
            logger.info("Broadcasting group signal to conversation {} for call {}", signal.getConversationId(), signal.getCallId());
            messagingTemplate.convertAndSend(
                "/topic/call/" + signal.getConversationId() + "/signals",
                signal
            );
            
            logger.info("Group signal broadcasted successfully");
        } catch (Exception e) {
            logger.error("Error handling group signal", e);
        }
    }

    // Additional handler for call status signals
    @MessageMapping("/call/status")
    public void handleCallStatus(@Payload CallSignal signal) {
        try {
            logger.info("Received call status signal: {}", signal);
            
            // Handle different call status updates
            switch (signal.getType()) {
                case RINGING:
                    logger.debug("Call ringing: {}", signal.getCallerId());
                    break;
                case OFFER:
                    logger.debug("Call offer: {}", signal.getCallerId());
                    break;
                case ANSWER:
                    logger.debug("Call answer: {}", signal.getCallerId());
                    break;
                case CANDIDATE:
                    logger.debug("Call candidate: {}", signal.getCallerId());
                    break;
                case HANGUP:
                    logger.debug("Call hangup: {}", signal.getCallerId());
                    break;
                default:
                    logger.warn("Unknown signal type: {}", signal.getType());
            }
        } catch (Exception e) {
            logger.error("Error handling call status", e);
        }
    }
}