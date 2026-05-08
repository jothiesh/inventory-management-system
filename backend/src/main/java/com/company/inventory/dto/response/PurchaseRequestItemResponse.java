package com.company.inventory.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseRequestItemResponse {

    private Long id;
    private Integer slNo;
    private String partNo;
    private String description;
    private Integer quantity;
    private String remark;
    private BigDecimal rate;
    private BigDecimal totalAmount;
}
