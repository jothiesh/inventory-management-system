package com.company.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One stock movement row (IN or OUT) for the Supplier detail page.
 * Covers all movements against lots supplied by this supplier.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupplierMovementDto {
    private Long          movementId;
    private LocalDateTime createdAt;
    private String        movementType;     // IN | OUT
    private String        transactionType;  // Purchase, Production, Assembly, Sale, Damage, Scrap, Reversal, ...
    private Long          productId;
    private String        partNumber;
    private String        description;
    private String        categoryName;
    private String        lotNumber;
    private BigDecimal    quantity;
    private BigDecimal    purchasePrice;    // lot's purchase price (for OUT value estimation)
    private String        referenceNumber;
    private String        notes;
    private boolean       reversed;
    private String        createdByName;
}