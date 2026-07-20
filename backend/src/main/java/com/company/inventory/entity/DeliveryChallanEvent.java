package com.company.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Timeline event of a Delivery Challan (DC_CREATED, DC_SENT, ASSEMBLY_RECEIVED, CLOSED). */
@Entity
@Table(name = "delivery_challan_events")
@Getter
@Setter
@NoArgsConstructor
public class DeliveryChallanEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dc_id", nullable = false)
    private Long dcId;

    @Column(name = "event_type", length = 40)
    private String eventType;

    @Column(length = 160)
    private String title;

    @Column(length = 1000)
    private String detail;

    @Column(name = "happened_at")
    private LocalDateTime happenedAt;

    @PrePersist
    void prePersist() {
        if (happenedAt == null) happenedAt = LocalDateTime.now();
    }
}
