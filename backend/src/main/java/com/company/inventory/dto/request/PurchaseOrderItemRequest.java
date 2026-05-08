package com.company.inventory.dto.request;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderItemRequest {

    private String hsnCode;
    private String description;  // Required
    private Integer quantity;    // Required
    private String uom;          // Nos, Pcs, Kgs
    private BigDecimal rate;     // Required
}