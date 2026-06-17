package com.company.inventory.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.company.inventory.dto.request.PurchaseInvoiceDtos.CreateInvoiceRequest;
import com.company.inventory.dto.request.PurchaseInvoiceDtos.InvoiceDetailDto;
import com.company.inventory.dto.request.PurchaseInvoiceDtos.InvoiceItemDto;
import com.company.inventory.dto.request.PurchaseInvoiceDtos.InvoiceItemRequest;
import com.company.inventory.dto.request.PurchaseInvoiceDtos.InvoiceSummaryDto;
import com.company.inventory.entity.PurchaseInvoice;
import com.company.inventory.entity.PurchaseInvoiceItem;
import com.company.inventory.qc.exception.QcException;
import com.company.inventory.repository.PurchaseInvoiceRepository;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PurchaseInvoiceService {

    private final PurchaseInvoiceRepository invoiceRepo;
    private final AuditContextProvider auditCtx;

    @Value("${purchase.invoice.upload.dir:/var/thinture/invoices}")
    private String uploadDir;

    @Value("${purchase.invoice.max.size.mb:20}")
    private int maxSizeMb;

    private static final DateTimeFormatter DIR_FMT = DateTimeFormatter.ofPattern("yyyy/MM");

    @Transactional
    public Long uploadScannedInvoice(MultipartFile file) {
        log.info("Initiating scanned invoice file upload sequence. Original filename: '{}'", file != null ? file.getOriginalFilename() : "null");

        if (file == null || file.isEmpty()) {
            throw new QcException("INVOICE_FILE_REQUIRED", "No file uploaded");
        }
        
        long maxBytes = (long) maxSizeMb * 1024 * 1024;
        if (file.getSize() > maxBytes) {
            throw new QcException("INVOICE_FILE_TOO_LARGE", "File exceeds " + maxSizeMb + " MB");
        }

        String savedPath = saveFile(file);
        Long uploadedBy = auditCtx.currentUserId();

        PurchaseInvoice invoice = PurchaseInvoice.builder()
            .invoiceNo("DRAFT-" + System.currentTimeMillis())
            .invoiceDate(java.time.LocalDate.now())
            .supplierName("PENDING")
            .invoiceFilePath(savedPath)
            .invoiceFileName(file.getOriginalFilename())
            .invoiceMimeType(file.getContentType())
            .invoiceFileSize(file.getSize())
            .uploadedBy(uploadedBy)
            .uploadedAt(LocalDateTime.now())
            .build();

        invoice = invoiceRepo.save(invoice);
        log.info("Successfully registered draft PurchaseInvoice document tracking entity inside schema database. Entity ID: {}", invoice.getId());
        return invoice.getId();
    }

    @Transactional
    public InvoiceDetailDto saveOrUpdate(Long id, CreateInvoiceRequest req) {
        log.info("Processing request to save or update metadata profile layer for Target ID: {}", id);
        
        PurchaseInvoice invoice;
        if (id == null) {
            invoice = PurchaseInvoice.builder()
                .uploadedBy(auditCtx.currentUserId())
                .uploadedAt(LocalDateTime.now())
                .build();
        } else {
            invoice = invoiceRepo.findById(id)
                .orElseThrow(() -> new QcException("INVOICE_NOT_FOUND", "Invoice " + id + " not found"));
        }

        invoice.setInvoiceNo(req.getInvoiceNo());
        invoice.setInvoiceDate(req.getInvoiceDate());
        invoice.setSupplierId(req.getSupplierId());
        invoice.setSupplierName(req.getSupplierName());
        invoice.setSupplierGstin(req.getSupplierGstin());
        invoice.setPoNo(req.getPoNo());
        invoice.setInvoiceTotal(req.getInvoiceTotal());
        if (req.getCurrencyCode() != null) invoice.setCurrencyCode(req.getCurrencyCode());

        if (req.getItems() != null) {
            invoice.getItems().clear();
            int sl = 1;
            for (InvoiceItemRequest item : req.getItems()) {
                PurchaseInvoiceItem entity = PurchaseInvoiceItem.builder()
                    .invoice(invoice)
                    .slNo(item.getSlNo() != null ? item.getSlNo() : sl++)
                    .partNo(item.getPartNo())
                    .description(item.getDescription())
                    .hsnSac(item.getHsnSac())
                    .quantity(item.getQuantity())
                    .unitPrice(item.getUnitPrice())
                    .lineTotal(item.getLineTotal())
                    .build();
                invoice.getItems().add(entity);
            }
        }

        invoice = invoiceRepo.save(invoice);
        return toDetailDto(invoice);
    }

    @Transactional
    public void linkToStockInBatch(Long invoiceId, Long batchId) {
        log.info("Linking Invoice entity ID {} to operational StockInBatch ID {}", invoiceId, batchId);
        PurchaseInvoice invoice = invoiceRepo.findById(invoiceId)
            .orElseThrow(() -> new QcException("INVOICE_NOT_FOUND", "Invoice " + invoiceId + " not found"));
            
        invoice.setStockInBatchId(batchId);
        invoiceRepo.save(invoice);
    }

    // --- SAFELY PAGINATED SEARCH ---
    @Transactional(readOnly = true)
    public Page<InvoiceSummaryDto> search(String q, int page, int size) {
        String query = (q == null) ? "" : q;
        log.debug("Invoice search from stock_in_batch | q='{}' page={} size={}", query, page, size);

        Page<PurchaseInvoiceRepository.InvoiceListView> dbPage = 
            invoiceRepo.searchInvoicesGrouped(query, PageRequest.of(page, size));

        return dbPage.map(v -> InvoiceSummaryDto.builder()
            .invoiceNo(v.getInvoiceNo())
            .supplierName(v.getSupplierName())
            .invoiceDate(v.getInvoiceDate() != null ? v.getInvoiceDate().toLocalDate() : null)
            .itemCount(v.getItemCount() != null ? v.getItemCount().intValue() : 0)
            .build());
    }
    
    @Transactional(readOnly = true)
    public InvoiceDetailDto getById(Long id) {
        PurchaseInvoice invoice = invoiceRepo.findById(id)
            .orElseThrow(() -> new QcException("INVOICE_NOT_FOUND", "Invoice " + id + " not found"));
        return toDetailDto(invoice);
    }

    @Transactional(readOnly = true)
    public byte[] readInvoiceFile(Long id) {
        PurchaseInvoice invoice = invoiceRepo.findById(id)
            .orElseThrow(() -> new QcException("INVOICE_NOT_FOUND", "Invoice " + id + " not found"));
            
        if (invoice.getInvoiceFilePath() == null) {
            throw new QcException("INVOICE_FILE_MISSING", "No file attached");
        }
        
        try {
            return Files.readAllBytes(Path.of(invoice.getInvoiceFilePath()));
        } catch (IOException e) {
            throw new QcException("INVOICE_FILE_READ_ERROR", "Cannot read file: " + e.getMessage());
        }
    }

    private String saveFile(MultipartFile file) {
        try {
            String monthDir = LocalDateTime.now().format(DIR_FMT);
            Path dir = Path.of(uploadDir, monthDir);
            Files.createDirectories(dir);

            String original = file.getOriginalFilename() == null ? "invoice" : file.getOriginalFilename();
            String ext = "";
            int dot = original.lastIndexOf('.');
            if (dot > 0) ext = original.substring(dot);
            String fileName = UUID.randomUUID() + ext;
            Path target = dir.resolve(fileName);

            file.transferTo(target.toFile());
            return target.toString();
        } catch (IOException e) {
            throw new QcException("INVOICE_SAVE_ERROR", "Cannot save file: " + e.getMessage());
        }
    }

    private InvoiceSummaryDto toSummaryDto(PurchaseInvoice i) {
        return InvoiceSummaryDto.builder()
            .id(i.getId())
            .invoiceNo(i.getInvoiceNo())
            .invoiceDate(i.getInvoiceDate())
            .supplierName(i.getSupplierName())
            .poNo(i.getPoNo())
            .invoiceTotal(i.getInvoiceTotal())
            .currencyCode(i.getCurrencyCode())
            .hasFile(i.getInvoiceFilePath() != null)
            .fileName(i.getInvoiceFileName())
            .stockInBatchId(i.getStockInBatchId())
            .uploadedAt(i.getUploadedAt())
            .itemCount(i.getItems() == null ? 0 : i.getItems().size())
            .build();
    }

    private InvoiceDetailDto toDetailDto(PurchaseInvoice i) {
        List<InvoiceItemDto> itemDtos = i.getItems() == null ? List.of()
            : i.getItems().stream().map(it -> InvoiceItemDto.builder()
                .id(it.getId())
                .slNo(it.getSlNo())
                .partNo(it.getPartNo())
                .description(it.getDescription())
                .hsnSac(it.getHsnSac())
                .quantity(it.getQuantity())
                .unitPrice(it.getUnitPrice())
                .lineTotal(it.getLineTotal())
                .matchedProductId(it.getMatchedProductId())
                .build()).toList();

        return InvoiceDetailDto.builder()
            .id(i.getId())
            .invoiceNo(i.getInvoiceNo())
            .invoiceDate(i.getInvoiceDate())
            .supplierId(i.getSupplierId())
            .supplierName(i.getSupplierName())
            .supplierGstin(i.getSupplierGstin())
            .poNo(i.getPoNo())
            .invoiceTotal(i.getInvoiceTotal())
            .currencyCode(i.getCurrencyCode())
            .fileName(i.getInvoiceFileName())
            .fileMimeType(i.getInvoiceMimeType())
            .fileSize(i.getInvoiceFileSize())
            .stockInBatchId(i.getStockInBatchId())
            .uploadedAt(i.getUploadedAt())
            .items(itemDtos)
            .build();
    }
    
    @Transactional(readOnly = true)
    public List<InvoiceDetailDto> getRecentWithItems(int limit) {
        return invoiceRepo.findTop20ByOrderByUploadedAtDesc().stream()
            .limit(limit)
            .map(this::toDetailDto)
            .toList();
    }

    @Transactional(readOnly = true)
    public InvoiceDetailDto getByInvoiceNo(String invoiceNo) {
        var header = invoiceRepo.findHeaderByInvoiceNo(invoiceNo);
        if (header == null) {
            throw new QcException("INVOICE_NOT_FOUND", "No invoice: " + invoiceNo);
        }

        int sl = 1;
        List<InvoiceItemDto> items = new java.util.ArrayList<>();
        for (var v : invoiceRepo.findItemsByInvoiceNo(invoiceNo)) {
            items.add(InvoiceItemDto.builder()
                .slNo(sl++)
                .partNo(v.getPartNo())
                .description(v.getDescription())
                .hsnSac(v.getHsnSac())
                .quantity(v.getQuantity() != null ? v.getQuantity().intValue() : null)
                .unitPrice(v.getUnitPrice())
                .lineTotal(v.getLineTotal())
                .build());
        }

        return InvoiceDetailDto.builder()
            .invoiceNo(header.getInvoiceNo())
            .supplierName(header.getSupplierName())
            .invoiceDate(header.getInvoiceDate() != null ? header.getInvoiceDate().toLocalDate() : null)
            .items(items)
            .build();
    }
}