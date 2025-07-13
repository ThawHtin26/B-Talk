package com.btalk.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ParticipantUpdateDto {
	private String action; // "ADDED" or "LEFT"
    private List<Long> userIds;
}
