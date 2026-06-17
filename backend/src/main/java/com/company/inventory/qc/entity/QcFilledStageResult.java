package com.company.inventory.qc.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "qc_filled_stage_result")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class QcFilledStageResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "filled_checklist_id", nullable = false)
    @JsonIgnore
    private QcFilledChecklist filledChecklist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id", nullable = false)
    private QcChecklistStage stage;

    /** PASS / FAIL / NA */
    @Column(name = "result", nullable = false, length = 10)
    private String result;

    @Column(name = "remarks", length = 500)
    private String remarks;
}
