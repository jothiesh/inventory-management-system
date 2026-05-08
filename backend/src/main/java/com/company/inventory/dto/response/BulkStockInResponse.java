package com.company.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkStockInResponse {

    private int totalItems;
    private int successCount;
    private int failedCount;
    private List<BulkStockInItemResult> results;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkStockInItemResult {
        private Long productId;
        private String partNumber;
        private String description;
        private String categoryName;
        private BigDecimal quantity;
        private BigDecimal purchasePrice;
        private BigDecimal totalValue;
        private LocalDate purchaseDate;
        private String rackName;
        private String boxLabel;
        private String lotNumber;
        private boolean success;
        private String errorMessage; // null if success
    }
}
