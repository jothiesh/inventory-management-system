package com.company.inventory.controller;

import com.company.inventory.dto.request.PurchaseInvoiceDtos.CreateInvoiceRequest;
import com.company.inventory.dto.request.PurchaseInvoiceDtos.InvoiceDetailDto;
import com.company.inventory.dto.request.PurchaseInvoiceDtos.InvoiceSummaryDto;
import com.company.inventory.service.PurchaseInvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Purchase Invoice REST API.
 *
 * IMPORTANT: Uses hasAnyAuthority() — NOT hasAnyRole().
 * hasAnyRole() prepends ROLE_ prefix automatically (e.g. ROLE_STORE_MANAGER),
 * but authorities are stored without prefix (e.g. STORE_MANAGER).
 * hasAnyAuthority() matches the exact string — which is what we need.
 */
@RestController
@RequestMapping("/api/qc/invoices")
@RequiredArgsConstructor
@Slf4j
public class PurchaseInvoiceController {

    private final PurchaseInvoiceService service;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('QC','ADMIN','SUPER_ADMIN','OWNER','STORE_MANAGER')")
    public ResponseEntity<Map<String, Long>> upload(@RequestPart("file") MultipartFile file) {
        log.info("REST Request received: POST /api/qc/invoices/upload | Intercepted multi-part document stream file ingestion layer.");
        Long id = service.uploadScannedInvoice(file);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('QC','ADMIN','SUPER_ADMIN','OWNER','STORE_MANAGER')")
    public ResponseEntity<InvoiceDetailDto> create(@RequestBody CreateInvoiceRequest req) {
        log.info("REST Request received: POST /api/qc/invoices | Initializing blank metadata template profile container registry.");
        InvoiceDetailDto detail = service.saveOrUpdate(null, req);
        return ResponseEntity.ok(detail);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('QC','ADMIN','SUPER_ADMIN','OWNER','STORE_MANAGER')")
    public ResponseEntity<InvoiceDetailDto> update(@PathVariable Long id,
                                                   @RequestBody CreateInvoiceRequest req) {
        log.info("REST Request received: PUT /api/qc/invoices/{} | Rewriting target document attributes layer configuration data model rows.", id);
        InvoiceDetailDto detail = service.saveOrUpdate(id, req);
        return ResponseEntity.ok(detail);
    }

    @PostMapping("/{id}/link/{batchId}")
    @PreAuthorize("hasAnyAuthority('QC','ADMIN','SUPER_ADMIN','OWNER','STORE_MANAGER')")
    public ResponseEntity<Void> link(@PathVariable Long id, @PathVariable Long batchId) {
        log.info("REST Request received: POST /api/qc/invoices/{}/link/{} | Injecting bridge relationship workflow tracking tokens mapping.", id, batchId);
        service.linkToStockInBatch(id, batchId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('QC','ADMIN','SUPER_ADMIN','OWNER','STORE_MANAGER')")
    public ResponseEntity<Page<InvoiceSummaryDto>> search(
            @RequestParam(required = false, defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.debug("REST Request received: GET /api/qc/invoices | Search querying pagination grids matching filter token phrase: '{}' [Index: {}, Cap: {}]", q, page, size);
        return ResponseEntity.ok(service.search(q, page, size));
    }

    /**
     * Get full invoice detail (header + line items) by invoice NUMBER.
     * Uses a query param (?no=...) instead of a path variable so invoice numbers
     * containing slashes (e.g. "26-27/03146") don't get rejected by Tomcat.
     */
    @GetMapping("/by-no")
    @PreAuthorize("hasAnyAuthority('QC','ADMIN','SUPER_ADMIN','OWNER','STORE_MANAGER')")
    public ResponseEntity<InvoiceDetailDto> byInvoiceNo(@RequestParam("no") String invoiceNo) {
        log.info("REST Request received: GET /api/qc/invoices/by-no?no={} | Resolving invoice detail by invoice number from stock_in_batch.", invoiceNo);
        return ResponseEntity.ok(service.getByInvoiceNo(invoiceNo));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('QC','ADMIN','SUPER_ADMIN','OWNER','STORE_MANAGER')")
    public ResponseEntity<InvoiceDetailDto> getById(@PathVariable Long id) {
        log.debug("REST Request received: GET /api/qc/invoices/{} | Resolving unique transaction tracking record data context mapping node.", id);
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/{id}/file")
    @PreAuthorize("hasAnyAuthority('QC','ADMIN','SUPER_ADMIN','OWNER','STORE_MANAGER')")
    public ResponseEntity<byte[]> downloadFile(@PathVariable Long id) {
        log.info("REST Request received: GET /api/qc/invoices/{}/file | Processing upstream local hardware binary extraction attachment download pipeline.", id);
        InvoiceDetailDto detail = service.getById(id);
        byte[] bytes = service.readInvoiceFile(id);

        String mime = detail.getFileMimeType() != null ? detail.getFileMimeType() : "application/octet-stream";
        String name = detail.getFileName()     != null ? detail.getFileName()     : ("invoice-" + id);

        log.info("Streaming multi-part file content envelope out to download endpoint buffer loops. File tag Designation: '{}', Mime signature: '{}'", name, mime);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + name + "\"")
            .contentType(MediaType.parseMediaType(mime))
            .body(bytes);
    }

    @GetMapping("/recent")
    @PreAuthorize("hasAnyAuthority('QC','ADMIN','SUPER_ADMIN','OWNER','STORE_MANAGER')")
    public ResponseEntity<List<InvoiceDetailDto>> recent(
            @RequestParam(defaultValue = "10") int limit) {
        log.info("GET /api/qc/invoices/recent | limit={}", limit);
        return ResponseEntity.ok(service.getRecentWithItems(limit));
    }
}