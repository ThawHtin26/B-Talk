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
    public void handlePrivateSignal(@Payload WebRtcSignal signal) {
        try {
            logger.debug("Received private signal: type={}, callerId={}, recipientId={}", 
                signal.getType(), signal.getCallerId(), signal.getRecipientId());
            
            if (signal.getRecipientId() == null) {
                logger.warn("Received private signal without recipient ID");
                return;
            }
            
            // Validate signal type
            if (signal.getType() == null) {
                logger.warn("Received signal without type");
                return;
            }
            
            logger.debug("Forwarding private signal to user {}", signal.getRecipientId());
            messagingTemplate.convertAndSend(
                "/user/" + signal.getRecipientId() + "/queue/call/signals",
                signal
            );
            
            logger.debug("Private signal forwarded successfully");
        } catch (Exception e) {
            logger.error("Error handling private signal", e);
        }
    }

    @MessageMapping("/call/group/signal")
    public void handleGroupSignal(@Payload WebRtcSignal signal) {
        try {
            logger.debug("Received group signal: type={}, conversationId={}", 
                signal.getType(), signal.getConversationId());
            
            if (signal.getConversationId() == null) {
                logger.warn("Received group signal without conversation ID");
                return;
            }
            
            // Validate signal type
            if (signal.getType() == null) {
                logger.warn("Received signal without type");
                return;
            }
            
            logger.debug("Broadcasting group signal to conversation {}", signal.getConversationId());
            messagingTemplate.convertAndSend(
                "/topic/call/" + signal.getConversationId() + "/signals",
                signal
            );
            
            logger.debug("Group signal broadcasted successfully");
        } catch (Exception e) {
            logger.error("Error handling group signal", e);
        }
    }

    // Additional handler for call status signals
    @MessageMapping("/call/status")
    public void handleCallStatus(@Payload CallRequest request) {
        try {
            logger.info("Received call status update: {}", request);
            
            // Handle different call status updates
            switch (request.getStatus()) {
                case RINGING:
                    logger.debug("Call ringing: {}", request.getCallId());
                    break;
                case ONGOING:
                    logger.debug("Call ongoing: {}", request.getCallId());
                    break;
                case ENDED:
                    logger.debug("Call ended: {}", request.getCallId());
                    break;
                case REJECTED:
                    logger.debug("Call rejected: {}", request.getCallId());
                    break;
                default:
                    logger.warn("Unknown call status: {}", request.getStatus());
            }
        } catch (Exception e) {
            logger.error("Error handling call status", e);
        }
    }
}