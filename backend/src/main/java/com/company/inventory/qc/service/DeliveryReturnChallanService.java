package com.company.inventory.qc.service;

import com.company.inventory.entity.Lot;
import com.company.inventory.entity.User;
import com.company.inventory.qc.entity.*;
import com.company.inventory.qc.repository.*;
import com.company.inventory.repository.LotRepository;
import com.company.inventory.repository.UserRepository;
import com.company.inventory.service.StockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliveryReturnChallanService {

    private final DeliveryReturnChallanRepository dcRepo;
    private final BatchTimelineRepository         timelineRepo;
    private final StockInBatchRepository          batchRepo;
    private final QcInspectionRepository          inspectionRepo;
    private final LotRepository                   lotRepo;
    private final UserRepository                  userRepo;
    private final QcStockBridge                   stockBridge;
    private final StockService                    stockService;
    private final QcAlertService                  alertService;

    // ──────────────────────────────────────────────────────────
    // 1. CREATE DC
    // ──────────────────────────────────────────────────────────

    @Transactional
    public DeliveryReturnChallan createDc(Long batchId, String remarks) {
        log.info("=== CREATE DC START === batchId={}", batchId);

        StockInBatch batch = batchRepo.findById(batchId)
                .orElseThrow(() -> new RuntimeException("Batch not found: " + batchId));

        log.info("Batch found: ref={}, qcStatus={}", batch.getBatchRef(), batch.getQcStatus());

        // ── Load and log ALL lots ─────────────────────────────
        List<Lot> lots = stockBridge.getLotsForBatch(batchId);
        log.info("Total lots in batch {}: {}", batch.getBatchRef(), lots.size());
        lots.forEach(l -> log.info(
            "  Lot id={} | status={} | qcDecision={} | qcQtyAccepted={} | qcQtyRejected={} | purchaseQty={}",
            l.getLotId(), l.getStatus(), l.getQcDecision(),
            l.getQcQtyAccepted(), l.getQcQtyRejected(), l.getPurchaseQuantity()
        ));

        // ── ★ FIXED FILTER ────────────────────────────────────
        // DB shows: qcDecision=ACCEPTED but qcQtyRejected=50/100
        // Root cause: QcInspectionService sets qcDecision=ACCEPTED for PARTIAL
        //             but stores rejected qty in qcQtyRejected field
        // Fix: check ALL 3 conditions — any one is enough to include the lot
        List<Lot> rejectedLots = lots.stream()
                .filter(l -> {
                    boolean byDecision = "REJECTED".equalsIgnoreCase(l.getQcDecision())
                                     || "PARTIAL".equalsIgnoreCase(l.getQcDecision());
                    boolean byStatus   = l.getStatus() != null
                                     && "Cancelled".equalsIgnoreCase(l.getStatus().name());
                    boolean byQty      = l.getQcQtyRejected() != null
                                     && l.getQcQtyRejected().compareTo(BigDecimal.ZERO) > 0;
                    boolean include    = byDecision || byStatus || byQty;

                    log.debug("  Filter lot {} → byDecision={} | byStatus={} | byQty={} → include={}",
                            l.getLotId(), byDecision, byStatus, byQty, include);
                    return include;
                })
                .collect(Collectors.toList());

        log.info("Rejected lots matched for DC: {}", rejectedLots.size());

        if (rejectedLots.isEmpty()) {
            log.error(
                "No rejected lots found for batch={}. " +
                "Lot count={}, none had REJECTED/PARTIAL qcDecision, Cancelled status, or qcQtyRejected>0",
                batch.getBatchRef(), lots.size());
            throw new RuntimeException(
                "No rejected lots found in batch " + batch.getBatchRef()
                + ". Lots=" + lots.size()
                + ". Ensure QC inspection set qcQtyRejected > 0."
            );
        }

        // ── Check duplicate DC ────────────────────────────────
        boolean draftExists = dcRepo.existsByOriginalBatchIdAndStatus(batchId, "DRAFT");
        boolean sentExists  = dcRepo.existsByOriginalBatchIdAndStatus(batchId, "SENT");
        log.info("Duplicate check: draftExists={}, sentExists={}", draftExists, sentExists);
        if (draftExists || sentExists) {
            throw new RuntimeException("A DC already exists for batch " + batch.getBatchRef());
        }

        User actor = currentUser();
        log.info("Actor: {}", actor != null ? actor.getUsername() : "unknown");

        // ── Build DC header ───────────────────────────────────
        String dcNumber = generateDcNumber();
        log.info("Generated DC number: {}", dcNumber);

        DeliveryReturnChallan dc = DeliveryReturnChallan.builder()
                .dcNumber(dcNumber)
                .originalBatch(batch)
                .supplier(batch.getSupplier())
                .supplierName(batch.getSupplierName())
                .dcDate(LocalDate.now())
                .reason("QC_REJECTION")
                .status("DRAFT")
                .remarks(remarks)
                .createdBy(actor)
                .build();

        // ── Build DC line items ───────────────────────────────
        // ★ FIX: use qcQtyRejected (not purchaseQuantity) for PARTIAL lots
        List<DeliveryReturnChallanItem> items = new ArrayList<>();
        for (Lot lot : rejectedLots) {
            BigDecimal qtyRejected;
            if (lot.getQcQtyRejected() != null
                    && lot.getQcQtyRejected().compareTo(BigDecimal.ZERO) > 0) {
                qtyRejected = lot.getQcQtyRejected();
                log.info("  Lot {} → DC qty = qcQtyRejected = {}", lot.getLotId(), qtyRejected);
            } else {
                qtyRejected = lot.getPurchaseQuantity();
                log.warn("  Lot {} → qcQtyRejected null/0, fallback to purchaseQty={}",
                        lot.getLotId(), qtyRejected);
            }

            DeliveryReturnChallanItem item = DeliveryReturnChallanItem.builder()
                    .challan(dc)
                    .lot(lot)
                    .partNumber(lot.getProduct() != null ? lot.getProduct().getPartNumber()   : null)
                    .description(lot.getProduct() != null ? lot.getProduct().getDescription() : null)
                    .categoryName(lot.getProduct() != null && lot.getProduct().getCategory() != null
                            ? lot.getProduct().getCategory().getCategoryName() : null)
                    .qtyReturned(qtyRejected)
                    .unitPrice(lot.getPurchasePrice())
                    .build();
            items.add(item);
        }
        dc.setItems(items);

        BigDecimal totalQty = items.stream()
                .map(DeliveryReturnChallanItem::getQtyReturned)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        log.info("DC items built: count={}, totalReturnQty={}", items.size(), totalQty);

        // ── Save DC ───────────────────────────────────────────
        DeliveryReturnChallan saved = dcRepo.save(dc);
        log.info("DC saved: id={}, number={}", saved.getId(), saved.getDcNumber());

        // ── Update batch status ───────────────────────────────
        batch.setQcStatus("DC_RAISED");
        batch.setDc(saved);
        batchRepo.save(batch);
        log.info("Batch {} → qcStatus=DC_RAISED, dc_id={}", batch.getBatchRef(), saved.getId());

        // ── Quarantine rejected lots → Cancelled (no QC_REJECTED in enum) ──
        for (Lot lot : rejectedLots) {
            Lot.LotStatus prevStatus = lot.getStatus();
            lot.setStatus(Lot.LotStatus.Cancelled);
            log.info("  Lot {} status {} → Cancelled (quarantined for DC)", lot.getLotId(), prevStatus);
        }
        lotRepo.saveAll(rejectedLots);

        // ── Timeline ──────────────────────────────────────────
        addTimeline(batchId, "DC_RAISED",
                "Delivery Return Challan Raised",
                String.format("DC# %s · %d items · %.0f units to return to %s",
                        dcNumber, items.size(), totalQty.doubleValue(),
                        batch.getSupplierName()),
                saved.getId(), "DC", actor);

        log.info("=== CREATE DC COMPLETE === DC#{} for batch={}", dcNumber, batch.getBatchRef());
        return saved;
    }

    // ──────────────────────────────────────────────────────────
    // 2. SEND DC to supplier
    // ──────────────────────────────────────────────────────────

    @Transactional
    public DeliveryReturnChallan sendDc(Long dcId) {
        log.info("=== SEND DC START === dcId={}", dcId);

        DeliveryReturnChallan dc = getDc(dcId);
        log.info("DC found: number={}, status={}", dc.getDcNumber(), dc.getStatus());

        if (!"DRAFT".equals(dc.getStatus())) {
            throw new RuntimeException("DC " + dc.getDcNumber() + " is not in DRAFT status, current=" + dc.getStatus());
        }

        User actor = currentUser();
        dc.setStatus("SENT");
        dcRepo.save(dc);
        log.info("DC {} status → SENT", dc.getDcNumber());

        StockInBatch batch = dc.getOriginalBatch();
        batch.setQcStatus("REPLACEMENT_PENDING");
        batchRepo.save(batch);
        log.info("Batch {} → qcStatus=REPLACEMENT_PENDING", batch.getBatchRef());

        // Update lot statuses
        List<Lot> lots = stockBridge.getLotsForBatch(batch.getId());
        log.info("Updating lot statuses for batch {}, lots={}", batch.getBatchRef(), lots.size());
        // Note: Cancelled = quarantined lots (QC_REJECTED enum doesn't exist)
        // No lot status change needed on SEND — already Cancelled from createDc
        log.info("DC sent — lots remain Cancelled (quarantined) until replacement received");

        addTimeline(batch.getId(), "DC_SENT",
                "DC Sent to Supplier",
                "DC# " + dc.getDcNumber() + " dispatched. Awaiting replacement from " + batch.getSupplierName(),
                dc.getId(), "DC", actor);

        log.info("=== SEND DC COMPLETE === DC#{} sent to supplier={}", dc.getDcNumber(), batch.getSupplierName());
        return dc;
    }

    // ──────────────────────────────────────────────────────────
    // 3. REPLACEMENT RECEIVED → create new batch
    // ──────────────────────────────────────────────────────────

    @Transactional
    public StockInBatch markReplacementReceived(Long dcId, String newInvoiceNo, LocalDate receivedDate) {
        log.info("=== REPLACEMENT RECEIVED START === dcId={}, invoiceNo={}, receivedDate={}",
                dcId, newInvoiceNo, receivedDate);

        DeliveryReturnChallan dc = getDc(dcId);
        log.info("DC: number={}, status={}", dc.getDcNumber(), dc.getStatus());

        if (!"SENT".equals(dc.getStatus()) && !"DRAFT".equals(dc.getStatus())) {
            throw new RuntimeException("DC must be SENT or DRAFT, current=" + dc.getStatus());
        }

        StockInBatch originalBatch = dc.getOriginalBatch();
        User actor = currentUser();

        BigDecimal totalReplacementQty = dc.getItems().stream()
                .map(DeliveryReturnChallanItem::getQtyReturned)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        log.info("Replacement qty: {}", totalReplacementQty);

        // ── Create replacement batch ──────────────────────────
        String newBatchRef = originalBatch.getBatchRef() + "-R" + (originalBatch.getReplacementRound() + 1);
        log.info("Creating replacement batch: ref={}", newBatchRef);

        StockInBatch replacementBatch = new StockInBatch();
        replacementBatch.setBatchRef(newBatchRef);
        replacementBatch.setInvoiceNo(newInvoiceNo != null ? newInvoiceNo : originalBatch.getInvoiceNo());
        replacementBatch.setSupplier(originalBatch.getSupplier());
        replacementBatch.setSupplierName(originalBatch.getSupplierName());
        replacementBatch.setReceivedDate(receivedDate != null ? receivedDate : LocalDate.now());
        replacementBatch.setTotalQty(totalReplacementQty);
        replacementBatch.setItemCount(dc.getItems().size());
        // ★ CHANGED: was PENDING_QC. The replacement now skips re-inspection —
        //   it goes straight to stock and shows in history as approved. Setting
        //   QC_APPROVED keeps it out of the QC queue.
        replacementBatch.setQcStatus("QC_APPROVED");
        replacementBatch.setParentBatch(originalBatch);
        replacementBatch.setReplacementRound(originalBatch.getReplacementRound() + 1);
        replacementBatch.setDc(dc);
        replacementBatch.setCreatedBy(actor);
        replacementBatch.setNotes("Replacement for " + originalBatch.getBatchRef()
                + " · DC# " + dc.getDcNumber());
        StockInBatch savedReplacement = batchRepo.save(replacementBatch);
        log.info("Replacement batch saved: id={}, ref={}", savedReplacement.getId(), savedReplacement.getBatchRef());

        // ═══════════════════════════════════════════════════════════════
        // ★ THE FIX — create real Lot rows for the replacement and release
        //   them straight into current_stock.
        //
        //   Before this, markReplacementReceived made a new StockInBatch but
        //   NEVER created any Lot rows for it. So getLotsForBatch(-R1) returned
        //   empty: the batch showed in the queue but had nothing inside, and
        //   accepting it released nothing to stock.
        //
        //   Each DC line item carries the original rejected lot (item.getLot())
        //   and the replacement qty (item.getQtyReturned()). We clone product /
        //   rack / box / price / hsn / gst from that original lot, REUSE its lot
        //   number, link the clone to the replacement batch, then release it.
        // ═══════════════════════════════════════════════════════════════
        int stockedCount = 0;
        for (DeliveryReturnChallanItem dcItem : dc.getItems()) {
            Lot origLot = dcItem.getLot();
            if (origLot == null) {
                log.warn("DC item {} has no original lot — cannot create replacement lot", dcItem.getId());
                continue;
            }
            BigDecimal qty = dcItem.getQtyReturned() != null
                    ? dcItem.getQtyReturned() : BigDecimal.ZERO;
            if (qty.compareTo(BigDecimal.ZERO) <= 0) {
                log.warn("DC item {} has qty {} — skipping", dcItem.getId(), qty);
                continue;
            }

            Lot rep = new Lot();
            // ★ FIX: lot_number has a UNIQUE constraint (see Lot.java) — reusing the
            //   original number throws "Duplicate entry ... for key lots.UK_...".
            //   Suffix with the replacement round: LOT-...-R1 / -R2. Still traceable
            //   to the original, but unique. Guard length against the column's 50 chars.
            int round = savedReplacement.getReplacementRound();
            String baseLotNo = origLot.getLotNumber();
            String repLotNo  = baseLotNo + "-R" + round;
            if (repLotNo.length() > 50) {                       // column is length=50
                repLotNo = baseLotNo.substring(0, 47 - String.valueOf(round).length())
                         + "-R" + round;
            }
            rep.setLotNumber(repLotNo);                         // ★ unique replacement number
            rep.setProduct(origLot.getProduct());
            rep.setSupplier(origLot.getSupplier());
            rep.setPurchaseQuantity(qty);
            rep.setInitialQuantity(qty);
            rep.setRemainingQuantity(qty);
            rep.setPurchasePrice(origLot.getPurchasePrice());
            rep.setPurchaseDate(savedReplacement.getReceivedDate() != null
                    ? savedReplacement.getReceivedDate() : LocalDate.now());
            rep.setRack(origLot.getRack());
            rep.setBox(origLot.getBox());
            rep.setStatus(Lot.LotStatus.Active);
            rep.setReferenceNumber(savedReplacement.getInvoiceNo());
            rep.setHsnCode(origLot.getHsnCode());
            rep.setGstPercent(origLot.getGstPercent());
            rep.setGstAmount(origLot.getGstAmount());
            rep.setNotes("Replacement lot for " + originalBatch.getBatchRef()
                    + " · DC# " + dc.getDcNumber());
            rep.setStockInBatch(savedReplacement);             // ★ link to -R1
            rep.setCreatedBy(actor);
            // fresh lot: no QC decision — it never goes through QC again
            Lot savedRep = lotRepo.save(rep);

            // ★ push straight into current_stock
            stockBridge.releaseLotToStock(savedRep, qty);
            stockedCount++;
            log.info("  Replacement lot created id={}, lotNo={}, qty={} → released to stock",
                    savedRep.getLotId(), savedRep.getLotNumber(), qty);
        }
        log.info("Replacement stocked: {} lot(s) released to current_stock for batch {}",
                stockedCount, savedReplacement.getBatchRef());

        // ═══════════════════════════════════════════════════════════════
        // ★ INSPECTION HISTORY RECORD
        //   The replacement skips the QC queue, so no inspection is created by
        //   the normal flow — and it would be invisible in Inspection History.
        //   We write ONE auto-approved inspection row here so the replacement
        //   still appears in history with a clear "skipped re-QC" note.
        // ═══════════════════════════════════════════════════════════════
        try {
            QcInspection insp = new QcInspection();
            insp.setBatch(savedReplacement);
            insp.setInvoiceNo(savedReplacement.getInvoiceNo());
            insp.setSupplierName(savedReplacement.getSupplierName());
            insp.setReceivedDate(savedReplacement.getReceivedDate() != null
                    ? savedReplacement.getReceivedDate() : LocalDate.now());
            insp.setLotCount(stockedCount);
            insp.setOverallDecision("ACCEPTED");
            insp.setOverallRemarks(String.format(
                    "Auto-approved replacement for %s (DC# %s) — skipped re-QC, stocked directly.",
                    originalBatch.getBatchRef(), dc.getDcNumber()));
            insp.setInspectedBy(actor);
            insp.setInspectedAt(LocalDateTime.now());
            inspectionRepo.save(insp);
            log.info("Inspection-history record written for replacement batch {}",
                    savedReplacement.getBatchRef());
        } catch (Exception e) {
            // never fail the replacement just because the history row didn't save
            log.warn("Could not write inspection-history record for replacement {}: {}",
                    savedReplacement.getBatchRef(), e.getMessage());
        }

        // ── Update DC ─────────────────────────────────────────
        dc.setStatus("REPLACEMENT_RECEIVED");
        dc.setReplacementBatch(savedReplacement);
        dcRepo.save(dc);
        log.info("DC {} → status=REPLACEMENT_RECEIVED, replacementBatchId={}",
                dc.getDcNumber(), savedReplacement.getId());

        // ── Update original batch ─────────────────────────────
        originalBatch.setQcStatus("REPLACEMENT_RECEIVED");
        batchRepo.save(originalBatch);
        log.info("Original batch {} → qcStatus=REPLACEMENT_RECEIVED", originalBatch.getBatchRef());

        // ── Cancel replaced lots ──────────────────────────────
        List<Lot> lots = stockBridge.getLotsForBatch(originalBatch.getId());
        log.info("Cancelling replaced lots for batch {}, total lots={}", originalBatch.getBatchRef(), lots.size());
        lots.stream()
            .filter(l -> "REJECTED".equalsIgnoreCase(l.getQcDecision())
                      || (l.getQcQtyRejected() != null
                          && l.getQcQtyRejected().compareTo(BigDecimal.ZERO) > 0))
            .forEach(l -> {
                l.setStatus(Lot.LotStatus.Cancelled);
                log.info("  Lot {} → Cancelled (replaced)", l.getLotId());
            });
        lotRepo.saveAll(lots);

        // ── Timeline ──────────────────────────────────────────
        addTimeline(originalBatch.getId(), "REPLACEMENT_RECEIVED",
                "Replacement Received",
                String.format("%.0f units received · New batch: %s",
                        totalReplacementQty.doubleValue(), replacementBatch.getBatchRef()),
                savedReplacement.getId(), "BATCH", actor);

        addTimeline(savedReplacement.getId(), "STOCK_IN",
                "Replacement Stocked",
                String.format("%.0f units added to current stock · Original: %s (skipped re-QC)",
                        totalReplacementQty.doubleValue(), originalBatch.getBatchRef()),
                originalBatch.getId(), "BATCH", actor);

        // ★ No "Ready for QC" alert — the replacement skips QC and is already
        //   stocked. Raising a QC alert would point at a batch that never
        //   enters the queue.

        log.info("=== REPLACEMENT RECEIVED COMPLETE === newBatch={} for DC={}",
                replacementBatch.getBatchRef(), dc.getDcNumber());
        return savedReplacement;
    }

    // ──────────────────────────────────────────────────────────
    // 4. BATCH TIMELINE
    // ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getBatchTimeline(Long batchId) {
        log.debug("Getting timeline for batchId={}", batchId);

        List<Long> batchIds = new ArrayList<>();
        batchIds.add(batchId);

        List<StockInBatch> replacements = batchRepo.findAll().stream()
                .filter(b -> b.getParentBatch() != null
                          && batchId.equals(b.getParentBatch().getId()))
                .collect(Collectors.toList());
        replacements.forEach(r -> {
            batchIds.add(r.getId());
            log.debug("  Including replacement batch id={}, ref={}", r.getId(), r.getBatchRef());
        });

        List<BatchTimelineEvent> events =
                timelineRepo.findByBatchIdInOrderByHappenedAtAsc(batchIds);
        log.debug("Timeline events found: {} for batchIds={}", events.size(), batchIds);

        return events.stream().map(e -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id",         e.getId());
            m.put("batchId",    e.getBatchId());
            m.put("eventType",  e.getEventType());
            m.put("title",      e.getTitle());
            m.put("detail",     e.getDetail());
            m.put("refId",      e.getRefId());
            m.put("refType",    e.getRefType());
            m.put("happenedAt", e.getHappenedAt());
            return m;
        }).collect(Collectors.toList());
    }

    // ──────────────────────────────────────────────────────────
    // 5. GET DC list / detail
    // ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllDcs() {
        List<Map<String, Object>> result = dcRepo.findAllByOrderByCreatedAtDesc().stream()
                .map(this::dcToMap)
                .collect(Collectors.toList());
        log.debug("getAllDcs → {} records", result.size());
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDcDetail(Long dcId) {
        log.debug("getDcDetail id={}", dcId);
        return dcToMap(getDc(dcId));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDcsByBatch(Long batchId) {
        List<Map<String, Object>> result = dcRepo
                .findByOriginalBatchIdOrderByCreatedAtDesc(batchId).stream()
                .map(this::dcToMap)
                .collect(Collectors.toList());
        log.debug("getDcsByBatch batchId={} → {} DCs", batchId, result.size());
        return result;
    }

    // ──────────────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────────────

    private DeliveryReturnChallan getDc(Long dcId) {
        return dcRepo.findById(dcId)
                .orElseThrow(() -> new RuntimeException("DC not found: " + dcId));
    }

    private String generateDcNumber() {
        String date  = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long   count = dcRepo.count() + 1;
        String dcNum = String.format("RDC-%s-%03d", date, count);
        log.debug("generateDcNumber → {}", dcNum);
        return dcNum;
    }

    private void addTimeline(Long batchId, String eventType, String title,
                              String detail, Long refId, String refType, User actor) {
        try {
            BatchTimelineEvent event = BatchTimelineEvent.builder()
                    .batchId(batchId)
                    .eventType(eventType)
                    .title(title)
                    .detail(detail)
                    .refId(refId)
                    .refType(refType)
                    .happenedAt(LocalDateTime.now())
                    .createdBy(actor)
                    .build();
            timelineRepo.save(event);
            log.debug("Timeline saved: batchId={} type={} title={}", batchId, eventType, title);
        } catch (Exception e) {
            log.error("Timeline save failed: batchId={} type={} error={}", batchId, eventType, e.getMessage());
        }
    }

    private User currentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || auth.getName() == null) {
                log.warn("currentUser: no authentication in context");
                return null;
            }
            User u = userRepo.findByUsername(auth.getName()).orElse(null);
            log.debug("currentUser: {}", u != null ? u.getUsername() : "not found");
            return u;
        } catch (Exception e) {
            log.warn("currentUser resolution failed: {}", e.getMessage());
            return null;
        }
    }

    private Map<String, Object> dcToMap(DeliveryReturnChallan dc) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",           dc.getId());
        m.put("dcNumber",     dc.getDcNumber());
        m.put("status",       dc.getStatus());
        m.put("reason",       dc.getReason());
        m.put("dcDate",       dc.getDcDate());
        m.put("remarks",      dc.getRemarks());
        m.put("supplierName", dc.getSupplierName());
        m.put("createdAt",    dc.getCreatedAt());
        m.put("updatedAt",    dc.getUpdatedAt());

        if (dc.getOriginalBatch() != null) {
            m.put("originalBatchId",  dc.getOriginalBatch().getId());
            m.put("originalBatchRef", dc.getOriginalBatch().getBatchRef());
            m.put("originalStatus",   dc.getOriginalBatch().getQcStatus());
        }

        if (dc.getReplacementBatch() != null) {
            m.put("replacementBatchId",  dc.getReplacementBatch().getId());
            m.put("replacementBatchRef", dc.getReplacementBatch().getBatchRef());
            m.put("replacementStatus",   dc.getReplacementBatch().getQcStatus());
        }

        try {
            List<Map<String, Object>> items = dc.getItems().stream().map(i -> {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put("id",           i.getId());
                im.put("lotId",        i.getLot() != null ? i.getLot().getLotId() : null);
                im.put("partNumber",   i.getPartNumber());
                im.put("description",  i.getDescription());
                im.put("categoryName", i.getCategoryName());
                im.put("qtyReturned",  i.getQtyReturned());
                im.put("unitPrice",    i.getUnitPrice());
                im.put("remarks",      i.getRemarks());
                return im;
            }).collect(Collectors.toList());
            m.put("items",     items);
            m.put("itemCount", items.size());
            m.put("totalQty",  dc.getItems().stream()
                    .map(DeliveryReturnChallanItem::getQtyReturned)
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
        } catch (Exception e) {
            log.warn("dcToMap: failed to map items for DC {}: {}", dc.getId(), e.getMessage());
            m.put("items",     List.of());
            m.put("itemCount", 0);
            m.put("totalQty",  BigDecimal.ZERO);
        }

        return m;
    }
}