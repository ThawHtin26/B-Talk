package com.btalk.controller;

import com.btalk.dto.request.CallRequest;
import com.btalk.dto.response.ApiResponse;
import com.btalk.service.CallService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/calls")
public class CallController {

    private final CallService callService;

    public CallController(CallService callService) {
        this.callService = callService;
    }

    @PostMapping("/start")
    public ApiResponse<String> startCall(@RequestBody CallRequest request) {
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
}