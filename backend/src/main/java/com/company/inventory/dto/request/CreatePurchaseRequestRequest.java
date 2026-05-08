// ── FILE 1: src/dto/request/CreatePurchaseRequestRequest.java ────
package com.company.inventory.dto.request;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePurchaseRequestRequest {

    private String notes;
    private List<PurchaseRequestItemRequest> items;
}