package com.btalk.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class GroupAddRequest {
    @NotNull(message = "User IDs list is required")
    @Size(min = 1, message = "At least one user ID is required")
    private List<String> userIds;
}