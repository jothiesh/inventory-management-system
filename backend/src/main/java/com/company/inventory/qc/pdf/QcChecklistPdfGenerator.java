package com.company.inventory.qc.pdf;

import com.company.inventory.qc.entity.QcInspection;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Generates the filled QC Inspection PDF and writes it to {@code qc.pdf.output.dir}.
 * Returns the absolute path of the saved file. Style matches existing
 * PurchaseOrderPdfService (header table, table-driven layout, Helvetica fonts).
 */
@Slf4j
@Component
public class QcChecklistPdfGenerator {

    @Value("${qc.pdf.output.dir:/var/thinture/qc-pdfs}")
    private String outputDir;

    private static final DeviceRgb HEADER_BG   = new DeviceRgb(50, 50, 50);
    private static final DeviceRgb LIGHT_GRAY  = new DeviceRgb(245, 245, 245);
    private static final DeviceRgb BORDER      = new DeviceRgb(180, 180, 180);
    private static final DeviceRgb ACCEPT_BG   = new DeviceRgb(220, 245, 220);
    private static final DeviceRgb REJECT_BG   = new DeviceRgb(250, 220, 220);

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final DateTimeFormatter DT_FMT   = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    public String generate(QcInspection inspection) throws Exception {
        Path dir = Path.of(outputDir);
        Files.createDirectories(dir);
        String fileName = "QC-" + inspection.getId() + "-" + UUID.randomUUID() + ".pdf";
        Path out = dir.resolve(fileName);

        try (PdfWriter writer = new PdfWriter(new FileOutputStream(out.toFile()));
             PdfDocument pdf  = new PdfDocument(writer);
             Document doc      = new Document(pdf, PageSize.A4)) {

            doc.setMargins(30, 30, 30, 30);

            PdfFont bold = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
            PdfFont reg  = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);

            Table master = new Table(new float[]{1})
                    .setWidth(UnitValue.createPercentValue(100))
                    .setBorder(new SolidBorder(BORDER, 1));

            master.addCell(buildHeader(bold, reg));
            master.addCell(buildMetaRow(inspection, bold, reg));
            master.addCell(buildDecisionRow(inspection, bold, reg));
            master.addCell(buildSignatureRow(bold, reg));

            doc.add(master);
        }

        log.info("QC PDF generated: {}", out);
        return out.toString();
    }

    private Cell buildHeader(PdfFont bold, PdfFont reg) {
        Cell c = new Cell()
                .setBorderBottom(new SolidBorder(BORDER, 1))
                .setPadding(10);
        c.add(new Paragraph("THINTURE TECHNOLOGIES PRIVATE LIMITED")
                .setFont(bold).setFontSize(14).setTextAlignment(TextAlignment.CENTER));
        c.add(new Paragraph("Bangalore")
                .setFont(reg).setFontSize(9).setTextAlignment(TextAlignment.CENTER));
        c.add(new Paragraph("INWARD QUALITY INSPECTION REPORT")
                .setFont(bold).setFontSize(12).setTextAlignment(TextAlignment.CENTER));
        return c;
    }

    private Cell buildMetaRow(QcInspection insp, PdfFont bold, PdfFont reg) {
        Table t = new Table(new float[]{1, 2, 1, 2})
                .setWidth(UnitValue.createPercentValue(100));

        addLabel(t, "Form No",      bold);
        addValue(t, insp.getFormNo(), reg);
        addLabel(t, "Inspection ID", bold);
        addValue(t, "QC-" + insp.getId(), reg);

        addLabel(t, "Invoice No",   bold);
        addValue(t, nvl(insp.getInvoiceNo()), reg);
        addLabel(t, "Inspected At", bold);
        addValue(t, insp.getInspectedAt() != null ? insp.getInspectedAt().format(DT_FMT) : "-", reg);

        addLabel(t, "Supplier",     bold);
        addValue(t, nvl(insp.getSupplierName()), reg);
        addLabel(t, "Received Date", bold);
        addValue(t, insp.getReceivedDate() != null ? insp.getReceivedDate().format(DATE_FMT) : "-", reg);

        addLabel(t, "Lot Count",    bold);
        addValue(t, String.valueOf(insp.getLotCount()), reg);
        addLabel(t, "Inspected By", bold);
        // ★ FIX: Use safe accessor — getFullName() triggers lazy load outside session
        String inspectorName = "-";
        if (insp.getInspectedBy() != null) {
            try {
                String fn = insp.getInspectedBy().getFullName();
                inspectorName = (fn != null && !fn.isBlank()) ? fn : insp.getInspectedBy().getUsername();
            } catch (Exception e) {
                try { inspectorName = insp.getInspectedBy().getUsername(); } catch (Exception ex) { inspectorName = "QC Inspector"; }
            }
        }
        addValue(t, inspectorName, reg);

        return new Cell().setBorderBottom(new SolidBorder(BORDER, 1)).setPadding(8).add(t);
    }

    private Cell buildDecisionRow(QcInspection insp, PdfFont bold, PdfFont reg) {
        DeviceRgb bg = switch (nvl(insp.getOverallDecision()).toUpperCase()) {
            case "ACCEPTED" -> ACCEPT_BG;
            case "REJECTED" -> REJECT_BG;
            default          -> LIGHT_GRAY;
        };

        Cell c = new Cell()
                .setBackgroundColor(bg)
                .setBorderBottom(new SolidBorder(BORDER, 1))
                .setPadding(14);

        c.add(new Paragraph("Lot Decision: " + nvl(insp.getOverallDecision()))
                .setFont(bold).setFontSize(13).setTextAlignment(TextAlignment.CENTER));

        if (insp.getOverallRemarks() != null && !insp.getOverallRemarks().isBlank()) {
            c.add(new Paragraph("Remarks: " + insp.getOverallRemarks())
                    .setFont(reg).setFontSize(9).setTextAlignment(TextAlignment.CENTER));
        }
        return c;
    }

    private Cell buildSignatureRow(PdfFont bold, PdfFont reg) {
        Table t = new Table(new float[]{1, 1}).setWidth(UnitValue.createPercentValue(100));
        Cell left = new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setPadding(20)
                .add(new Paragraph("Inspected By:").setFont(bold).setFontSize(10))
                .add(new Paragraph(" ").setFont(reg))
                .add(new Paragraph("__________________________").setFont(reg).setFontSize(9));
        Cell right = new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setPadding(20)
                .setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("Approved By (QC Head):").setFont(bold).setFontSize(10))
                .add(new Paragraph(" ").setFont(reg))
                .add(new Paragraph("__________________________").setFont(reg).setFontSize(9));
        t.addCell(left);
        t.addCell(right);
        return new Cell().add(t);
    }

    private void addLabel(Table t, String text, PdfFont font) {
        t.addCell(new Cell().setBackgroundColor(LIGHT_GRAY).setPadding(4)
                .add(new Paragraph(text).setFont(font).setFontSize(9)));
    }
    private void addValue(Table t, String text, PdfFont font) {
        t.addCell(new Cell().setPadding(4)
                .add(new Paragraph(nvl(text)).setFont(font).setFontSize(9)));
    }
    private String nvl(String s) { return s == null ? "-" : s; }
}