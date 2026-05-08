package com.company.inventory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class BulkStockInRequest {

    @NotEmpty(message = "Items list cannot be empty")
    @Valid
    private List<BulkStockInItem> items;

    private String notes;

    @Data
    public static class BulkStockInItem {
        private Long productId;
        private Long supplierId;
        private BigDecimal quantity;
        private BigDecimal purchasePrice;
        private LocalDate purchaseDate;
        private Long rackId;
        private Long boxId;
        private String referenceNumber;
        private String notes;

        // ── NEW: HSN / GST ────────────────────────────────────────
        private String hsnCode;
        private BigDecimal gstPercent;
    }
}