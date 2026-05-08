package com.company.inventory.dto.request;

import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePurchaseOrderRequest {

    private LocalDate deliveryFrom;
    private LocalDate deliveryTo;
    private String paymentTerms;
    private String notes;
    private List<PurchaseOrderItemRequest> items;
}