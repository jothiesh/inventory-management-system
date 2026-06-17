package com.company.inventory.entity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_movements")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long movementId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id", nullable = false)
    @JsonIgnore  // ✅ FIX
    private Lot lot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore  // ✅ FIX
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MovementType movementType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionType transactionType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_rack_id")
    @JsonIgnore  // ✅ FIX
    private Rack fromRack;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_box_id")
    @JsonIgnore  // ✅ FIX
    private Box fromBox;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_rack_id")
    @JsonIgnore  // ✅ FIX
    private Rack toRack;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_box_id")
    @JsonIgnore  // ✅ FIX
    private Box toBox;

    @Column(length = 100)
    private String referenceNumber;

    @Column(columnDefinition = "TEXT")
    private String notes;
//
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnore  // ✅ FIX
    private User createdBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "transaction_group_id", length = 36)
    private String transactionGroupId;

    @Column(name = "reversed", nullable = false)
    private boolean reversed = false;
    public enum MovementType { IN, OUT }
    public enum TransactionType { Purchase, Production, Sale, Damage, Scrap, Reversal, Semi_Finish, Other }
}