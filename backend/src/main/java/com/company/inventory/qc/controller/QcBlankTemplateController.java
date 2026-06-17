package com.company.inventory.qc.controller;

import com.company.inventory.qc.entity.QcChecklistStage;
import com.company.inventory.qc.entity.QcChecklistTemplate;
import com.company.inventory.qc.exception.QcException;
import com.company.inventory.qc.repository.QcChecklistTemplateRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

/**
 * Downloads blank QC Checklist as .docx or .xlsx
 * Matches the original Excel format exactly (TTPL/QC/F/01)
 * Supports all 6 categories: IC, MECHANICAL, KITTING, PCB, ELECTRONIC, LABEL
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/qc/templates/blank")
@SecurityRequirement(name = "Bearer Authentication")
public class QcBlankTemplateController {

    private final QcChecklistTemplateRepository templateRepo;

    private static final Set<String> ALLOWED = Set.of(
        "IC", "MECHANICAL", "KITTING", "PCB", "ELECTRONIC", "LABEL"
    );

    // ─── Download as DOCX ────────────────────────────────────────────
    @GetMapping("/{categoryCode}/docx")
    @PreAuthorize("hasAnyAuthority('QC','OWNER','MANAGER')")
    @Operation(summary = "Download blank QC checklist as .docx")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> downloadDocx(@PathVariable String categoryCode) throws Exception {
        String code = validate(categoryCode);
        QcChecklistTemplate template = getTemplate(code);
        byte[] bytes = generateDocx(template);
        String fileName = "QC_Checklist_" + code + ".docx";
        log.info("Generating DOCX template for category: {}", code);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(bytes);
    }

    // ─── Download as XLSX ────────────────────────────────────────────
    @GetMapping("/{categoryCode}/excel")
    @PreAuthorize("hasAnyAuthority('QC','OWNER','MANAGER')")
    @Operation(summary = "Download blank QC checklist as .xlsx")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> downloadExcel(@PathVariable String categoryCode) throws Exception {
        String code = validate(categoryCode);
        QcChecklistTemplate template = getTemplate(code);
        byte[] bytes = generateExcel(template);
        String fileName = "QC_Checklist_" + code + ".xlsx";
        log.info("Generating XLSX template for category: {}", code);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    // ─── Kept for backward compatibility ─────────────────────────────
    @GetMapping("/{categoryCode}")
    @PreAuthorize("hasAnyAuthority('QC','OWNER','MANAGER')")
    @Operation(summary = "Download blank QC checklist (.docx) — legacy endpoint")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> downloadLegacy(@PathVariable String categoryCode) throws Exception {
        return downloadDocx(categoryCode);
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXCEL GENERATOR — matches original Excel format exactly
    // ═══════════════════════════════════════════════════════════════════
    private byte[] generateExcel(QcChecklistTemplate template) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            XSSFSheet sheet = wb.createSheet(template.getCategoryCode());

            // ── Styles ──────────────────────────────────────────────
            XSSFCellStyle headerStyle = wb.createCellStyle();
            XSSFFont headerFont = wb.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 12);
            headerStyle.setFont(headerFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            XSSFCellStyle titleStyle = wb.createCellStyle();
            XSSFFont titleFont = wb.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 11);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.CENTER);

            XSSFCellStyle boldStyle = wb.createCellStyle();
            XSSFFont boldFont = wb.createFont();
            boldFont.setBold(true);
            boldStyle.setFont(boldFont);

            XSSFCellStyle tableHeaderStyle = wb.createCellStyle();
            XSSFFont tableHeaderFont = wb.createFont();
            tableHeaderFont.setBold(true);
            tableHeaderStyle.setFont(tableHeaderFont);
            tableHeaderStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            tableHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            tableHeaderStyle.setBorderBottom(BorderStyle.THIN);
            tableHeaderStyle.setBorderTop(BorderStyle.THIN);
            tableHeaderStyle.setBorderLeft(BorderStyle.THIN);
            tableHeaderStyle.setBorderRight(BorderStyle.THIN);
            tableHeaderStyle.setAlignment(HorizontalAlignment.CENTER);
            tableHeaderStyle.setWrapText(true);

            XSSFCellStyle cellStyle = wb.createCellStyle();
            cellStyle.setBorderBottom(BorderStyle.THIN);
            cellStyle.setBorderTop(BorderStyle.THIN);
            cellStyle.setBorderLeft(BorderStyle.THIN);
            cellStyle.setBorderRight(BorderStyle.THIN);
            cellStyle.setWrapText(true);

            XSSFCellStyle centerCellStyle = wb.createCellStyle();
            centerCellStyle.setBorderBottom(BorderStyle.THIN);
            centerCellStyle.setBorderTop(BorderStyle.THIN);
            centerCellStyle.setBorderLeft(BorderStyle.THIN);
            centerCellStyle.setBorderRight(BorderStyle.THIN);
            centerCellStyle.setAlignment(HorizontalAlignment.CENTER);

            // ── Row 0: Company Name + Form No ───────────────────────
            Row row0 = sheet.createRow(0);
            row0.setHeightInPoints(20);
            Cell companyCell = row0.createCell(0);
            companyCell.setCellValue("Thinture Technologies Pvt Ltd");
            companyCell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 3));

            Cell formCell = row0.createCell(4);
            formCell.setCellValue("F No : " + template.getFormNo());
            formCell.setCellStyle(boldStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 4, 5));

            // ── Row 1: Checklist Title ───────────────────────────────
            Row row1 = sheet.createRow(1);
            row1.setHeightInPoints(18);
            Cell titleCell = row1.createCell(0);
            titleCell.setCellValue(template.getCategoryName().toUpperCase() + " INSPECTION CHECK LIST");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, 5));

            // ── Row 2: Invoice No / Received Date / Lot Qty ─────────
            Row row2 = sheet.createRow(2);
            row2.createCell(0).setCellValue("Invoice No:");
            row2.createCell(2).setCellValue("Received Date:");
            row2.createCell(3).setCellValue("Lot Qty:");

            // ── Row 3: Supplier Name / Manufacturer Name ─────────────
            Row row3 = sheet.createRow(3);
            row3.createCell(0).setCellValue("Supplier Name:");
            row3.createCell(3).setCellValue("Manufacturer Name:");

            // ── Row 4: Material Desc ─────────────────────────────────
            Row row4 = sheet.createRow(4);
            row4.createCell(0).setCellValue("Material Desc:");
            sheet.addMergedRegion(new CellRangeAddress(4, 4, 0, 5));

            // ── Row 5: Blank spacer ──────────────────────────────────
            sheet.createRow(5);

            // ── Row 6: Table Header ──────────────────────────────────
            Row headerRow = sheet.createRow(6);
            headerRow.setHeightInPoints(30);
            String[] headers = {"Sl No", "Stage /Operation", "Check Points",
                                 "Inspected Qty\n(as per AQL)", "Remarks", "Pass/Fail/NA"};
            for (int i = 0; i < headers.length; i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(tableHeaderStyle);
            }

            // ── Rows 7+: Stages ──────────────────────────────────────
            List<QcChecklistStage> stages = template.getStages();
            int rowIdx = 7;
            String lastOperation = "";

            for (QcChecklistStage stage : stages) {
                if (stage.getCheckPoint() == null || stage.getCheckPoint().isBlank()) continue;

                Row stageRow = sheet.createRow(rowIdx++);
                stageRow.setHeightInPoints(20);

                // Sl No
                Cell slCell = stageRow.createCell(0);
                slCell.setCellValue(stage.getSlNo());
                slCell.setCellStyle(centerCellStyle);

                // Stage Operation (only show if changed)
                Cell opCell = stageRow.createCell(1);
                String op = stage.getStageOperation() != null ? stage.getStageOperation() : "";
                opCell.setCellValue(op.equals(lastOperation) ? "" : op);
                opCell.setCellStyle(cellStyle);
                if (!op.isBlank()) lastOperation = op;

                // Check Point
                Cell cpCell = stageRow.createCell(2);
                cpCell.setCellValue(stage.getCheckPoint());
                cpCell.setCellStyle(cellStyle);

                // Inspected Qty
                Cell aqCell = stageRow.createCell(3);
                aqCell.setCellValue(stage.getAqlLabel() != null ? stage.getAqlLabel() : "");
                aqCell.setCellStyle(centerCellStyle);

                // Remarks (empty — to be filled)
                Cell remCell = stageRow.createCell(4);
                remCell.setCellValue("");
                remCell.setCellStyle(cellStyle);

                // Pass/Fail/NA (empty — to be filled)
                Cell pfCell = stageRow.createCell(5);
                pfCell.setCellValue("☐ Pass  ☐ Fail  ☐ N/A");
                pfCell.setCellStyle(centerCellStyle);
            }

            // ── Remarks row ──────────────────────────────────────────
            Row remarksRow = sheet.createRow(rowIdx++);
            Cell remLabel = remarksRow.createCell(0);
            remLabel.setCellValue("Remarks:");
            remLabel.setCellStyle(boldStyle);
            sheet.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 1, 5));

            // ── Sign off row ─────────────────────────────────────────
            rowIdx++;
            Row signRow = sheet.createRow(rowIdx);
            signRow.setHeightInPoints(30);
            Cell signCell = signRow.createCell(0);
            signCell.setCellValue(
                "Verified By : ____________________________          " +
                "Lot is   ☐ Accepted   ☐ Rejected   ☐ Hold"
            );
            signCell.setCellStyle(boldStyle);
            sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, 5));

            // ── Column widths ────────────────────────────────────────
            sheet.setColumnWidth(0, 8 * 256);     // Sl No
            sheet.setColumnWidth(1, 22 * 256);    // Stage Operation
            sheet.setColumnWidth(2, 45 * 256);    // Check Points
            sheet.setColumnWidth(3, 18 * 256);    // Inspected Qty
            sheet.setColumnWidth(4, 25 * 256);    // Remarks
            sheet.setColumnWidth(5, 20 * 256);    // Pass/Fail

            // ── Print setup ──────────────────────────────────────────
            sheet.getPrintSetup().setLandscape(false);
            sheet.getPrintSetup().setPaperSize(PrintSetup.A4_PAPERSIZE);
            sheet.setFitToPage(true);

            wb.write(out);
            return out.toByteArray();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DOCX GENERATOR — matches Excel format
    // ═══════════════════════════════════════════════════════════════════
    private byte[] generateDocx(QcChecklistTemplate template) throws Exception {
        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // ── Company Header ───────────────────────────────────────
            XWPFParagraph companyPara = doc.createParagraph();
            companyPara.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun companyRun = companyPara.createRun();
            companyRun.setText("Thinture Technologies Pvt Ltd");
            companyRun.setBold(true);
            companyRun.setFontSize(14);
            companyRun.setFontFamily("Arial");

            // Form No (right aligned via tab)
            XWPFParagraph formPara = doc.createParagraph();
            formPara.setAlignment(ParagraphAlignment.RIGHT);
            XWPFRun formRun = formPara.createRun();
            formRun.setText("F No : " + template.getFormNo());
            formRun.setBold(true);
            formRun.setFontSize(10);
            formRun.setFontFamily("Arial");

            // ── Title ────────────────────────────────────────────────
            XWPFParagraph titlePara = doc.createParagraph();
            titlePara.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun titleRun = titlePara.createRun();
            titleRun.setText(template.getCategoryName().toUpperCase() + " INSPECTION CHECK LIST");
            titleRun.setBold(true);
            titleRun.setFontSize(13);
            titleRun.setFontFamily("Arial");

            // ── Meta Info Table ──────────────────────────────────────
            doc.createParagraph();
            XWPFTable metaTable = doc.createTable(3, 4);
            metaTable.setWidth("100%");
            setCellText(metaTable.getRow(0).getCell(0), "Invoice No:", true);
            setCellText(metaTable.getRow(0).getCell(1), "________________________________", false);
            setCellText(metaTable.getRow(0).getCell(2), "Received Date:", true);
            setCellText(metaTable.getRow(0).getCell(3), "________________", false);

            setCellText(metaTable.getRow(1).getCell(0), "Supplier Name:", true);
            setCellText(metaTable.getRow(1).getCell(1), "________________________________", false);
            setCellText(metaTable.getRow(1).getCell(2), "Manufacturer Name:", true);
            setCellText(metaTable.getRow(1).getCell(3), "________________", false);

            setCellText(metaTable.getRow(2).getCell(0), "Material Desc:", true);
            setCellText(metaTable.getRow(2).getCell(1), "________________________________", false);
            setCellText(metaTable.getRow(2).getCell(2), "Lot Qty:", true);
            setCellText(metaTable.getRow(2).getCell(3), "________________", false);

            doc.createParagraph();

            // ── Stages Table ─────────────────────────────────────────
            XWPFTable stagesTable = doc.createTable(1, 6);
            stagesTable.setWidth("100%");

            // Header row
            XWPFTableRow headerRow = stagesTable.getRow(0);
            setCellText(headerRow.getCell(0), "Sl No", true);
            setCellText(headerRow.getCell(1), "Stage /Operation", true);
            setCellText(headerRow.getCell(2), "Check Points", true);
            setCellText(headerRow.getCell(3), "Inspected Qty\n(as per AQL)", true);
            setCellText(headerRow.getCell(4), "Remarks", true);
            setCellText(headerRow.getCell(5), "Pass/Fail/NA", true);
            shadeRow(headerRow, "D9E2F3");

            // Stage rows
            List<QcChecklistStage> stages = template.getStages();
            String lastOp = "";
            for (QcChecklistStage s : stages) {
                if (s.getCheckPoint() == null || s.getCheckPoint().isBlank()) continue;
                XWPFTableRow row = stagesTable.createRow();
                setCellText(row.getCell(0), String.valueOf(s.getSlNo()), false);
                String op = s.getStageOperation() != null ? s.getStageOperation() : "";
                setCellText(row.getCell(1), op.equals(lastOp) ? "" : op, false);
                if (!op.isBlank()) lastOp = op;
                setCellText(row.getCell(2), s.getCheckPoint(), false);
                setCellText(row.getCell(3), s.getAqlLabel() != null ? s.getAqlLabel() : "", false);
                setCellText(row.getCell(4), "", false);
                setCellText(row.getCell(5), "☐ Pass  ☐ Fail  ☐ N/A", false);
            }

            // ── Remarks ──────────────────────────────────────────────
            doc.createParagraph();
            XWPFParagraph remPara = doc.createParagraph();
            XWPFRun remRun = remPara.createRun();
            remRun.setText("Remarks:");
            remRun.setBold(true);
            remRun.setFontSize(11);
            remRun.setFontFamily("Arial");

            for (int i = 0; i < 3; i++) {
                XWPFParagraph line = doc.createParagraph();
                line.createRun().setText("____________________________________________________________________________");
            }

            // ── Sign off ─────────────────────────────────────────────
            doc.createParagraph();
            doc.createParagraph();
            XWPFTable sigTable = doc.createTable(1, 2);
            sigTable.setWidth("100%");
            setCellText(sigTable.getRow(0).getCell(0),
                "Verified By : ________________________\nName & Signature", true);
            setCellText(sigTable.getRow(0).getCell(1),
                "Lot is   ☐ Accepted   ☐ Rejected   ☐ Hold", true);

            doc.write(out);
            return out.toByteArray();
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────
    private String validate(String code) {
        String c = code == null ? "" : code.toUpperCase();
        if (!ALLOWED.contains(c)) throw QcException.badRequest("Unknown category: " + code);
        return c;
    }

    private QcChecklistTemplate getTemplate(String code) {
        return templateRepo.findByCategoryCode(code)
                .orElseThrow(() -> QcException.notFound("No template found for: " + code));
    }

    private void setCellText(XWPFTableCell cell, String text, boolean bold) {
        cell.removeParagraph(0);
        XWPFParagraph p = cell.addParagraph();
        XWPFRun run = p.createRun();
        run.setText(text);
        run.setBold(bold);
        run.setFontSize(10);
        run.setFontFamily("Arial");
    }

    private void shadeRow(XWPFTableRow row, String hexColor) {
        for (XWPFTableCell cell : row.getTableCells()) {
            cell.setColor(hexColor);
        }
    }
}