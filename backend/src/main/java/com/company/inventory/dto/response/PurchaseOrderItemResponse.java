package com.company.inventory.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderItemResponse {

    private Long id;
    private Integer slNo;
    private String hsnCode;
    private String description;
    private Integer quantity;
    private String uom;
    private BigDecimal rate;
    private BigDecimal totalAmount;
}