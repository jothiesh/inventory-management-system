package com.company.inventory.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class StockInRequest {

    @NotNull(message = "Product ID is required")
    private Long productId;

    private Long supplierId;

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be positive")
    private BigDecimal quantity;

    @NotNull(message = "Purchase price is required")
    @Positive(message = "Purchase price must be positive")
    private BigDecimal purchasePrice;

    @NotNull(message = "Purchase date is required")
    private LocalDate purchaseDate;

    @NotNull(message = "Rack ID is required")
    private Long rackId;

    @NotNull(message = "Box ID is required")
    private Long boxId;

    private String referenceNumber;
    private String notes;

    // ── NEW: HSN / GST ────────────────────────────────────────────
    private String hsnCode;
    private BigDecimal gstPercent;
}