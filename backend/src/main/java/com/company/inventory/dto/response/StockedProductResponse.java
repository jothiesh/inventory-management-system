package com.company.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class StockedProductResponse {
    private Long productId;
    private String partNumber;
    private String description;
    private String packageType;
    private String manufacturerPn;
    private String categoryName;
    private Long categoryId;
    private String supplierName;
    private String rackName;
    private String boxLabel;
    private BigDecimal unitPrice;
    private BigDecimal totalStock;
    private String stockStatus;         // IN_STOCK, LOW_STOCK

    // ── NEW: HSN / GST from product ──────────────────────────────
    private String hsnCode;
    private BigDecimal gstPercent;
    // ─────────────────────────────────────────────────────────────

    // Last purchase price (for price diff badge)
    private BigDecimal lastPurchasePrice;

    public StockedProductResponse(Long productId, String partNumber, String description,
            String packageType, String manufacturerPn, String categoryName, Long categoryId,
            String supplierName, String rackName, String boxLabel,
            BigDecimal unitPrice, BigDecimal totalStock, String stockStatus) {
        this.productId = productId;
        this.partNumber = partNumber;
        this.description = description;
        this.packageType = packageType;
        this.manufacturerPn = manufacturerPn;
        this.categoryName = categoryName;
        this.categoryId = categoryId;
        this.supplierName = supplierName;
        this.rackName = rackName;
        this.boxLabel = boxLabel;
        this.unitPrice = unitPrice;
        this.totalStock = totalStock;
        this.stockStatus = stockStatus;
    }
}