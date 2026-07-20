package com.company.inventory.service;

import com.company.inventory.entity.DeliveryChallan;
import com.company.inventory.entity.DeliveryChallanEvent;
import com.company.inventory.entity.DeliveryChallanItem;

import com.company.inventory.repository.DeliveryChallanRepository;
import com.company.inventory.dto.request.AssemblyReceivedRequest;
import com.company.inventory.dto.request.CreateDeliveryChallanRequest;
import com.company.inventory.dto.response.DeliveryChallanResponse;
import com.company.inventory.entity.CurrentStock;
import com.company.inventory.entity.Lot;
import com.company.inventory.entity.Product;
import com.company.inventory.entity.StockMovement;
import com.company.inventory.entity.User;
import com.company.inventory.exception.InsufficientStockException;
import com.company.inventory.qc.entity.StockInBatch;
import com.company.inventory.qc.repository.StockInBatchRepository;
import com.company.inventory.qc.service.QcAlertService;
import com.company.inventory.repository.CurrentStockRepository;
import com.company.inventory.repository.DeliveryChallanEventRepository;
import com.company.inventory.repository.LotRepository;
import com.company.inventory.repository.StockMovementRepository;
import com.company.inventory.repository.SupplierRepository;
import com.company.inventory.service.LotService;
import com.company.inventory.service.ProductService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Delivery Challan (Job Work):
 *  - CREATE  → FIFO stock-OUT of OUR components (TransactionType.JobWork,
 *              reference = DC number, one transactionGroupId per DC)
 *  - SEND    → mark dispatched to supplier
 *  - ASSEMBLY RECEIVED → StockInBatch (PENDING_QC) created + optional lots
 *              stocked in for the finished assembly → lands in QC queue
 *  - CLOSE   → cycle complete
 *
 * Supplier on a DC is the DESTINATION only. It never filters products.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryChallanService {

    private final DeliveryChallanRepository dcRepository;
    private final DeliveryChallanEventRepository eventRepository;
    private final LotService lotService;
    private final LotRepository lotRepository;
    private final CurrentStockRepository currentStockRepository;
    private final StockMovementRepository movementRepository;
    private final ProductService productService;
    private final SupplierRepository supplierRepository;
    private final StockInBatchRepository stockInBatchRepository;
    private final QcAlertService qcAlertService;

    // ─────────────────────────────────────────────────────────────
    // CREATE — components issued from stock immediately (FIFO)
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public DeliveryChallanResponse create(CreateDeliveryChallanRequest req, User currentUser) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new IllegalArgumentException("At least one component is required");
        }

        DeliveryChallan dc = new DeliveryChallan();
        dc.setDcNumber(generateDcNumber());
        dc.setSupplierId(req.getSupplierId());

        String name = trimOrNull(req.getSupplierName());
        if (name == null && req.getSupplierId() != null) {
            name = supplierRepository.findById(req.getSupplierId())
                    .map(s -> s.getSupplierName()).orElse(null);
        }
        dc.setSupplierName(name);
        dc.setSupplierAddress(trimOrNull(req.getSupplierAddress()));
        dc.setSupplierGstin(trimOrNull(req.getSupplierGstin()));
        dc.setDcDate(req.getDcDate() != null ? req.getDcDate() : LocalDate.now());
        dc.setRemarks(trimOrNull(req.getRemarks()));
        dc.setStatus("DRAFT");
        dc.setPurpose("JOB_WORK");
        dc.setCreatedById(currentUser != null ? currentUser.getUserId() : null);
        dc.setCreatedByName(currentUser != null ? currentUser.getUsername() : null);

        String groupId = UUID.randomUUID().toString();
        dc.setTxnGroupId(groupId);

        BigDecimal totalQty = BigDecimal.ZERO;
        for (CreateDeliveryChallanRequest.Item it : req.getItems()) {
            if (it.getProductId() == null) {
                throw new IllegalArgumentException("Item missing productId");
            }
            Product product = productService.getProductById(it.getProductId());
            BigDecimal qty = it.getQty();
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Invalid quantity for " + product.getPartNumber());
            }

            // FIFO stock OUT as JobWork, ref = DC number
            deductFifo(product, qty, dc.getDcNumber(), groupId, currentUser);

            DeliveryChallanItem item = new DeliveryChallanItem();
            item.setChallan(dc);
            item.setProductId(product.getProductId());
            item.setPartNumber(it.getPartNumber() != null ? it.getPartNumber() : product.getPartNumber());
            item.setDescription(it.getDescription() != null ? it.getDescription() : product.getDescription());
            item.setCategoryName(it.getCategoryName() != null ? it.getCategoryName()
                    : (product.getCategory() != null ? product.getCategory().getCategoryName() : null));
            item.setQty(qty);
            item.setRate(it.getRate());
            item.setRemarks(trimOrNull(it.getRemarks()));
            dc.getItems().add(item);
            totalQty = totalQty.add(qty);
        }
        dc.setItemCount(dc.getItems().size());
        dc.setTotalQty(totalQty);

        DeliveryChallan saved = dcRepository.save(dc);
        addEvent(saved.getId(), "DC_CREATED", "Delivery Challan created",
                saved.getItemCount() + " component(s), qty " + plain(totalQty)
                        + " issued from stock (Job Work)"
                        + (name != null ? " → " + name : ""));

        if (Boolean.TRUE.equals(req.getSendNow())) {
            markSent(saved);
            saved = dcRepository.save(saved);
        }

        log.info("Delivery Challan {} created. items={}, qty={}, group={}",
                saved.getDcNumber(), saved.getItemCount(), plain(totalQty), groupId);

        return toResponse(dcRepository.findByIdWithItems(saved.getId()).orElse(saved), true);
    }

    // ─────────────────────────────────────────────────────────────
    // SEND
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public DeliveryChallanResponse send(Long id) {
        DeliveryChallan dc = get(id);
        if (!"DRAFT".equals(dc.getStatus())) {
            throw new IllegalStateException(
                    "Only DRAFT challans can be sent — current status is " + dc.getStatus());
        }
        markSent(dc);
        dcRepository.save(dc);
        return toResponse(dcRepository.findByIdWithItems(id).orElse(dc), true);
    }

    private void markSent(DeliveryChallan dc) {
        dc.setStatus("SENT");
        dc.setSentAt(LocalDateTime.now());
        addEvent(dc.getId(), "DC_SENT", "Sent to supplier",
                "Components dispatched to "
                        + (dc.getSupplierName() != null ? dc.getSupplierName() : "supplier")
                        + " — awaiting assembly");
    }

    // ─────────────────────────────────────────────────────────────
    // ASSEMBLY RECEIVED — new PENDING_QC batch, optional lots IN
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public DeliveryChallanResponse assemblyReceived(Long id, AssemblyReceivedRequest req, User currentUser) {
        DeliveryChallan dc = get(id);
        if (!"SENT".equals(dc.getStatus())) {
            throw new IllegalStateException(
                    "Challan must be SENT before receiving the assembly — current status is " + dc.getStatus());
        }

        // 1. batch for the returned assembly → QC queue
        StockInBatch batch = new StockInBatch();
        batch.setBatchRef(generateAssemblyBatchRef());
        String invoice = trimOrNull(req.getInvoiceNo());
        batch.setInvoiceNo(invoice != null ? invoice : dc.getDcNumber());
        if (dc.getSupplierId() != null) {
            supplierRepository.findById(dc.getSupplierId()).ifPresent(s -> {
                batch.setSupplier(s);
                batch.setSupplierName(s.getSupplierName());
            });
        }
        if (batch.getSupplierName() == null) batch.setSupplierName(dc.getSupplierName());
        batch.setReceivedDate(req.getReceivedDate() != null ? req.getReceivedDate() : LocalDate.now());
        batch.setItemCount(0);
        batch.setTotalQty(BigDecimal.ZERO);
        batch.setQcStatus("PENDING_QC");
        batch.setCreatedBy(currentUser);
        StockInBatch savedBatch = stockInBatchRepository.save(batch);

        // 2. optional: stock the finished assembly product(s) IN under the batch
        int count = 0;
        BigDecimal qtySum = BigDecimal.ZERO;
        if (req.getAssemblyItems() != null) {
            for (AssemblyReceivedRequest.AssemblyItem ai : req.getAssemblyItems()) {
                if (ai.getProductId() == null || ai.getQuantity() == null
                        || ai.getQuantity().compareTo(BigDecimal.ZERO) <= 0) continue;

                Lot lot = lotService.createLot(
                        ai.getProductId(), dc.getSupplierId(), ai.getQuantity(),
                        ai.getUnitPrice() != null ? ai.getUnitPrice() : BigDecimal.ZERO,
                        savedBatch.getReceivedDate(), null, null, currentUser);
                lot.setStockInBatch(savedBatch);
                lotRepository.save(lot);

                Product p = productService.getProductById(ai.getProductId());
                StockMovement m = new StockMovement();
                m.setLot(lot);
                m.setProduct(p);
                m.setMovementType(StockMovement.MovementType.IN);
                m.setTransactionType(StockMovement.TransactionType.Purchase);
                m.setQuantity(ai.getQuantity());
                m.setToRack(lot.getRack());
                m.setToBox(lot.getBox());
                m.setReferenceNumber(savedBatch.getInvoiceNo());
                m.setNotes("Assembly received against " + dc.getDcNumber());
                m.setCreatedBy(currentUser);
                movementRepository.save(m);

                count++;
                qtySum = qtySum.add(ai.getQuantity());
            }
        }
        savedBatch.setItemCount(count);
        savedBatch.setTotalQty(qtySum);
        stockInBatchRepository.save(savedBatch);

        // 3. flip the DC
        dc.setStatus("ASSEMBLY_RECEIVED");
        dc.setAssemblyReceivedAt(LocalDateTime.now());
        dc.setAssemblyBatchId(savedBatch.getId());
        dc.setAssemblyBatchRef(savedBatch.getBatchRef());
        if (trimOrNull(req.getRemarks()) != null) {
            dc.setRemarks(dc.getRemarks() != null
                    ? dc.getRemarks() + " | " + req.getRemarks().trim()
                    : req.getRemarks().trim());
        }
        dcRepository.save(dc);

        addEvent(dc.getId(), "ASSEMBLY_RECEIVED", "Assembly received",
                "Batch " + savedBatch.getBatchRef() + " created ("
                        + count + " item(s), qty " + plain(qtySum) + ") → QC queue");

        try {
            qcAlertService.alertNewBatch(savedBatch.getId(), savedBatch.getBatchRef(),
                    Math.max(count, 1), "ASSEMBLY");
        } catch (Exception e) {
            log.warn("Non-fatal: QC alert for assembly batch {} failed: {}",
                    savedBatch.getBatchRef(), e.getMessage());
        }

        log.info("DC {} → ASSEMBLY_RECEIVED. batch={}, items={}, qty={}",
                dc.getDcNumber(), savedBatch.getBatchRef(), count, plain(qtySum));

        return toResponse(dcRepository.findByIdWithItems(id).orElse(dc), true);
    }

    // ─────────────────────────────────────────────────────────────
    // CLOSE
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public DeliveryChallanResponse close(Long id, String remarks) {
        DeliveryChallan dc = get(id);
        if (!"ASSEMBLY_RECEIVED".equals(dc.getStatus())) {
            throw new IllegalStateException(
                    "Assembly must be received before closing — current status is " + dc.getStatus());
        }
        dc.setStatus("CLOSED");
        dc.setClosedAt(LocalDateTime.now());
        if (trimOrNull(remarks) != null) {
            dc.setRemarks(dc.getRemarks() != null
                    ? dc.getRemarks() + " | " + remarks.trim() : remarks.trim());
        }
        dcRepository.save(dc);
        addEvent(id, "CLOSED", "Challan closed", "Job work cycle completed");
        return toResponse(dcRepository.findByIdWithItems(id).orElse(dc), true);
    }

    // ─────────────────────────────────────────────────────────────
    // READS
    // ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DeliveryChallanResponse> list(String status) {
        List<DeliveryChallan> all =
                (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status))
                        ? dcRepository.findAllByOrderByCreatedAtDesc()
                        : dcRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase());
        return all.stream().map(dc -> toResponse(dc, false)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DeliveryChallanResponse detail(Long id) {
        DeliveryChallan dc = dcRepository.findByIdWithItems(id)
                .orElseThrow(() -> new EntityNotFoundException("Delivery Challan not found: " + id));
        return toResponse(dc, true);
    }

    @Transactional(readOnly = true)
    public List<DeliveryChallanEvent> timeline(Long dcId) {
        return eventRepository.findByDcIdOrderByHappenedAtAsc(dcId);
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────

    private DeliveryChallan get(Long id) {
        return dcRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Delivery Challan not found: " + id));
    }

    /** Same FIFO pattern as StockService.stockOut, but TransactionType.JobWork. */
    private void deductFifo(Product product, BigDecimal quantity,
                            String dcNumber, String groupId, User currentUser) {
        List<Lot> lots = lotService.getActiveLotsByProduct(product.getProductId());
        BigDecimal available = lots.stream()
                .map(Lot::getRemainingQuantity).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (available.compareTo(quantity) < 0) {
            throw new InsufficientStockException("Insufficient stock for " + product.getPartNumber()
                    + ". Required: " + plain(quantity) + ", Available: " + plain(available));
        }

        BigDecimal remaining = quantity;
        for (Lot lot : lots) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;

            BigDecimal deduct = lot.getRemainingQuantity().min(remaining);
            lotService.updateLotQuantity(lot.getLotId(), deduct.negate());

            List<CurrentStock> rows = currentStockRepository.findByLotLotId(lot.getLotId());
            for (CurrentStock cs : rows) {
                BigDecimal newQty = cs.getAvailableQuantity().subtract(deduct);
                if (newQty.compareTo(BigDecimal.ZERO) <= 0) {
                    currentStockRepository.delete(cs);
                } else {
                    cs.setAvailableQuantity(newQty);
                    cs.setLastMovementDate(LocalDateTime.now());
                    currentStockRepository.save(cs);
                }
            }

            StockMovement m = new StockMovement();
            m.setLot(lot);
            m.setProduct(product);
            m.setMovementType(StockMovement.MovementType.OUT);
            m.setTransactionType(StockMovement.TransactionType.JobWork); // ← add JobWork to the enum
            m.setQuantity(deduct);
            m.setFromRack(lot.getRack());
            m.setFromBox(lot.getBox());
            m.setReferenceNumber(dcNumber);
            m.setNotes("Components sent for job work via " + dcNumber);
            m.setCreatedBy(currentUser);
            m.setTransactionGroupId(groupId);
            movementRepository.save(m);

            remaining = remaining.subtract(deduct);
        }
    }

    private void addEvent(Long dcId, String type, String title, String detail) {
        DeliveryChallanEvent e = new DeliveryChallanEvent();
        e.setDcId(dcId);
        e.setEventType(type);
        e.setTitle(title);
        e.setDetail(detail);
        e.setHappenedAt(LocalDateTime.now());
        eventRepository.save(e);
    }

    private String generateDcNumber() {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long seq = dcRepository.countByDcNumberStartingWith("DC-" + date) + 1;
        String candidate = String.format("DC-%s-%03d", date, seq);
        while (dcRepository.existsByDcNumber(candidate)) {
            seq++;
            candidate = String.format("DC-%s-%03d", date, seq);
        }
        return candidate;
    }

    private String generateAssemblyBatchRef() {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long ms = System.currentTimeMillis() % 1000;
        return "ASM-" + date + "-" + String.format("%03d", ms);
    }

    private DeliveryChallanResponse toResponse(DeliveryChallan dc, boolean withItems) {
        DeliveryChallanResponse r = new DeliveryChallanResponse();
        r.setId(dc.getId());
        r.setDcNumber(dc.getDcNumber());
        r.setSupplierId(dc.getSupplierId());
        r.setSupplierName(dc.getSupplierName());
        r.setSupplierAddress(dc.getSupplierAddress());
        r.setSupplierGstin(dc.getSupplierGstin());
        r.setDcDate(dc.getDcDate());
        r.setStatus(dc.getStatus());
        r.setPurpose(dc.getPurpose());
        r.setRemarks(dc.getRemarks());
        r.setTxnGroupId(dc.getTxnGroupId());
        r.setAssemblyBatchId(dc.getAssemblyBatchId());
        r.setAssemblyBatchRef(dc.getAssemblyBatchRef());
        r.setItemCount(dc.getItemCount());
        r.setTotalQty(dc.getTotalQty());
        r.setSentAt(dc.getSentAt());
        r.setAssemblyReceivedAt(dc.getAssemblyReceivedAt());
        r.setClosedAt(dc.getClosedAt());
        r.setCreatedByName(dc.getCreatedByName());
        r.setCreatedAt(dc.getCreatedAt());
        if (withItems && dc.getItems() != null) {
            r.setItems(dc.getItems().stream().map(i -> {
                DeliveryChallanResponse.ItemDto d = new DeliveryChallanResponse.ItemDto();
                d.setId(i.getId());
                d.setProductId(i.getProductId());
                d.setPartNumber(i.getPartNumber());
                d.setDescription(i.getDescription());
                d.setCategoryName(i.getCategoryName());
                d.setQty(i.getQty());
                d.setRate(i.getRate());
                d.setRemarks(i.getRemarks());
                return d;
            }).collect(Collectors.toList()));
        }
        return r;
    }

    private static String trimOrNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private static String plain(BigDecimal b) {
        if (b == null) return "0";
        return b.stripTrailingZeros().toPlainString();
    }
}
