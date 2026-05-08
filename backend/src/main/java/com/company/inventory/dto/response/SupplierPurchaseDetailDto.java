package com.company.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupplierPurchaseDetailDto {

    // Lot info
    private Long lotId;
    private String lotNumber;
    private LocalDate purchaseDate;
    private BigDecimal quantity;
    private BigDecimal purchasePrice;
    private BigDecimal totalValue;
    private String referenceNumber;

    // Product info
    private Long productId;
    private String partNumber;
    private String description;
    private String categoryName;
    private String packageType;

    // Location
    private String rackName;
    private String boxLabel;

    // ── NEW: HSN / GST ────────────────────────────────────────────
    private String hsnCode;
    private BigDecimal gstPercent;
    private BigDecimal gstAmount;
    // ─────────────────────────────────────────────────────────────
}