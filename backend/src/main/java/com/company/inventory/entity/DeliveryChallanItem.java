package com.company.inventory.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "delivery_challan_items")
@Getter
@Setter
@NoArgsConstructor
public class DeliveryChallanItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dc_id", nullable = false)
    @JsonIgnore
    private DeliveryChallan challan;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "part_number", length = 120)
    private String partNumber;

    @Column(length = 500)
    private String description;

    @Column(name = "category_name", length = 120)
    private String categoryName;

    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal qty;

    @Column(precision = 15, scale = 2)
    private BigDecimal rate;

    @Column(length = 500)
    private String remarks;
}
