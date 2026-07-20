package com.company.inventory.qc.controller;

import com.company.inventory.qc.entity.QcChecklistStage;
import com.company.inventory.qc.entity.QcChecklistTemplate;
import com.company.inventory.qc.repository.QcChecklistTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Seeds the "Sub-Contractor Work Monitoring Report" QC checklist template
 * (Form TTPL QC F 02 / DOC No TTPL/SCWMR/01, Rev 1).
 *
 * Idempotent: only inserts if categoryCode "SCWMR" is not already present,
 * so it is safe to leave enabled across restarts.
 *
 * NOTE: This assumes QcChecklistTemplate exposes the usual setters
 * (setCategoryCode / setCategoryName / setFormNo / setActive) and that
 * getStages() returns a mutable collection — matching the style already used
 * in QcTemplateService. If your entity uses a @Builder instead, swap the
 * "new QcChecklistTemplate()" block for the builder equivalent.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(20)
public class QcSubContractorTemplateSeeder implements CommandLineRunner {

    private static final String CATEGORY_CODE = "SCWMR";

    private final QcChecklistTemplateRepository templateRepo;

    @Override
    @Transactional
    public void run(String... args) {
        if (templateRepo.findByCategoryCode(CATEGORY_CODE).isPresent()) {
            log.debug("QC template '{}' already exists — skipping seed.", CATEGORY_CODE);
            return;
        }

        QcChecklistTemplate template = new QcChecklistTemplate();
        template.setCategoryCode(CATEGORY_CODE);
        template.setCategoryName("Sub Contractor Work Monitoring Report");
        template.setFormNo("TTPL QC F 02");
        template.setActive(true);

        // process, specification, samplingFrequency (mapped to aqlLabel)
        String[][] rows = {
            {"Assembled PCB Visual Inspection", "Check for any shorts or any Components is missing", "1 Out of 10"},
            {"Wireharness Soldering",           "Check for wiring Colour Code with wiring Diagram.", "1 Out of 10"},
            {"Final Test",                      "Function",                                          "1 Out of 10"},
            {"Overall Check",                   "Outside Visual inspection",                         "1 Out of 10"},
        };

        int slNo = 1;
        for (String[] r : rows) {
            QcChecklistStage stage = new QcChecklistStage();
            stage.setTemplate(template);
            stage.setSlNo(slNo++);
            stage.setStageOperation(r[0]);
            stage.setCheckPoint(r[1]);
            stage.setAqlLabel(r[2]);
            template.getStages().add(stage);
        }

        QcChecklistTemplate saved = templateRepo.save(template);
        log.info("Seeded QC template '{}' ({}) with {} stages.",
                saved.getCategoryCode(), saved.getCategoryName(), rows.length);
    }
}
