package com.company.inventory.entity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "racks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Rack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rack_id")
    private Long rackId;

    @Column(name = "rack_number", unique = true, nullable = false, length = 20)
    private String rackNumber;

    @Column(name = "rack_code", length = 20)
    private String rackCode;

    @Column(name = "rack_name", length = 100)
    private String rackName;

    @Column(name = "location", length = 100)
    private String location;

    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnore  // ✅ FIX
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void syncRackCode() {
        if (this.rackCode == null && this.rackNumber != null) {
            this.rackCode = this.rackNumber;
        }
        if (this.rackNumber == null && this.rackCode != null) {
            this.rackNumber = this.rackCode;
        }
    }
}