package com.company.inventory.dto.request;

public record BoxRequest(
        Long rackId,
        String boxNumber,
        String boxLabel
) {}