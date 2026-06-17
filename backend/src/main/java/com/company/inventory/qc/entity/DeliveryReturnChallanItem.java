package com.company.inventory.qc.entity;

import com.company.inventory.entity.Lot;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "delivery_return_challan_item")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class DeliveryReturnChallanItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challan_id", nullable = false)
    @JsonIgnore
    private DeliveryReturnChallan challan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "stockInBatch"})
    private Lot lot;

    @Column(name = "part_number", length = 100)
    private String partNumber;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "category_name", length = 100)
    private String categoryName;

    @Column(name = "qty_returned", nullable = false, precision = 10, scale = 2)
    private BigDecimal qtyReturned;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "remarks", length = 500)
    private String remarks;
}