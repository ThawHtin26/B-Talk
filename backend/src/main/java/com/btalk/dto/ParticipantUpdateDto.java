package com.btalk.dto;

import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ParticipantUpdateDto {
	private String action; // "ADDED" or "LEFT"
    private List<UUID> userIds;
}
