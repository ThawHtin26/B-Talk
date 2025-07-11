package com.btalk.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class GroupCreateRequest {
    @NotBlank(message = "Group name is required")
    @Size(max = 100, message = "Group name must be less than 100 characters")
    private String groupName;

    @NotNull(message = "Members list is required")
    @Size(min = 1, message = "At least one member is required")
    private List<String> memberPhones;
}