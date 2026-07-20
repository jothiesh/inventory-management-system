package com.company.inventory.qc.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One filled checkpoint row.
 *
 * ★ CHANGED: added `lotId` and `inspectedQty`.
 *
 *   lotId        — a batch can hold several lots inspected against the same
 *                  template (3 wire colours, one ELECTRONIC checklist). Each
 *                  lot carries its own Pass/Fail per checkpoint, so a result
 *                  must be keyed by (checklist, stage, lot).
 *   inspectedQty — the "Inspected Qty (AQL)" column. String, because the form
 *                  accepts "1 Out of 10" as well as "1".
 */
@Entity
@Table(
    name = "qc_filled_stage_result",
    indexes = {
        @Index(name = "ix_qfsr_checklist", columnList = "filled_checklist_id"),
        @Index(name = "ix_qfsr_lot",       columnList = "lot_id")
    }
)
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
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "template"})
    private QcChecklistStage stage;

    /** ★ Which lot this row was filled for. Null = whole batch. */
    @Column(name = "lot_id")
    private Long lotId;

    /** PASS / FAIL / NA */
    @Column(name = "result", nullable = false, length = 10)
    private String result;

    @Column(name = "remarks", length = 500)
    private String remarks;

    /** ★ "Inspected Qty (AQL)" as typed. */
    @Column(name = "inspected_qty", length = 50)
    private String inspectedQty;
}