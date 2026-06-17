package com.company.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LotDetailResponse {
    private Long lotId;
    private String lotNumber;

    // Product info
    private Long productId;
    private String partNumber;
    private String description;
    private String categoryName;

    // Quantity & price
    private BigDecimal purchaseQuantity;
    private BigDecimal remainingQuantity;
    private BigDecimal purchasePrice;
    private BigDecimal totalValue;     // qty * price
    private LocalDate purchaseDate;

    // HSN / GST
    private String hsnCode;
    private BigDecimal gstPercent;
    private BigDecimal gstAmount;

    // Location
    private String rackName;
    private String boxLabel;

    // Status
    private String lotStatus;          // Active / Depleted
}