package com.company.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "purchase_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pr_code", unique = true, nullable = false)
    private String prCode;

    @Column(name = "pr_date", nullable = false)
    private LocalDate prDate;

    // ── Status: PENDING / APPROVED / REJECTED ────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PRStatus status = PRStatus.PENDING;

    public enum PRStatus {
        PENDING, APPROVED, REJECTED
    }

    @Column(name = "total_amount", precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "total_in_words")
    private String totalInWords;

    @Column(name = "notes")
    private String notes;

    @OneToMany(mappedBy = "purchaseRequest", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<PurchaseRequestItem> items;

    @ManyToOne
    @JoinColumn(name = "created_by")
    @JsonIgnore
    private User createdBy;

    // ── Safe string for frontend ──────────────────────────────────────
    @Transient
    public String getCreatedByName() {
        return createdBy != null ? createdBy.getFullName() : null;
    }

    // ── Approved by ───────────────────────────────────────────────────
    @ManyToOne
    @JoinColumn(name = "approved_by")
    @JsonIgnore
    private User approvedBy;

    @Transient
    public String getApprovedByName() {
        return approvedBy != null ? approvedBy.getFullName() : null;
    }

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = PRStatus.PENDING;
    }
}