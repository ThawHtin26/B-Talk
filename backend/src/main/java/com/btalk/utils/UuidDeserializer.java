package com.btalk.utils;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;

import java.io.IOException;
import java.util.UUID;

public class UuidDeserializer extends JsonDeserializer<String> {
    
    @Override
    public String deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        JsonNode node = p.getCodec().readTree(p);
        String value = node.asText();
        
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        
        // If it's already a valid UUID, return it
        if (isValidUuid(value)) {
            return value;
        }
        
        // If it's a non-standard format like "different-user-id-1752987208876"
        // Try to extract a valid UUID or generate one
        if (value.contains("-")) {
            // Try to extract the timestamp part and generate a UUID
            String[] parts = value.split("-");
            if (parts.length > 0) {
                try {
                    // Use the last part as a seed for UUID generation
                    String lastPart = parts[parts.length - 1];
                    long seed = Long.parseLong(lastPart);
                    return generateUuidFromSeed(seed);
                } catch (NumberFormatException e) {
                    // If parsing fails, generate a random UUID
                    return UUID.randomUUID().toString();
                }
            }
        }
        
        // Default fallback: generate a random UUID
        return UUID.randomUUID().toString();
    }
    
    private boolean isValidUuid(String uuid) {
        try {
            UUID.fromString(uuid);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
    
    private String generateUuidFromSeed(long seed) {
        // Use the seed to generate a deterministic UUID
        return UUID.nameUUIDFromBytes(String.valueOf(seed).getBytes()).toString();
    }
} 