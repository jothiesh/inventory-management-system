package com.company.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupplierProductSummaryDto {
    private Long productId;
    private String partNumber;
    private String description;
    private String categoryName;
    private String packageType;
    private BigDecimal totalQtyBought;   // sum of all lots
    private BigDecimal lastPurchasePrice;
    private LocalDate lastBoughtDate;
    private LocalDate firstBoughtDate;
    private Integer totalPurchaseCount;  // number of lots
}