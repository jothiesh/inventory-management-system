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
import java.util.LinkedHashMap;
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
    /**
     * ★ REWRITTEN — stage ids are now STABLE across an edit.
     *
     * The old implementation did:
     *      template.getStages().clear();  save();  addAll(newStages);  save();
     *
     * which deleted every row and inserted fresh ones, so every stage got a new
     * primary key. That was survivable only while nothing referenced a stage.
     * It now matters, for two reasons:
     *
     *   1. qc_filled_stage_result.stage_id is an FK to qc_checklist_stage.id.
     *      Recreating stages orphans (or FK-violates) every saved checklist —
     *      a cosmetic template edit would destroy historical QC records.
     *   2. The inspection UI keys its "applicable checkpoints" selection by
     *      stage id, so ids changing underneath silently reset the form.
     *
     * The clear()+addAll() was also unsafe on its own: Hibernate may order the
     * inserts before the deletes and trip (template_id, sl_no) uniqueness.
     *
     * New behaviour — reconcile in place:
     *   · row carrying an existing id  → UPDATE that row
     *   · row with no id               → INSERT
     *   · existing row not sent back   → DELETE (orphanRemoval)
     */
    @Transactional
    public ChecklistTemplateDto updateStages(String categoryCode, List<Map<String, Object>> stagesData) {
        log.info("Updating stages for template category: {}", categoryCode);

        QcChecklistTemplate template = templateRepo.findByCategoryCode(categoryCode)
                .orElseThrow(() -> QcException.notFound("No checklist template for: " + categoryCode));

        if (stagesData == null || stagesData.isEmpty()) {
            throw QcException.badRequest("stages list is required and cannot be empty");
        }

        // existing rows by id, so we can update rather than replace
        Map<Long, QcChecklistStage> existing = new LinkedHashMap<>();
        for (QcChecklistStage s : template.getStages()) {
            if (s.getId() != null) existing.put(s.getId(), s);
        }

        List<QcChecklistStage> ordered = new ArrayList<>();
        int slNo = 1, updated = 0, inserted = 0;

        for (Map<String, Object> sd : stagesData) {
            String checkPoint = str(sd.get("checkPoint"));
            if (checkPoint == null || checkPoint.isBlank()) continue;   // skip empty rows

            Long id = asLong(sd.get("id"));
            QcChecklistStage stage = (id != null) ? existing.get(id) : null;

            if (stage == null) {
                stage = new QcChecklistStage();
                stage.setTemplate(template);
                inserted++;
            } else {
                updated++;
            }

            stage.setSlNo(slNo++);
            stage.setStageOperation(orDefault(str(sd.get("stageOperation")), "Visual Inspection"));
            stage.setCheckPoint(checkPoint);
            stage.setAqlLabel(orDefault(str(sd.get("aqlLabel")), "As per AQL"));
            stage.setAqlMin(asInt(sd.get("aqlMin")));
            stage.setAqlMax(asInt(sd.get("aqlMax")));
            ordered.add(stage);
        }

        if (ordered.isEmpty()) {
            throw QcException.badRequest("No stage had a check point — nothing to save");
        }

        long removed = template.getStages().stream().filter(s -> !ordered.contains(s)).count();

        // Mutate the managed collection in place; orphanRemoval deletes the rest.
        template.getStages().clear();
        template.getStages().addAll(ordered);

        QcChecklistTemplate saved = templateRepo.save(template);
        log.info("Template {} reconciled: {} updated, {} inserted, {} removed (stage ids preserved).",
                categoryCode, updated, inserted, removed);
        return toDto(saved);
    }

    // ─── Helpers ─────────────────────────────────────────────────
    private static String str(Object o) { return o == null ? null : o.toString().trim(); }

    private static String orDefault(String v, String d) {
        return (v == null || v.isBlank()) ? d : v;
    }

    private static Long asLong(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        try { return Long.parseLong(o.toString().trim()); }
        catch (NumberFormatException e) { return null; }
    }

    private static Integer asInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(o.toString().trim()); }
        catch (NumberFormatException e) { return null; }
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