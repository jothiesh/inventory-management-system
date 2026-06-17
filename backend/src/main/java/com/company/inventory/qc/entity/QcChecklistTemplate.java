package com.company.inventory.qc.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Checklist template tied to a material category code.
 * Seed: STICKER, IC, PCB, ENCLOSURE.
 */
@Entity
@Table(name = "qc_checklist_template")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class QcChecklistTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_code", unique = true, nullable = false, length = 50)
    private String categoryCode;

    @Column(name = "category_name", nullable = false, length = 100)
    private String categoryName;

    @Column(name = "form_no", nullable = false, length = 50)
    private String formNo;

    @Column(name = "active")
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "template", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("slNo ASC")
    @JsonIgnore
    private List<QcChecklistStage> stages = new ArrayList<>();
}
