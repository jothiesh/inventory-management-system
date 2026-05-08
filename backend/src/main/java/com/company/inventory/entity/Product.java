package com.company.inventory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Long productId;

    @Column(name = "part_number", nullable = true, unique = true, length = 100)
    private String partNumber;

    @Column(name = "description", nullable = true, length = 500)
    private String description;

    @Column(name = "package_type", length = 100)
    private String packageType;

    @Column(name = "specification", columnDefinition = "TEXT")
    private String specification;

    @Column(name = "alternative_component", length = 200)
    private String alternativeComponent;

    @Column(name = "manufacturer_pn", length = 100)
    private String manufacturerPn;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;

    // ── NEW: HSN / GST ────────────────────────────────────────────
    @Column(name = "hsn_code", length = 20)
    private String hsnCode;

    @Column(name = "gst_percent", precision = 5, scale = 2)
    private BigDecimal gstPercent;
    // ─────────────────────────────────────────────────────────────

    @Column(name = "min_stock_level")
    private Integer minStockLevel;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Category category;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "rack_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Rack rack;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "box_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Box box;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnore
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    @JsonIgnore
    private User updatedBy;
}