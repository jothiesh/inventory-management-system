package com.company.inventory.dto.request;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ProductRequest {

    private String partNumber;
    private String description;
    private String packageType;
    private String specification;
    private String alternativeComponent;
    private String manufacturerPn;

    private Long categoryId;
    private Long supplierId;

    private BigDecimal unitPrice;

    // ── NEW: HSN / GST ────────────────────────────────────────────
    private String hsnCode;
    private BigDecimal gstPercent;
    // ─────────────────────────────────────────────────────────────

    private BigDecimal initialQuantity;
    private Integer minStockLevel;
    private Long rackId;
    private Long boxId;
    private String remarks;
    private Boolean isActive;
}