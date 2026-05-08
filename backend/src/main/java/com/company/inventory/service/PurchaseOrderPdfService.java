package com.company.inventory.service;


import com.company.inventory.entity.PurchaseOrder;
import com.company.inventory.entity.PurchaseOrderItem;
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
public class PurchaseOrderPdfService {

    @Value("${app.logo.path:classpath:static/logo.png}")
    private String logoPath;

    // Colors matching Thinture branding
    private static final DeviceRgb HEADER_BG  = new DeviceRgb(30, 30, 30);   // Dark
    private static final DeviceRgb TABLE_HEADER_BG = new DeviceRgb(50, 50, 50);
    private static final DeviceRgb LIGHT_GRAY = new DeviceRgb(245, 245, 245);
    private static final DeviceRgb BORDER_COLOR = new DeviceRgb(180, 180, 180);

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    public byte[] generatePdf(PurchaseOrder po) throws Exception {

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document doc = new Document(pdfDoc, PageSize.A4);
        doc.setMargins(30, 30, 30, 30);

        PdfFont boldFont    = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA_BOLD);
        PdfFont regularFont = PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);

        // ── MASTER OUTER TABLE (everything inside) ──────────────────
        Table masterTable = new Table(new float[]{1})
                .setWidth(UnitValue.createPercentValue(100))
                .setBorder(new SolidBorder(BORDER_COLOR, 1));

        // ── ROW 1: HEADER — Logo + Company Info ─────────────────────
        masterTable.addCell(buildHeaderCell(boldFont, regularFont));

        // ── ROW 2: PURCHASE ORDER Title + PO Ref & Date ─────────────
        masterTable.addCell(buildTitleCell(po, boldFont, regularFont));

        // ── ROW 3: ITEMS TABLE ───────────────────────────────────────
        masterTable.addCell(buildItemsCell(po, boldFont, regularFont));

        // ── ROW 4: TOTALS ────────────────────────────────────────────
        masterTable.addCell(buildTotalsCell(po, boldFont, regularFont));

        // ── ROW 5: TERMS ─────────────────────────────────────────────
        masterTable.addCell(buildTermsCell(po, regularFont, boldFont));

        // ── ROW 6: FOOTER ────────────────────────────────────────────
        masterTable.addCell(buildFooterCell(boldFont));

        doc.add(masterTable);
        doc.close();

        return baos.toByteArray();
    }

    // ── HEADER ROW ──────────────────────────────────────────────────
    private Cell buildHeaderCell(PdfFont boldFont, PdfFont regularFont) throws Exception {

        Table headerTable = new Table(new float[]{1, 3})
                .setWidth(UnitValue.createPercentValue(100));

        // Logo cell
        File logoFile = ResourceUtils.getFile(logoPath);
        Image logo = new Image(ImageDataFactory.create(logoFile.getAbsolutePath()))
                .setWidth(80)
                .setHeight(60);

        headerTable.addCell(new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .add(logo));

        // Company info cell
        Cell companyCell = new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .add(new Paragraph("THINTURE TECHNOLOGIES PRIVATE LIMITED")
                        .setFont(boldFont).setFontSize(14))
                .add(new Paragraph("2nd Floor, 2nd Block, 508 HMT Layout, Vidyaranyapura, Bangalore, Karnataka")
                        .setFont(regularFont).setFontSize(8))
                .add(new Paragraph("Email: info@thinture.com  |  Phone: +918197997848")
                        .setFont(regularFont).setFontSize(8))
                .add(new Paragraph("GSTIN: 29AADCT9485G1ZP")
                        .setFont(boldFont).setFontSize(8));

        headerTable.addCell(companyCell);

        return new Cell()
                .setBorderBottom(new SolidBorder(BORDER_COLOR, 1))
                .setPadding(10)
                .add(headerTable);
    }

    // ── TITLE ROW ───────────────────────────────────────────────────
    private Cell buildTitleCell(PurchaseOrder po, PdfFont boldFont, PdfFont regularFont) {

        Table titleTable = new Table(new float[]{1, 1})
                .setWidth(UnitValue.createPercentValue(100));

        // Left: PURCHASE ORDER
        titleTable.addCell(new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .add(new Paragraph("PURCHASE ORDER")
                        .setFont(boldFont).setFontSize(14)
                        .setTextAlignment(TextAlignment.CENTER)));

        // Right: PO Ref + Date
        titleTable.addCell(new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("PO. Ref. No.: " + po.getPoCode())
                        .setFont(boldFont).setFontSize(9))
                .add(new Paragraph("Date: " + po.getPoDate().format(DATE_FMT))
                        .setFont(regularFont).setFontSize(9)));

        return new Cell()
                .setBorderBottom(new SolidBorder(BORDER_COLOR, 1))
                .setPadding(8)
                .add(titleTable);
    }

    // ── ITEMS TABLE ROW ─────────────────────────────────────────────
    private Cell buildItemsCell(PurchaseOrder po, PdfFont boldFont, PdfFont regularFont) {

        // Columns: Sl.No | HSN | Description | Qty | UOM | Rate | Total
        Table itemsTable = new Table(new float[]{0.5f, 1.2f, 4f, 0.8f, 0.8f, 1.2f, 1.2f})
                .setWidth(UnitValue.createPercentValue(100));

        // Header Row
        String[] headers = {"Sl.No", "HSN/SAC Code", "Description", "Qty", "UOM", "Rate", "Total Amount (INR)"};
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

        // Item Rows
        boolean alternate = false;
        for (PurchaseOrderItem item : po.getItems()) {
            DeviceRgb rowBg = alternate ? LIGHT_GRAY : (DeviceRgb) ColorConstants.WHITE;
            alternate = !alternate;

            addItemCell(itemsTable, String.valueOf(item.getSlNo()),    regularFont, rowBg, TextAlignment.CENTER);
            addItemCell(itemsTable, nvl(item.getHsnCode()),            regularFont, rowBg, TextAlignment.CENTER);
            addItemCell(itemsTable, item.getDescription(),             regularFont, rowBg, TextAlignment.LEFT);
            addItemCell(itemsTable, String.valueOf(item.getQuantity()), regularFont, rowBg, TextAlignment.CENTER);
            addItemCell(itemsTable, nvl(item.getUom()),                regularFont, rowBg, TextAlignment.CENTER);
            addItemCell(itemsTable, String.format("%.2f", item.getRate()),        regularFont, rowBg, TextAlignment.RIGHT);
            addItemCell(itemsTable, String.format("%,.2f", item.getTotalAmount()), regularFont, rowBg, TextAlignment.RIGHT);
        }

        // TOTAL row
        itemsTable.addCell(new Cell(1, 5)
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f))
                .setBackgroundColor(LIGHT_GRAY)
                .setPadding(5)
                .add(new Paragraph("TOTAL")
                        .setFont(boldFont).setFontSize(9)
                        .setTextAlignment(TextAlignment.CENTER)));

        // Total Qty
        int totalQty = po.getItems().stream().mapToInt(PurchaseOrderItem::getQuantity).sum();
        itemsTable.addCell(new Cell()
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f))
                .setBackgroundColor(LIGHT_GRAY)
                .setPadding(5)
                .add(new Paragraph(String.valueOf(totalQty))
                        .setFont(boldFont).setFontSize(9)
                        .setTextAlignment(TextAlignment.CENTER)));

        itemsTable.addCell(new Cell()
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f))
                .setBackgroundColor(LIGHT_GRAY)
                .setPadding(5)
                .add(new Paragraph(String.format("%,.2f", po.getTotalAmount()))
                        .setFont(boldFont).setFontSize(9)
                        .setTextAlignment(TextAlignment.RIGHT)));

        return new Cell()
                .setBorderBottom(new SolidBorder(BORDER_COLOR, 1))
                .setPadding(6)
                .add(itemsTable);
    }

    // ── TOTALS ROW ───────────────────────────────────────────────────
    private Cell buildTotalsCell(PurchaseOrder po, PdfFont boldFont, PdfFont regularFont) {

        Table totalsTable = new Table(new float[]{3, 1})
                .setWidth(UnitValue.createPercentValue(100));

        totalsTable.addCell(new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .add(new Paragraph("Total in Words:").setFont(boldFont).setFontSize(8))
                .add(new Paragraph(po.getTotalInWords()).setFont(regularFont).setFontSize(8)));

        totalsTable.addCell(new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("Total Amount").setFont(boldFont).setFontSize(9))
                .add(new Paragraph(String.format("₹ %,.2f", po.getTotalAmount()))
                        .setFont(boldFont).setFontSize(11)));

        return new Cell()
                .setBorderBottom(new SolidBorder(BORDER_COLOR, 1))
                .setPadding(8)
                .add(totalsTable);
    }

    // ── TERMS ROW ───────────────────────────────────────────────────
    private Cell buildTermsCell(PurchaseOrder po, PdfFont regularFont, PdfFont boldFont) {

        Cell cell = new Cell()
                .setBorderBottom(new SolidBorder(BORDER_COLOR, 1))
                .setPadding(8);

        cell.add(new Paragraph("Terms & Condition:").setFont(boldFont).setFontSize(9));

        if (po.getPaymentTerms() != null)
            cell.add(new Paragraph("Payment: " + po.getPaymentTerms()).setFont(regularFont).setFontSize(8));

        if (po.getDeliveryFrom() != null && po.getDeliveryTo() != null)
            cell.add(new Paragraph("Delivery date: Between "
                    + po.getDeliveryFrom().format(DATE_FMT)
                    + " and " + po.getDeliveryTo().format(DATE_FMT))
                    .setFont(regularFont).setFontSize(8));

        if (po.getNotes() != null)
            cell.add(new Paragraph("Notes: " + po.getNotes()).setFont(regularFont).setFontSize(8));

        return cell;
    }

    // ── FOOTER ROW ──────────────────────────────────────────────────
    private Cell buildFooterCell(PdfFont boldFont) {

        Table footerTable = new Table(new float[]{1, 1})
                .setWidth(UnitValue.createPercentValue(100));

        footerTable.addCell(new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .add(new Paragraph("Prepared & Checked by:").setFont(boldFont).setFontSize(9)));

        footerTable.addCell(new Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT)
                .add(new Paragraph("Authorised Signatory").setFont(boldFont).setFontSize(9)));

        return new Cell()
                .setPadding(12)
                .add(footerTable);
    }

    // ── HELPER ──────────────────────────────────────────────────────
    private void addItemCell(Table table, String text, PdfFont font, DeviceRgb bg, TextAlignment align) {
        table.addCell(new Cell()
                .setBackgroundColor(bg)
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f))
                .setPadding(5)
                .add(new Paragraph(text)
                        .setFont(font).setFontSize(8)
                        .setTextAlignment(align)));
    }

    private String nvl(String s) {
        return s != null ? s : "";
    }
}