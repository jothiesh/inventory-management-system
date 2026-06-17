package com.company.inventory.dto.request;

import jakarta.validation.constraints.Positive;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class StockInRequest {
    private Long productId;
    private Long supplierId;

    @Positive(message = "Quantity must be positive")
    private BigDecimal quantity;

    @Positive(message = "Purchase price must be positive")
    private BigDecimal purchasePrice;

    private LocalDate purchaseDate;
    private Long rackId;
    private Long boxId;
    private String referenceNumber;
    private String notes;

    // ── NEW: HSN / GST ────────────────────────────────────────────
    private String hsnCode;
    private BigDecimal gstPercent;
}