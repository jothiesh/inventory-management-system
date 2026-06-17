package com.company.inventory.qc.service;

import com.company.inventory.qc.dto.ChecklistTemplateDto;
import com.company.inventory.qc.entity.QcChecklistStage;
import com.company.inventory.qc.entity.QcChecklistTemplate;
import com.company.inventory.qc.exception.QcException;
import com.company.inventory.qc.repository.QcChecklistTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QcTemplateService {

    private final QcChecklistTemplateRepository templateRepo;

    // ─── Get all active templates ─────────────────────────────────
    @Transactional(readOnly = true)
    public List<ChecklistTemplateDto> getAllActiveTemplates() {
        log.debug("Fetching all active QC checklist templates.");
        return templateRepo.findByActiveTrueOrderByCategoryCodeAsc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    // ─── Get by category code ─────────────────────────────────────
    @Transactional(readOnly = true)
    public ChecklistTemplateDto getByCategoryCode(String categoryCode) {
        log.debug("Fetching template for category: {}", categoryCode);
        QcChecklistTemplate t = templateRepo.findByCategoryCode(categoryCode)
                .orElseThrow(() -> QcException.notFound("No checklist template for: " + categoryCode));
        return toDto(t);
    }

    // ─── Update stages (Edit Template) ───────────────────────────
    @Transactional
    public ChecklistTemplateDto updateStages(String categoryCode, List<Map<String, Object>> stagesData) {
        log.info("Updating stages for template category: {}", categoryCode);

        QcChecklistTemplate template = templateRepo.findByCategoryCode(categoryCode)
                .orElseThrow(() -> QcException.notFound("No checklist template for: " + categoryCode));

        // Clear existing stages
        template.getStages().clear();
        templateRepo.save(template);

        // Build new stages from request data
        List<QcChecklistStage> newStages = new ArrayList<>();
        int slNo = 1;
        for (Map<String, Object> sd : stagesData) {
            String checkPoint = sd.get("checkPoint") != null ? sd.get("checkPoint").toString() : "";
            if (checkPoint.isBlank()) continue;

            QcChecklistStage stage = new QcChecklistStage();
            stage.setTemplate(template);
            stage.setSlNo(slNo++);
            stage.setStageOperation(sd.get("stageOperation") != null ? sd.get("stageOperation").toString() : "Visual Inspection");
            stage.setCheckPoint(checkPoint);
            stage.setAqlLabel(sd.get("aqlLabel") != null ? sd.get("aqlLabel").toString() : "As per AQL");
            newStages.add(stage);
        }

        template.getStages().addAll(newStages);
        QcChecklistTemplate saved = templateRepo.save(template);
        log.info("Updated {} stages for template: {}", newStages.size(), categoryCode);
        return toDto(saved);
    }

    // ─── Mapper ──────────────────────────────────────────────────
    private ChecklistTemplateDto toDto(QcChecklistTemplate t) {
        List<ChecklistTemplateDto.StageDto> stages = t.getStages().stream()
                .map(this::toStageDto)
                .collect(Collectors.toList());
        return ChecklistTemplateDto.builder()
                .id(t.getId())
                .categoryCode(t.getCategoryCode())
                .categoryName(t.getCategoryName())
                .formNo(t.getFormNo())
                .stages(stages)
                .build();
    }

    private ChecklistTemplateDto.StageDto toStageDto(QcChecklistStage s) {
        return ChecklistTemplateDto.StageDto.builder()
                .id(s.getId())
                .slNo(s.getSlNo())
                .stageOperation(s.getStageOperation())
                .checkPoint(s.getCheckPoint())
                .aqlMin(s.getAqlMin())
                .aqlMax(s.getAqlMax())
                .aqlLabel(s.getAqlLabel())
                .build();
    }
}