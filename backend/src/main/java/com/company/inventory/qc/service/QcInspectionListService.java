package com.company.inventory.qc.service;

import com.company.inventory.qc.dto.QcInspectionListItemDto;
import com.company.inventory.qc.entity.QcInspection;
import com.company.inventory.qc.entity.QcItemDecision;
import com.company.inventory.qc.entity.StockInBatch;
import com.company.inventory.qc.repository.QcInspectionRepository;
import com.company.inventory.qc.repository.QcItemDecisionRepository;
import com.company.inventory.qc.repository.StockInBatchRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class QcInspectionListService {

    private final QcInspectionRepository inspectionRepo;
    private final StockInBatchRepository batchRepo;
    private final QcItemDecisionRepository itemDecisionRepo;

    // ─── Public methods ───────────────────────────────────────────

    public List<QcInspectionListItemDto> getApproved(Integer limit) {
        int lim = sanitize(limit);
        log.debug("Fetching approved inspections. Limit: {}", lim);
        Pageable pageable = PageRequest.of(0, lim);
        return inspectionRepo
                .findByOverallDecisionOrderByCreatedAtDesc("ACCEPTED", pageable)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<QcInspectionListItemDto> getRejected(Integer limit) {
        int lim = sanitize(limit);
        log.debug("Fetching rejected + partial inspections. Limit: {}", lim);
        Pageable pageable = PageRequest.of(0, lim);

        List<QcInspection> rejected = inspectionRepo
                .findByOverallDecisionOrderByCreatedAtDesc("REJECTED", pageable);
        List<QcInspection> partial  = inspectionRepo
                .findByOverallDecisionOrderByCreatedAtDesc("PARTIAL", pageable);

        return java.util.stream.Stream.concat(rejected.stream(), partial.stream())
                .sorted((a, b) -> safeCreatedAt(b).compareTo(safeCreatedAt(a)))
                .limit(lim)
                .map(this::toDto)
                .toList();
    }

    public List<QcInspectionListItemDto> getHistory(Integer limit) {
        int lim = sanitize(limit);
        log.debug("Fetching full inspection history. Limit: {}", lim);
        Pageable pageable = PageRequest.of(0, lim);
        return inspectionRepo
                .findAllByOrderByCreatedAtDesc(pageable)
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<QcInspectionListItemDto> getHistoryByDateRange(LocalDateTime from,
                                                                LocalDateTime to,
                                                                String decisionFilter) {
        log.info("Fetching history from {} to {}. Filter: {}", from, to, decisionFilter);
        List<QcInspection> list;
        if (decisionFilter != null && !decisionFilter.isBlank()
                && !"ALL".equalsIgnoreCase(decisionFilter)) {
            list = inspectionRepo.findByOverallDecisionAndCreatedAtBetweenOrderByCreatedAtDesc(
                    decisionFilter.toUpperCase(), from, to);
        } else {
            list = inspectionRepo.findByCreatedAtBetweenOrderByCreatedAtDesc(from, to);
        }
        log.debug("Date range query returned {} records.", list.size());
        return list.stream().map(this::toDto).toList();
    }

    // ─── Mapper ───────────────────────────────────────────────────

    private QcInspectionListItemDto toDto(QcInspection ins) {

        Long inspectionId = ins.getId();

        Long batchId = ins.getBatch() != null ? ins.getBatch().getId() : null;
        StockInBatch batch = ins.getBatch();

        // ★ INSPECTOR NAME — prefer the name the inspector actually typed on
        //   the form (e.g. "sowmyashree"), stored on the inspection. Fall back
        //   to the logged-in username only for older rows that never saved a
        //   typed name. Previously this always used getInspectedBy().getUsername(),
        //   which is why the reopened checklist showed the login name /
        //   "QC Inspector" instead of the name that was entered.
        String inspectorName = (ins.getInspectorName() != null && !ins.getInspectorName().isBlank())
                ? ins.getInspectorName()
                : (ins.getInspectedBy() != null ? ins.getInspectedBy().getUsername() : null);

        String overallDecision = ins.getOverallDecision();
        String remarks         = ins.getOverallRemarks();
        String pdfPath         = ins.getPdfPath();

        LocalDateTime inspectionDate = ins.getCreatedAt();
        LocalDateTime stockInDate    = batch != null ? batch.getCreatedAt() : null;

        String batchRef      = batch != null ? batch.getBatchRef()    : null;
        String supplierName  = batch != null ? batch.getSupplierName(): null;
        String invoiceNumber = batch != null ? batch.getInvoiceNo()   : null;

        String categoryCode = null;

        Totals totals = computeTotals(inspectionId);

        return QcInspectionListItemDto.builder()
                .inspectionId(inspectionId)
                .batchId(batchId)
                .batchRef(batchRef)
                .categoryCode(categoryCode)
                .supplierName(supplierName)
                .invoiceNumber(invoiceNumber)
                .overallDecision(overallDecision)
                .remarks(remarks)
                .inspectorName(inspectorName)
                .itemCount(totals.itemCount)
                .totalReceived(totals.received)
                .totalAccepted(totals.accepted)
                .totalRejected(totals.rejected)
                .totalHeld(totals.held)
                .stockInDate(stockInDate)
                .inspectionDate(inspectionDate)
                .createdAt(inspectionDate)
                .hasPdf(pdfPath != null && !pdfPath.isBlank())
                .build();
    }

    // ─── Totals from QcItemDecision ───────────────────────────────

    private Totals computeTotals(Long inspectionId) {
        Totals t = new Totals();
        if (inspectionId == null) return t;
        try {
            List<QcItemDecision> items = itemDecisionRepo
                    .findByInspectionInspectionId(inspectionId);
            t.itemCount = items.size();
            for (QcItemDecision d : items) {
                t.received = t.received.add(nz(d.getQtyReceived()));
                t.accepted = t.accepted.add(nz(d.getQtyAccepted()));
                t.rejected = t.rejected.add(nz(d.getQtyRejected()));
                t.held     = t.held.add(nz(d.getQtyHeld()));
            }
        } catch (Exception e) {
            log.debug("Totals computation skipped for inspection {}: {}", inspectionId, e.getMessage());
        }
        return t;
    }

    // ─── Helpers ──────────────────────────────────────────────────

    private LocalDateTime safeCreatedAt(QcInspection ins) {
        return ins.getCreatedAt() != null ? ins.getCreatedAt() : LocalDateTime.MIN;
    }

    private static int sanitize(Integer limit) {
        return (limit == null || limit <= 0) ? 200 : Math.min(limit, 1000);
    }

    private static BigDecimal nz(BigDecimal x) {
        return x == null ? BigDecimal.ZERO : x;
    }

    private static class Totals {
        int itemCount         = 0;
        BigDecimal received   = BigDecimal.ZERO;
        BigDecimal accepted   = BigDecimal.ZERO;
        BigDecimal rejected   = BigDecimal.ZERO;
        BigDecimal held       = BigDecimal.ZERO;
    }
}