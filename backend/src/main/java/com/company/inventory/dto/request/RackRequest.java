package com.company.inventory.dto.request;

public record RackRequest(
        String rackNumber,
        String rackName,
        String location,
        Integer capacity
) {}