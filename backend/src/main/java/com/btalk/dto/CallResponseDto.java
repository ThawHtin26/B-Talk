package com.btalk.dto;


import lombok.Data;

@Data
public class CallResponseDto {
    private String callId;
    private String sdpOffer;
    private String iceCandidates;
}