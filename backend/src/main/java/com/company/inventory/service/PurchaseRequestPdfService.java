package com.company.inventory.service;

import com.company.inventory.entity.PurchaseRequest;
import com.company.inventory.entity.PurchaseRequestItem;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.ResourceUtils;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.time.format.DateTimeFormatter;

@Service
public class PurchaseRequestPdfService {

    @Value("${app.logo.path:classpath:static/thinlogo.png}")
    private String logoPath;

    private static final DeviceRgb TABLE_HEADER_BG = new DeviceRgb(50, 50, 50);
    private static final DeviceRgb LIGHT_GRAY      = new DeviceRgb(245, 245, 245);
    private static final DeviceRgb BORDER_COLOR    = new DeviceRgb(180, 180, 180);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    public byte[] generatePdf(PurchaseRequest pr) throws Exception {

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdfDoc = new PdfDocument(new PdfWriter(baos));
        Document doc = new Document(pdfDoc, PageSize.A4);
        doc.setMargins(30, 30, 30, 30);

        PdfFont boldFont    = PdfFontFactory.createFont(
                com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regularFont = PdfFontFactory.createFont(
                com.itextpdf.io.font.constants.StandardFonts.HELVETICA);

        // ── MASTER TABLE ─────────────────────────────────────────────
        Table masterTable = new Table(new float[]{1})
                .setWidth(UnitValue.createPercentValue(100))
                .setBorder(new SolidBorder(BORDER_COLOR, 1));

        masterTable.addCell(buildHeaderCell(boldFont, regularFont));
        masterTable.addCell(buildTitleCell(pr, boldFont, regularFont));
        masterTable.addCell(buildItemsCell(pr, boldFont, regularFont));
        masterTable.addCell(buildFooterCell(boldFont));

        doc.add(masterTable);
        doc.close();

        return baos.toByteArray();
    }

    // ── HEADER: Logo + Company ───────────────────────────────────────
    private Cell buildHeaderCell(PdfFont boldFont, PdfFont regularFont) throws Exception {

        Table headerTable = new Table(new float[]{1, 3})
                .setWidth(UnitValue.createPercentValue(100));

        // Try to load logo — skip if not found
        try {
            File logoFile = ResourceUtils.getFile(logoPath);
            if (logoFile.exists()) {
                Image logo = new Image(ImageDataFactory.create(logoFile.getAbsolutePath()))
                        .setWidth(80).setHeight(60);
                headerTable.addCell(new Cell()
                        .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                        .setVerticalAlignment(VerticalAlignment.MIDDLE)
                        .add(logo));
            } else {
                headerTable.addCell(new Cell()
                        .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                        .add(new Paragraph("")));
            }
        } catch (Exception e) {
            headerTable.addCell(new Cell()
                    .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                    .add(new Paragraph("")));
        }

        // Company info
        headerTable.addCell(new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .add(new Paragraph("THINTURE TECHNOLOGIES PRIVATE LIMITED")
                        .setFont(boldFont).setFontSize(13))
                .add(new Paragraph("2nd Floor, 2nd Block, 508 HMT Layout, Vidyaranyapura, Bangalore, Karnataka")
                        .setFont(regularFont).setFontSize(8))
                .add(new Paragraph("Email: info@thinture.com  |  Phone: +918197997848")
                        .setFont(regularFont).setFontSize(8))
                .add(new Paragraph("GSTIN: 29AADCT9485G1ZP")
                        .setFont(boldFont).setFontSize(8)));

        return new Cell()
                .setBorderBottom(new SolidBorder(BORDER_COLOR, 1))
                .setPadding(10)
                .add(headerTable);
    }

    // ── TITLE: PURCHASE REQUEST + PR Code + Date ─────────────────────
    private Cell buildTitleCell(PurchaseRequest pr, PdfFont boldFont, PdfFont regularFont) {

        Table titleTable = new Table(new float[]{1, 1})
                .setWidth(UnitValue.createPercentValue(100));

        titleTable.addCell(new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .add(new Paragraph("PURCHASE REQUEST")
                        .setFont(boldFont).setFontSize(14)
                        .setTextAlignment(TextAlignment.CENTER)));

        titleTable.addCell(new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("PR Code: " + pr.getPrCode())
                        .setFont(boldFont).setFontSize(9))
                .add(new Paragraph("Date: " + pr.getPrDate().format(DATE_FMT))
                        .setFont(regularFont).setFontSize(9)));

        return new Cell()
                .setBorderBottom(new SolidBorder(BORDER_COLOR, 1))
                .setPadding(8)
                .add(titleTable);
    }

    // ── ITEMS: Sl.No | Part No | Description | Qty | Remark ──────────
    private Cell buildItemsCell(PurchaseRequest pr, PdfFont boldFont, PdfFont regularFont) {

        Table itemsTable = new Table(new float[]{0.5f, 1.5f, 4f, 1f, 2.5f})
                .setWidth(UnitValue.createPercentValue(100));

        // Header row
        String[] headers = {"Sl.No", "Part No", "Description", "Qty", "Remark"};
        for (String h : headers) {
            itemsTable.addCell(new Cell()
                    .setBackgroundColor(TABLE_HEADER_BG)
                    .setBorder(new SolidBorder(BORDER_COLOR, 0.5f))
                    .setPadding(5)
                    .add(new Paragraph(h)
                            .setFont(boldFont).setFontSize(8)
                            .setFontColor(ColorConstants.WHITE)
                            .setTextAlignment(TextAlignment.CENTER)));
        }

        // Item rows
        boolean alternate = false;
        for (PurchaseRequestItem item : pr.getItems()) {
            DeviceRgb rowBg = alternate ? LIGHT_GRAY : (DeviceRgb) ColorConstants.WHITE;
            alternate = !alternate;

            addCell(itemsTable, String.valueOf(item.getSlNo()),          regularFont, rowBg, TextAlignment.CENTER);
            addCell(itemsTable, nvl(item.getPartNo()),                   regularFont, rowBg, TextAlignment.LEFT);
            addCell(itemsTable, nvl(item.getDescription()),              regularFont, rowBg, TextAlignment.LEFT);
            addCell(itemsTable, String.valueOf(item.getQuantity()),      regularFont, rowBg, TextAlignment.CENTER);
            addCell(itemsTable, nvl(item.getRemark()),                   regularFont, rowBg, TextAlignment.LEFT);
        }

        // Total row
        int totalQty = pr.getItems().stream()
                .mapToInt(PurchaseRequestItem::getQuantity).sum();

        itemsTable.addCell(new Cell(1, 3)
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f))
                .setBackgroundColor(LIGHT_GRAY).setPadding(5)
                .add(new Paragraph("TOTAL")
                        .setFont(boldFont).setFontSize(9)
                        .setTextAlignment(TextAlignment.RIGHT)));

        itemsTable.addCell(new Cell()
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f))
                .setBackgroundColor(LIGHT_GRAY).setPadding(5)
                .add(new Paragraph(String.valueOf(totalQty))
                        .setFont(boldFont).setFontSize(9)
                        .setTextAlignment(TextAlignment.CENTER)));

        itemsTable.addCell(new Cell()
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f))
                .setBackgroundColor(LIGHT_GRAY).setPadding(5)
                .add(new Paragraph("")));

        // Notes row if present
        if (pr.getNotes() != null && !pr.getNotes().isBlank()) {
            itemsTable.addCell(new Cell(1, 5)
                    .setBorder(new SolidBorder(BORDER_COLOR, 0.5f))
                    .setPadding(6)
                    .add(new Paragraph("Notes: " + pr.getNotes())
                            .setFont(regularFont).setFontSize(8)));
        }

        return new Cell()
                .setBorderBottom(new SolidBorder(BORDER_COLOR, 1))
                .setPadding(6)
                .add(itemsTable);
    }

    // ── FOOTER: Prepared by + Authorised Signatory ───────────────────
    private Cell buildFooterCell(PdfFont boldFont) {

        Table footerTable = new Table(new float[]{1, 1})
                .setWidth(UnitValue.createPercentValue(100));

        footerTable.addCell(new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .add(new Paragraph("Prepared & Checked by:")
                        .setFont(boldFont).setFontSize(9)));

        footerTable.addCell(new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("Authorised Signatory")
                        .setFont(boldFont).setFontSize(9)));

        return new Cell().setPadding(14).add(footerTable);
    }

    // ── HELPERS ──────────────────────────────────────────────────────
    private void addCell(Table table, String text, PdfFont font,
                         DeviceRgb bg, TextAlignment align) {
        table.addCell(new Cell()
                .setBackgroundColor(bg)
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f))
                .setPadding(5)
                .add(new Paragraph(nvl(text))
                        .setFont(font).setFontSize(8)
                        .setTextAlignment(align)));
    }

    private String nvl(String s) {
        return s != null ? s : "";
    }
}