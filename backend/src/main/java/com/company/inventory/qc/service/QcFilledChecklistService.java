package com.company.inventory.qc.service;

import com.company.inventory.qc.dto.ChecklistResultDto;
import com.company.inventory.qc.dto.FilledChecklistDto;
import com.company.inventory.qc.entity.QcChecklistStage;
import com.company.inventory.qc.entity.QcChecklistTemplate;
import com.company.inventory.qc.entity.QcFilledChecklist;
import com.company.inventory.qc.entity.QcFilledStageResult;
import com.company.inventory.qc.entity.QcInspection;
import com.company.inventory.qc.exception.QcException;
import com.company.inventory.qc.repository.QcChecklistTemplateRepository;
import com.company.inventory.qc.repository.QcFilledChecklistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Owns the filled QC checklist — the inspector's real work:
 * Inspected Qty (AQL), per-checkpoint Remarks, and Pass/Fail/NA.
 *
 * Until now the frontend sent all of this as "checklistResults" and the
 * backend silently discarded it: no DTO field received it, and nothing ever
 * wrote a QcFilledChecklist row. The stored PDF therefore printed blank
 * checkboxes, and re-opening a finished inspection showed an empty form.
 *
 * LIFECYCLE
 * ─────────
 *  1. Inspector clicks Download on the QC Inspection screen
 *       → POST /api/qc/checklists/draft
 *       → saveDraft(): row written with batch_id set, inspection_id NULL.
 *         Re-downloading overwrites the same draft (upsert, not duplicate).
 *
 *  2. Inspector submits the decision
 *       → QcInspectionService calls attachToInspection()
 *       → the draft is claimed (inspection_id set). If the submit carried its
 *         own checklistResults those win, because they are newer than the
 *         draft.
 *
 *  3. Approved / Rejected list re-opens the checklist
 *       → GET /api/qc/inspections/{id}/checklist
 *       → getForInspection(): every Qty / Remark / tick comes back.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QcFilledChecklistService {

    private final QcFilledChecklistRepository   filledRepo;
    private final QcChecklistTemplateRepository templateRepo;

    // ═════════════════════════════════════════════════════════
    // 1. SAVE ON DOWNLOAD  (draft — no inspection yet)
    // ═════════════════════════════════════════════════════════

    @Transactional
    public FilledChecklistDto saveDraft(Long batchId, String templateCode,
                                        List<ChecklistResultDto> results) {

        if (batchId == null)              throw QcException.badRequest("batchId is required");
        if (isBlank(templateCode))        throw QcException.badRequest("templateCode is required");

        QcChecklistTemplate template = loadTemplate(templateCode);

        // Upsert: one draft per batch. Re-downloading must not pile up rows.
        List<QcFilledChecklist> existing = filledRepo.findByBatchIdAndInspectionIsNull(batchId);
        QcFilledChecklist target;

        if (existing.isEmpty()) {
            target = new QcFilledChecklist();
            target.setBatchId(batchId);
            log.debug("New checklist draft for batch {}", batchId);
        } else {
            target = existing.get(0);
            // defensive: an older bug or a race could leave more than one
            if (existing.size() > 1) {
                log.warn("Batch {} had {} checklist drafts — keeping id={}, deleting the rest",
                        batchId, existing.size(), target.getId());
                filledRepo.deleteAll(existing.subList(1, existing.size()));
            }
        }

        applyTemplateAndResults(target, template, results);
        QcFilledChecklist saved = filledRepo.save(target);

        log.info("Checklist draft saved on download. batch={}, template={}, rows={}",
                batchId, template.getCategoryCode(), saved.getResults().size());
        return toDto(saved);
    }

    // ═════════════════════════════════════════════════════════
    // 2. CLAIM ON SUBMIT
    // ═════════════════════════════════════════════════════════

    /**
     * Called from QcInspectionService after the inspection row is created.
     *
     * Never throws into the decision transaction for checklist reasons alone —
     * a QC decision must not be lost because a checklist row misbehaved.
     */
    @Transactional
    public void attachToInspection(QcInspection inspection, Long batchId,
                                   String templateCode, List<ChecklistResultDto> results) {
        try {
            boolean hasFresh = results != null && !results.isEmpty();
            Optional<QcFilledChecklist> draft = filledRepo.findByBatchIdAndInspectionIsNull(batchId)
                    .stream().findFirst();

            if (!hasFresh && draft.isEmpty()) {
                log.debug("No checklist to attach for batch {} — nothing was filled in", batchId);
                return;
            }

            String code = !isBlank(templateCode)
                    ? templateCode
                    : draft.map(QcFilledChecklist::getCategoryCode).orElse(null);
            if (isBlank(code)) {
                log.warn("Checklist for batch {} has no template code — skipping attach", batchId);
                return;
            }

            QcChecklistTemplate template = loadTemplate(code);
            QcFilledChecklist target = draft.orElseGet(() -> {
                QcFilledChecklist c = new QcFilledChecklist();
                c.setBatchId(batchId);
                return c;
            });

            // Fresh results from the submit are newer than the draft — they win.
            if (hasFresh) {
                applyTemplateAndResults(target, template, results);
            } else {
                target.setTemplate(template);
                target.setCategoryCode(template.getCategoryCode());
            }

            target.setInspection(inspection);   // ★ draft becomes a committed record
            QcFilledChecklist saved = filledRepo.save(target);

            log.info("Checklist attached to inspection {}. batch={}, template={}, rows={}, source={}",
                    inspection.getId(), batchId, code, saved.getResults().size(),
                    hasFresh ? "submit payload" : "download draft");

        } catch (Exception e) {
            // Decision integrity outranks the checklist.
            log.error("Failed to attach checklist to inspection {} (batch {}): {}",
                    inspection != null ? inspection.getId() : null, batchId, e.getMessage(), e);
        }
    }

    // ═════════════════════════════════════════════════════════
    // 3. READ BACK
    // ═════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public FilledChecklistDto getForInspection(Long inspectionId) {
        return filledRepo.findByInspectionId(inspectionId)
                .map(this::toDto)
                .orElseThrow(() -> QcException.notFound(
                        "No saved checklist for inspection " + inspectionId));
    }

    /** Null-safe variant — the modal uses this to decide between filled and blank. */
    @Transactional(readOnly = true)
    public FilledChecklistDto findForInspection(Long inspectionId) {
        return filledRepo.findByInspectionId(inspectionId).map(this::toDto).orElse(null);
    }

    @Transactional(readOnly = true)
    public FilledChecklistDto findDraftForBatch(Long batchId) {
        return filledRepo.findDraftByBatchId(batchId).map(this::toDto).orElse(null);
    }

    // ═════════════════════════════════════════════════════════
    // HELPERS
    // ═════════════════════════════════════════════════════════

    private QcChecklistTemplate loadTemplate(String code) {
        String c = code.toUpperCase().trim();
        return templateRepo.findByCategoryCode(c)
                .orElseThrow(() -> QcException.notFound("No checklist template for: " + c));
    }

    /**
     * Rewrite this checklist's rows from the incoming payload.
     *
     * Stage ids are resolved against the template — a stageId that does not
     * belong to it is dropped with a warning rather than blowing up the whole
     * save. (Stale ids are exactly what template editing used to produce.)
     */
    private void applyTemplateAndResults(QcFilledChecklist target,
                                         QcChecklistTemplate template,
                                         List<ChecklistResultDto> results) {

        target.setTemplate(template);
        target.setCategoryCode(template.getCategoryCode());

        Map<Long, QcChecklistStage> byId = template.getStages().stream()
                .filter(s -> s.getId() != null)
                .collect(Collectors.toMap(QcChecklistStage::getId, Function.identity(), (a, b) -> a));

        // orphanRemoval handles the delete of whatever was there before
        target.getResults().clear();
        if (results == null) return;

        List<QcFilledStageResult> rows = new ArrayList<>();
        for (ChecklistResultDto r : results) {
            if (r == null || r.getStageId() == null) continue;

            QcChecklistStage stage = byId.get(r.getStageId());
            if (stage == null) {
                log.warn("Stage {} is not part of template {} — row skipped",
                        r.getStageId(), template.getCategoryCode());
                continue;
            }

            QcFilledStageResult row = new QcFilledStageResult();
            row.setFilledChecklist(target);
            row.setStage(stage);
            row.setLotId(r.getLotId());
            row.setResult(normaliseResult(r.getResult()));
            row.setRemarks(trim(r.getRemarks(), 500));
            row.setInspectedQty(trim(r.getInspectedQty(), 50));
            rows.add(row);
        }
        target.getResults().addAll(rows);
    }

    /** result column is NOT NULL — anything unrecognised becomes NA. */
    private String normaliseResult(String v) {
        if (isBlank(v)) return "NA";
        String u = v.toUpperCase().trim();
        return switch (u) {
            case "PASS", "FAIL", "NA" -> u;
            default -> {
                log.debug("Unknown checkpoint result '{}' — stored as NA", v);
                yield "NA";
            }
        };
    }

    private FilledChecklistDto toDto(QcFilledChecklist c) {
        List<ChecklistResultDto> rows = c.getResults().stream()
                .map(r -> ChecklistResultDto.builder()
                        .lotId(r.getLotId())
                        .stageId(r.getStage() != null ? r.getStage().getId() : null)
                        .result(r.getResult())
                        .remarks(r.getRemarks())
                        .inspectedQty(r.getInspectedQty())
                        .build())
                .collect(Collectors.toList());

        QcChecklistTemplate t = c.getTemplate();
        return FilledChecklistDto.builder()
                .id(c.getId())
                .inspectionId(c.getInspection() != null ? c.getInspection().getId() : null)
                .batchId(c.getBatchId())
                .templateCode(c.getCategoryCode())
                .categoryName(t != null ? t.getCategoryName() : null)
                .formNo(t != null ? t.getFormNo() : null)
                .draft(c.getInspection() == null)
                .results(rows)
                .build();
    }

    private static boolean isBlank(String s) { return s == null || s.isBlank(); }

    private static String trim(String s, int max) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        return t.length() <= max ? t : t.substring(0, max);
    }
}