


// ── FILE 2: src/dto/request/PurchaseRequestItemRequest.java ──────
package com.company.inventory.dto.request;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseRequestItemRequest {

    private String partNo;          // Part No
    private String description;     // Required
    private Integer quantity;       // Required — max 999999 (6 digits)
    private String remark;          // Optional
    private BigDecimal rate;        // Optional — for cost estimation
}

