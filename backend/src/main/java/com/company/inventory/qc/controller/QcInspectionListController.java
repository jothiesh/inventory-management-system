package com.company.inventory.qc.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.entity.Lot;
import com.company.inventory.qc.entity.QcInspection;
import com.company.inventory.qc.entity.StockInBatch;
import com.company.inventory.qc.repository.QcInspectionRepository;
import com.company.inventory.qc.service.QcStockBridge;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * QC Inspection Listing — roles: OWNER · STORE_MANAGER · QC
 *
 * Bug fixes:
 *  ★ PARTIAL inspection qtyAccepted=0 → uses lot.getQcQtyAccepted() (correct field)
 *  ★ /rejected returns REJECTED + PARTIAL both
 *  ★ DC status from StockInBatch.getDc() (DeliveryReturnChallan entity)
 *  ★ inspectorName now prefers the TYPED name (i.getInspectorName()), falling
 *    back to the logged-in User only for older rows. Applies to approved,
 *    rejected and history because they all share toMap().
 */
@Slf4j
@RestController
@RequestMapping("/api/qc/inspections")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "QC Inspections List")
public class QcInspectionListController {

    private final QcInspectionRepository inspectionRepo;
    private final QcStockBridge          stockBridge;

    // ── APPROVED ──────────────────────────────────────────────
    @GetMapping("/approved")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getApproved() {
        List<Map<String, Object>> result = inspectionRepo.findAll().stream()
            .filter(i -> "ACCEPTED".equalsIgnoreCase(i.getOverallDecision()))
            .sorted((a, b) -> b.getInspectedAt().compareTo(a.getInspectedAt()))
            .map(this::toMap)
            .collect(Collectors.toList());
        log.debug("Approved inspections: {}", result.size());
        return ResponseEntity.ok(ApiResponse.success("Approved inspections", result));
    }

    // ── REJECTED + PARTIAL ────────────────────────────────────
    @GetMapping("/rejected")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRejected() {
        // ★ FIX: include PARTIAL — some units were rejected
        List<Map<String, Object>> result = inspectionRepo.findAll().stream()
            .filter(i -> "REJECTED".equalsIgnoreCase(i.getOverallDecision())
                      || "PARTIAL".equalsIgnoreCase(i.getOverallDecision()))
            .sorted((a, b) -> b.getInspectedAt().compareTo(a.getInspectedAt()))
            .map(this::toMap)
            .collect(Collectors.toList());
        log.debug("Rejected+Partial inspections: {}", result.size());
        return ResponseEntity.ok(ApiResponse.success("Rejected inspections", result));
    }

    // ── HISTORY ───────────────────────────────────────────────
    @GetMapping("/history")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHistory() {
        List<Map<String, Object>> result = inspectionRepo.findAll().stream()
            .sorted((a, b) -> b.getInspectedAt().compareTo(a.getInspectedAt()))
            .map(this::toMap)
            .collect(Collectors.toList());
        log.debug("Inspection history total: {}", result.size());
        return ResponseEntity.ok(ApiResponse.success("Inspection history", result));
    }

    // ═══════════════════════════════════════════════════════════
    // toMap — all bugs fixed
    // ═══════════════════════════════════════════════════════════
    private Map<String, Object> toMap(QcInspection i) {
        Map<String, Object> m = new HashMap<>();

        m.put("id",              i.getId());
        m.put("overallDecision", i.getOverallDecision());
        m.put("overallRemarks",  i.getOverallRemarks());
        m.put("inspectedAt",     i.getInspectedAt());
        m.put("receivedDate",    i.getReceivedDate());
        m.put("lotCount",        i.getLotCount());
        m.put("pdfPath",         i.getPdfPath());
        m.put("formNo",          i.getFormNo());
        m.put("createdAt",       i.getCreatedAt());
        m.put("templateCode",    i.getTemplateCode());

        // ── Inspector name ────────────────────────────────────
        // ★ FIX: prefer the name the inspector TYPED on the form
        //   (i.getInspectorName(), e.g. "sowmyashree"). Only fall back to the
        //   logged-in User's full name / username for older rows that never
        //   saved a typed name. This method previously ONLY used getInspectedBy(),
        //   ignoring the typed name entirely — which is why the screen showed the
        //   login name / "QC Inspector" instead of what was entered.
        String typedName = i.getInspectorName();
        if (typedName != null && !typedName.isBlank()) {
            m.put("inspectorName", typedName.trim());
        } else if (i.getInspectedBy() != null) {
            String name = i.getInspectedBy().getUsername();
            try {
                String full = i.getInspectedBy().getFullName();
                if (full != null && !full.isBlank()) name = full;
            } catch (Exception ignored) {}
            m.put("inspectorName", name);
        } else {
            m.put("inspectorName", null);
        }
        // keep the raw login username available separately
        m.put("inspectorUsername",
                i.getInspectedBy() != null ? i.getInspectedBy().getUsername() : null);

        // ── Batch resolution ──────────────────────────────────
        StockInBatch b = null;
        try { b = i.getBatch(); } catch (Exception ignored) {}

        String invoiceNo    = i.getInvoiceNo();
        String supplierName = i.getSupplierName();

        if (b != null) {
            String ref = b.getBatchRef();
            if (ref == null || ref.isBlank() || "null".equalsIgnoreCase(ref))
                ref = "SIB-" + String.format("%05d", b.getId());

            m.put("batchRef",       ref);
            m.put("batchId",        b.getId());
            m.put("batchStatus",    b.getQcStatus());
            m.put("batchCreatedAt", b.getCreatedAt());

            if (invoiceNo == null || invoiceNo.isBlank())
                invoiceNo = b.getInvoiceNo();

            if (supplierName == null || supplierName.isBlank()) {
                supplierName = b.getSupplierName();
                if ((supplierName == null || supplierName.isBlank()) && b.getSupplier() != null) {
                    try { supplierName = b.getSupplier().getSupplierName(); }
                    catch (Exception ignored) {}
                }
            }

            // ★ DC status — b.getDc() returns the DeliveryReturnChallan entity
            try {
                var dc = b.getDc();          // DeliveryReturnChallan entity (nullable)
                if (dc != null) {
                    m.put("dcStatus", dc.getStatus() != null ? dc.getStatus() : "DC_RAISED");
                    m.put("dcId",     dc.getId());
                } else {
                    m.put("dcStatus", null);
                    m.put("dcId",     null);
                }
            } catch (Exception ignored) {
                m.put("dcStatus", null);
                m.put("dcId",     null);
            }

        } else {
            m.put("batchRef", "SIB-" + String.format("%05d", i.getId()));
            m.put("batchId",  null);
            m.put("dcStatus", null);
            m.put("dcId",     null);
        }

        m.put("invoiceNo",     invoiceNo);
        m.put("invoiceNumber", invoiceNo);
        m.put("supplierName",  supplierName);

        // ── Lot aggregation ── ★ FIXED field names ────────────
        int        itemCount    = 0;
        BigDecimal qtyReceived  = BigDecimal.ZERO;
        BigDecimal qtyAccepted  = BigDecimal.ZERO;
        BigDecimal qtyRejected  = BigDecimal.ZERO;
        BigDecimal qtyHeld      = BigDecimal.ZERO;
        String     categoryName = null;

        if (b != null) {
            try {
                List<Lot> lots = stockBridge.getLotsForBatch(b.getId());
                itemCount = lots.size();

                for (Lot lot : lots) {
                    if (lot.getPurchaseQuantity() != null)
                        qtyReceived = qtyReceived.add(lot.getPurchaseQuantity());

                    // ★ CORRECT: fields written by QcStockBridge.writeQcOutcomeOnLot()
                    if (lot.getQcQtyAccepted() != null)
                        qtyAccepted = qtyAccepted.add(lot.getQcQtyAccepted());
                    if (lot.getQcQtyRejected() != null)
                        qtyRejected = qtyRejected.add(lot.getQcQtyRejected());
                    if (lot.getQcQtyHeld() != null)
                        qtyHeld = qtyHeld.add(lot.getQcQtyHeld());

                    if (categoryName == null) {
                        try {
                            categoryName = lot.getProduct().getCategory().getCategoryName();
                        } catch (Exception ignored) {}
                    }
                }
            } catch (Exception e) {
                log.warn("Lot aggregation failed for inspection {}: {}", i.getId(), e.getMessage());
            }
        }

        // ★ Fallback ONLY for old bulk decisions with no per-lot data
        if (qtyAccepted.signum() == 0 && qtyRejected.signum() == 0 && qtyHeld.signum() == 0) {
            String d = i.getOverallDecision();
            if      ("ACCEPTED".equalsIgnoreCase(d)) qtyAccepted = qtyReceived;
            else if ("REJECTED".equalsIgnoreCase(d)) qtyRejected = qtyReceived;
            else if ("HOLD".equalsIgnoreCase(d))     qtyHeld     = qtyReceived;
            // PARTIAL → no fallback, real split must exist in lots
        }

        m.put("itemCount",     itemCount);
        m.put("qtyReceived",   qtyReceived);
        m.put("qtyAccepted",   qtyAccepted);
        m.put("qtyRejected",   qtyRejected);
        m.put("qtyHeld",       qtyHeld);
        m.put("totalReceived", qtyReceived);  // both key names for frontend
        m.put("totalAccepted", qtyAccepted);
        m.put("totalRejected", qtyRejected);
        m.put("totalHeld",     qtyHeld);
        m.put("categoryName",  categoryName);
        m.put("categoryCode",  categoryName);

        return m;
    }
}