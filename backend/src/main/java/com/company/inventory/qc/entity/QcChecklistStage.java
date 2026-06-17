package com.company.inventory.qc.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "qc_checklist_stage")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class QcChecklistStage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    @JsonIgnore
    private QcChecklistTemplate template;

    @Column(name = "sl_no", nullable = false)
    private Integer slNo;

    @Column(name = "stage_operation", length = 255)
    private String stageOperation;

    @Column(name = "check_point", nullable = false, length = 500)
    private String checkPoint;

    @Column(name = "aql_min")
    private Integer aqlMin;

    @Column(name = "aql_max")
    private Integer aqlMax;

    @Column(name = "aql_label", length = 50)
    private String aqlLabel;
}
