package com.company.inventory.qc.pdf;

import com.company.inventory.qc.dto.ChecklistResultDto;
import com.company.inventory.qc.dto.ChecklistTemplateDto;
import com.company.inventory.qc.dto.FilledChecklistDto;
import com.company.inventory.qc.entity.QcInspection;
import com.company.inventory.qc.service.QcFilledChecklistService;
import com.company.inventory.qc.service.QcTemplateService;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Generates the filled QC inspection PDF and returns the absolute file path.
 *
 * The single most common reason downloads failed before: the output directory
 * did not exist, so the write threw and pdfPath was never set. This class
 * ALWAYS creates the directory first (Files.createDirectories).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QcChecklistPdfGenerator {

    private final QcTemplateService templateService;
    private final QcFilledChecklistService filledChecklistService;

    /** Configurable via application.properties: qc.pdf.output-dir=/var/app/qc-pdfs */
    @Value("${qc.pdf.output-dir:qc-pdfs}")
    private String outputDir;

    private static final DeviceRgb HEADER_BLUE = new DeviceRgb(0xD9, 0xE2, 0xF3);
    private static final DeviceRgb GREY_LINE   = new DeviceRgb(0xB0, 0xB8, 0xC4);
    private static final DateTimeFormatter D_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    public String generate(QcInspection insp) throws Exception {
        // ── Pull fields (adjust getter names here if your entity differs) ──
        Long   inspId       = insp.getId();
        
        String invoiceNo    = safe(insp.getInvoiceNo());
        
        String supplierName = safe(insp.getSupplierName());
        
        String decision     = safe(insp.getOverallDecision());
        
        String remarks      = safe(insp.getOverallRemarks());
        
        String templateCode = insp.getTemplateCode();
        
        
        String batchRef     = insp.getBatch() != null ? safe(insp.getBatch().getBatchRef()) : "";
        
        String lotQty       = insp.getLotCount() != null ? String.valueOf(insp.getLotCount()) : "";
        
        String inspector    = insp.getInspectedBy() != null ? insp.getInspectedBy().getUsername() : "";
        
        String receivedDate = insp.getReceivedDate() != null ? fmt(insp.getReceivedDate()) : "";
        

        // ── Resolve template + stages ──
        ChecklistTemplateDto tpl = null;
        try {
            if (templateCode != null && !templateCode.isBlank())
                tpl = templateService.getByCategoryCode(templateCode.toUpperCase().trim());
        } catch (Exception e) {
            log.warn("Template '{}' not found for inspection {} — rendering without stage rows",
                    templateCode, inspId);
        }
        // ★ The saved checklist — Inspected Qty (AQL), remarks and Pass/Fail/NA
        //   as actually entered. Before this existed the generator rendered the
        //   BLANK template, so every stored report printed empty checkboxes.
        Map<Long, ChecklistResultDto> filled = Map.of();
        try {
            FilledChecklistDto saved = filledChecklistService.findForInspection(inspId);
            if (saved != null && saved.getResults() != null) {
                filled = saved.getResults().stream()
                        .filter(r -> r.getStageId() != null)
                        .collect(Collectors.toMap(ChecklistResultDto::getStageId,
                                Function.identity(), (a, b) -> a));
                // the template recorded with the checklist beats the guess above
                if (tpl == null && saved.getTemplateCode() != null) {
                    try { tpl = templateService.getByCategoryCode(saved.getTemplateCode()); }
                    catch (Exception ignored) { }
                }
            }
        } catch (Exception e) {
            log.warn("No saved checklist for inspection {} — printing a blank form: {}",
                    inspId, e.getMessage());
        }

        String categoryName = tpl != null ? tpl.getCategoryName() : "QC";
        String formNo       = tpl != null ? tpl.getFormNo() : "";
        List<ChecklistTemplateDto.StageDto> stages =
                tpl != null && tpl.getStages() != null ? tpl.getStages() : List.of();

        // ── Ensure output directory exists (THE critical fix) ──
        Path dir = Paths.get(outputDir).toAbsolutePath();
        Files.createDirectories(dir);
        String fileName = "QC-Inspection-" + inspId + ".pdf";
        Path   target   = dir.resolve(fileName);

        try (PdfWriter writer = new PdfWriter(target.toFile());
             PdfDocument pdf  = new PdfDocument(writer);
             Document doc     = new Document(pdf, PageSize.A4)) {

            doc.setMargins(28, 28, 28, 28);

            // ── Header: company + form no ──
            Table header = new Table(UnitValue.createPercentArray(new float[]{70, 30}))
                    .setWidth(UnitValue.createPercentValue(100));
            header.addCell(noBorder(new Paragraph("Thinture Technologies Pvt. Ltd.")
                    .setBold().setFontSize(14)));
            header.addCell(noBorder(new Paragraph(formNo.isBlank() ? "" : "F No: " + formNo)
                    .setFontSize(9).setTextAlignment(TextAlignment.RIGHT)));
            doc.add(header);
            doc.add(new Paragraph("No. 508, 2nd Floor, HMT Layout, Vidyaranayapura, Bangalore - 560 097")
                    .setFontSize(8).setFontColor(ColorConstants.DARK_GRAY));

            doc.add(new Paragraph((categoryName + " INSPECTION CHECK LIST").toUpperCase())
                    .setBold().setFontSize(12).setUnderline()
                    .setTextAlignment(TextAlignment.CENTER).setMarginTop(6).setMarginBottom(8));

            // ── Meta row ──
            Table meta = new Table(UnitValue.createPercentArray(new float[]{16, 34, 16, 34}))
                    .setWidth(UnitValue.createPercentValue(100)).setMarginBottom(4);
            metaCell(meta, "Invoice No:", true);   metaCell(meta, invoiceNo, false);
            metaCell(meta, "Received Date:", true); metaCell(meta, receivedDate, false);
            metaCell(meta, "Supplier Name:", true); metaCell(meta, supplierName, false);
            metaCell(meta, "Batch Ref:", true);     metaCell(meta, batchRef, false);
            metaCell(meta, "Lot Qty:", true);       metaCell(meta, lotQty, false);
            metaCell(meta, "Inspector:", true);     metaCell(meta, inspector, false);
            doc.add(meta);

            // ── Stage table ──
            Table t = new Table(UnitValue.createPercentArray(new float[]{6, 18, 30, 12, 16, 18}))
                    .setWidth(UnitValue.createPercentValue(100)).setMarginTop(6);
            for (String h : new String[]{"Sl No", "Stage / Operation", "Check Points",
                                         "Inspected Qty (AQL)", "Remarks", "Pass / Fail / NA"})
                t.addHeaderCell(th(h));

            if (stages.isEmpty()) {
                Cell c = new Cell(1, 6).add(new Paragraph("(No checklist stages on file)")
                        .setFontSize(9).setItalic().setTextAlignment(TextAlignment.CENTER));
                t.addCell(c);
            } else {
                int sl = 1;
                for (ChecklistTemplateDto.StageDto s : stages) {
                    ChecklistResultDto r = filled.get(s.getId());

                    // "Inspected Qty (AQL)": what was typed, else the template's label
                    String qty = (r != null && r.getInspectedQty() != null && !r.getInspectedQty().isBlank())
                            ? r.getInspectedQty()
                            : safe(s.getAqlLabel());

                    t.addCell(td(String.valueOf(s.getSlNo() != null ? s.getSlNo() : sl), TextAlignment.CENTER));
                    t.addCell(td(safe(s.getStageOperation()), TextAlignment.LEFT));
                    t.addCell(td(safe(s.getCheckPoint()), TextAlignment.LEFT));
                    t.addCell(td(qty, TextAlignment.CENTER));
                    t.addCell(td(r != null ? safe(r.getRemarks()) : "", TextAlignment.LEFT));
                    t.addCell(td(pfn(r != null ? r.getResult() : null), TextAlignment.CENTER));
                    sl++;
                }
            }
            doc.add(t);

            // ── Remarks ──
            doc.add(new Paragraph("Remarks: " + remarks).setFontSize(9).setMarginTop(10));

            // ── Signature + decision ──
            Table foot = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                    .setWidth(UnitValue.createPercentValue(100)).setMarginTop(24);
            Cell sign = noBorder(new Paragraph(""));
            sign.add(new Paragraph(inspector).setItalic().setFontSize(11));
            sign.add(new Paragraph("______________________________").setFontSize(9));
            sign.add(new Paragraph("Verified By (Name & Signature)").setFontSize(9));
            foot.addCell(sign);

            Cell dec = noBorder(new Paragraph(""));
            dec.add(new Paragraph("Lot is:").setBold().setFontSize(9));
            dec.add(new Paragraph(
                    tick("Accepted", decision) + "   " + tick("Rejected", decision) + "   " +
                    tick("Hold", decision) + "   " + tick("Partial", decision)).setFontSize(9));
            dec.setTextAlignment(TextAlignment.RIGHT);
            foot.addCell(dec);
            doc.add(foot);
        }

        String abs = target.toString();
        log.info("QC PDF written for inspection {} -> {}", inspId, abs);
        return abs;
    }

    // ── Cell helpers ──
    private Cell th(String text) {
        return new Cell().add(new Paragraph(text).setBold().setFontSize(8.5f)
                        .setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(HEADER_BLUE).setPadding(4)
                .setBorder(new SolidBorder(GREY_LINE, 0.75f));
    }

    private Cell td(String text, TextAlignment align) {
        return new Cell().add(new Paragraph(text == null ? "" : text).setFontSize(8.5f)
                        .setTextAlignment(align))
                .setPadding(4).setBorder(new SolidBorder(GREY_LINE, 0.5f));
    }

    private void metaCell(Table t, String text, boolean label) {
        Paragraph p = new Paragraph(text == null ? "" : text).setFontSize(9);
        if (label) p.setBold();
        t.addCell(new Cell().add(p).setPadding(3).setBorder(new SolidBorder(GREY_LINE, 0.5f)));
    }

    private Cell noBorder(Paragraph p) {
        return new Cell().add(p).setBorder(Border.NO_BORDER);
    }

    /** \u2611 the recorded Pass/Fail/NA; all blank when nothing was saved. */
    private String pfn(String result) {
        String r = result == null ? "" : result.toUpperCase().trim();
        return box("PASS".equals(r)) + " Pass  "
             + box("FAIL".equals(r)) + " Fail  "
             + box("NA".equals(r))   + " N/A";
    }

    private String box(boolean on) { return on ? "\u2611" : "\u2610"; }

    private String tick(String label, String decision) {
        boolean on = decision != null && decision.equalsIgnoreCase(label);
        return (on ? "\u2611 " : "\u2610 ") + label;
    }

    private String fmt(Object date) {
        try {
            if (date instanceof LocalDate d)      return d.format(D_FMT);
            if (date instanceof LocalDateTime dt) return dt.toLocalDate().format(D_FMT);
            return String.valueOf(date);
        } catch (Exception e) { return String.valueOf(date); }
    }

    private String safe(String s) { return s == null ? "" : s; }
}