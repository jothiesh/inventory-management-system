package com.company.inventory.service;

import com.company.inventory.dto.request.BulkStockInRequest;
import com.company.inventory.dto.request.StockInBatchEditRequest;
import com.company.inventory.dto.request.StockInRequest;
import com.company.inventory.dto.request.StockOutRequest;
import com.company.inventory.dto.response.BulkStockInResponse;
import com.company.inventory.dto.response.StockInBatchEditResponse;
import com.company.inventory.dto.response.StockedProductResponse;
import com.company.inventory.entity.*;
import com.company.inventory.exception.InsufficientStockException;
import com.company.inventory.qc.entity.StockInBatch;
import com.company.inventory.qc.repository.StockInBatchRepository;
import com.company.inventory.qc.service.QcAlertService;
import com.company.inventory.qc.service.QcEmailNotificationService;
import com.company.inventory.repository.CurrentStockRepository;
import com.company.inventory.repository.LotRepository;
import com.company.inventory.repository.StockMovementRepository;
import com.company.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockService {

    private final StockMovementRepository movementRepository;
    private final CurrentStockRepository currentStockRepository;
    private final LotRepository lotRepository;
    private final LotService lotService;
    private final ProductService productService;
    private final AlertService alertService;
    private final StockInBatchRepository stockInBatchRepository;
    private final SupplierRepository supplierRepository;
    private final QcAlertService qcAlertService;
    private final QcEmailNotificationService qcEmailService;

    // types that also trigger a QC alert + email
    private static final Set<String> QC_ALERT_TYPES = Set.of("Damage", "Scrap");

    // ─────────────────────────────────────────────────────────────
    // SINGLE STOCK IN
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public Lot stockIn(StockInRequest request, User currentUser) {
        log.info("Processing single Stock IN. Product ID: {}, Qty: {}",
                request.getProductId(), request.getQuantity());

        StockInBatch batch = createStockInBatch(
                request.getSupplierId(), request.getReferenceNumber(),
                request.getPurchaseDate(), request.getQuantity(), 1, currentUser);

        Lot lot = lotService.createLot(
                request.getProductId(), request.getSupplierId(),
                request.getQuantity(), request.getPurchasePrice(),
                request.getPurchaseDate(), request.getRackId(), request.getBoxId(), currentUser);

        lot.setStockInBatch(batch);
        applyHsnGst(lot, request.getHsnCode(), request.getGstPercent(),
                request.getPurchasePrice(), request.getQuantity());
        lotRepository.save(lot);

        Product product = productService.getProductById(request.getProductId());
        StockMovement movement = new StockMovement();
        movement.setLot(lot);
        movement.setProduct(product);
        movement.setMovementType(StockMovement.MovementType.IN);
        movement.setTransactionType(StockMovement.TransactionType.Purchase);
        movement.setQuantity(request.getQuantity());
        movement.setToRack(lot.getRack());
        movement.setToBox(lot.getBox());
        movement.setReferenceNumber(request.getReferenceNumber());
        movement.setNotes(request.getNotes());
        movement.setCreatedBy(currentUser);
        movementRepository.save(movement);

        try {
            BigDecimal totalStock = lotService.getTotalStockByProduct(request.getProductId());
            alertService.createStockAddedAlert(product, request.getQuantity(), totalStock);
        } catch (Exception e) {
            log.error("Non-fatal: stock-in alert failed: {}", e.getMessage());
        }

        try {
            qcAlertService.alertNewBatch(batch.getId(), batch.getBatchRef(), 1,
                    product.getCategory() != null ? product.getCategory().getCategoryCode() : "GENERAL");
            qcEmailService.sendNewBatchEmail(batch.getBatchRef(),
                    product.getCategory() != null ? product.getCategory().getCategoryCode() : "GENERAL",
                    1, batch.getSupplierName());
        } catch (Exception e) {
            log.warn("Failed to fire QC notifications for batch {}: {}", batch.getBatchRef(), e.getMessage());
        }

        log.info("Stock IN completed for Lot: {}", lot.getLotNumber());
        return lot;
    }

    // ─────────────────────────────────────────────────────────────
    // BULK STOCK IN
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public BulkStockInResponse bulkStockIn(BulkStockInRequest request, User currentUser) {
        log.info("Processing Bulk Stock IN: {} items", request.getItems() != null ? request.getItems().size() : 0);

        List<BulkStockInResponse.BulkStockInItemResult> results = new ArrayList<>();
        int successCount = 0, failedCount = 0;

        BigDecimal compositeQty = request.getItems().stream()
                .map(BulkStockInRequest.BulkStockInItem::getQuantity)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        StockInBatch batch = createStockInBatch(null, "BULK-" + System.currentTimeMillis(),
                request.getItems().isEmpty() ? LocalDate.now() : request.getItems().get(0).getPurchaseDate(),
                compositeQty, request.getItems().size(), currentUser);

        for (BulkStockInRequest.BulkStockInItem item : request.getItems()) {
            BulkStockInResponse.BulkStockInItemResult result = new BulkStockInResponse.BulkStockInItemResult();
            result.setProductId(item.getProductId());
            result.setQuantity(item.getQuantity());
            result.setPurchasePrice(item.getPurchasePrice());
            result.setPurchaseDate(item.getPurchaseDate());

            try {
                Lot lot = lotService.createLot(item.getProductId(), item.getSupplierId(),
                        item.getQuantity(), item.getPurchasePrice(), item.getPurchaseDate(),
                        item.getRackId(), item.getBoxId(), currentUser);

                lot.setStockInBatch(batch);
                applyHsnGst(lot, item.getHsnCode(), item.getGstPercent(),
                        item.getPurchasePrice(), item.getQuantity());
                lotRepository.save(lot);

                Product product = productService.getProductById(item.getProductId());
                StockMovement movement = new StockMovement();
                movement.setLot(lot);
                movement.setProduct(product);
                movement.setMovementType(StockMovement.MovementType.IN);
                movement.setTransactionType(StockMovement.TransactionType.Purchase);
                movement.setQuantity(item.getQuantity());
                movement.setToRack(lot.getRack());
                movement.setToBox(lot.getBox());
                movement.setReferenceNumber(item.getReferenceNumber());
                movement.setNotes(item.getNotes() != null ? item.getNotes() : request.getNotes());
                movement.setCreatedBy(currentUser);
                movementRepository.save(movement);

                try {
                    BigDecimal totalStock = lotService.getTotalStockByProduct(item.getProductId());
                    alertService.createStockAddedAlert(product, item.getQuantity(), totalStock);
                } catch (Exception e) {
                    log.error("Bulk alert failure for Product {}: {}", item.getProductId(), e.getMessage());
                }

                result.setPartNumber(product.getPartNumber());
                result.setDescription(product.getDescription());
                result.setCategoryName(product.getCategory() != null ? product.getCategory().getCategoryName() : null);
                result.setTotalValue(item.getQuantity().multiply(item.getPurchasePrice()));
                result.setRackName(lot.getRack() != null ? lot.getRack().getRackName() : null);
                result.setBoxLabel(lot.getBox() != null ? lot.getBox().getBoxLabel() : null);
                result.setLotNumber(lot.getLotNumber());
                result.setSuccess(true);
                successCount++;
            } catch (Exception e) {
                log.error("Bulk item failed for Product {}: {}", item.getProductId(), e.getMessage());
                result.setSuccess(false);
                result.setErrorMessage(e.getMessage());
                failedCount++;
            }
            results.add(result);
        }

        try {
            qcAlertService.alertNewBatch(batch.getId(), batch.getBatchRef(), request.getItems().size(), "GENERAL");
            qcEmailService.sendNewBatchEmail(batch.getBatchRef(), "GENERAL",
                    request.getItems().size(), batch.getSupplierName());
        } catch (Exception e) {
            log.warn("Failed to dispatch bulk QC notifications: {}", e.getMessage());
        }

        return new BulkStockInResponse(request.getItems().size(), successCount, failedCount, results);
    }

    // ─────────────────────────────────────────────────────────────
    // GET STOCKED PRODUCTS
    // ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<StockedProductResponse> getStockedProducts() {
        List<Product> products = currentStockRepository.findProductsWithStock();

        return products.stream().map(product -> {
            BigDecimal totalStock = currentStockRepository.getTotalStockByProduct(product.getProductId());
            String status = "IN_STOCK";
            if (product.getMinStockLevel() != null &&
                    totalStock.compareTo(BigDecimal.valueOf(product.getMinStockLevel())) <= 0) {
                status = "LOW_STOCK";
            }

            StockedProductResponse resp = new StockedProductResponse(
                    product.getProductId(), product.getPartNumber(), product.getDescription(),
                    product.getPackageType(), product.getManufacturerPn(),
                    product.getCategory() != null ? product.getCategory().getCategoryName() : null,
                    product.getCategory() != null ? product.getCategory().getCategoryId() : null,
                    product.getSupplier() != null ? product.getSupplier().getSupplierName() : null,
                    product.getRack() != null ? product.getRack().getRackName() : null,
                    product.getBox() != null ? product.getBox().getBoxLabel() : null,
                    product.getUnitPrice(), totalStock, status
            );
            resp.setHsnCode(product.getHsnCode());
            resp.setGstPercent(product.getGstPercent());

            try {
                lotRepository.findTopByProductProductIdOrderByCreatedAtDesc(product.getProductId())
                        .ifPresent(lot -> resp.setLastPurchasePrice(lot.getPurchasePrice()));
            } catch (Exception e) {
                log.warn("Price lookup skipped for Product: {}", product.getProductId());
            }
            return resp;
        }).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // STOCK OUT
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public String stockOut(StockOutRequest request, User currentUser) {
        log.info("Stock OUT: Product ID={}, Qty={}, Type={}",
                request.getProductId(), request.getQuantity(), request.getTransactionType());

        Product product = productService.getProductById(request.getProductId());
        BigDecimal remainingQuantity = request.getQuantity();
        List<Lot> lots = lotService.getActiveLotsByProduct(request.getProductId());

        if (lots.isEmpty()) {
            throw new InsufficientStockException("No stock available for product: " + product.getPartNumber());
        }

        BigDecimal totalAvailable = lots.stream()
                .map(Lot::getRemainingQuantity).reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalAvailable.compareTo(request.getQuantity()) < 0) {
            throw new InsufficientStockException("Insufficient stock. Required: "
                    + request.getQuantity() + ", Available: " + totalAvailable);
        }

        // ── One group id for this entire OUT (shared across all lots it touches) ──
        String groupId = java.util.UUID.randomUUID().toString();

        // ── FIFO deduction ──
        for (Lot lot : lots) {
            if (remainingQuantity.compareTo(BigDecimal.ZERO) <= 0) break;

            BigDecimal quantityToDeduct = lot.getRemainingQuantity().min(remainingQuantity);
            log.debug("FIFO: Deducting {} from Lot ID {}", quantityToDeduct, lot.getLotId());
            lotService.updateLotQuantity(lot.getLotId(), quantityToDeduct.negate());

            List<CurrentStock> currentStocks = currentStockRepository.findByLotLotId(lot.getLotId());
            for (CurrentStock cs : currentStocks) {
                BigDecimal newQty = cs.getAvailableQuantity().subtract(quantityToDeduct);
                if (newQty.compareTo(BigDecimal.ZERO) <= 0) {
                    currentStockRepository.delete(cs);
                } else {
                    cs.setAvailableQuantity(newQty);
                    cs.setLastMovementDate(LocalDateTime.now());
                    currentStockRepository.save(cs);
                }
            }

            StockMovement movement = new StockMovement();
            movement.setLot(lot);
            movement.setProduct(product);
            movement.setMovementType(StockMovement.MovementType.OUT);
            movement.setTransactionType(StockMovement.TransactionType.valueOf(request.getTransactionType()));
            movement.setQuantity(quantityToDeduct);
            movement.setFromRack(lot.getRack());
            movement.setFromBox(lot.getBox());
            movement.setReferenceNumber(request.getReferenceNumber());
            movement.setNotes(request.getNotes());
            movement.setCreatedBy(currentUser);
            movement.setTransactionGroupId(groupId);   // ← stamp the group
            movementRepository.save(movement);

            remainingQuantity = remainingQuantity.subtract(quantityToDeduct);
        }

        BigDecimal currentStock = lotService.getTotalStockByProduct(request.getProductId());
        log.info("Stock OUT finalized. Group={}, Post-execution stock level: {}", groupId, currentStock);

        // ── Low stock alert (existing) ──
        if (product.getMinStockLevel() != null &&
                currentStock.compareTo(BigDecimal.valueOf(product.getMinStockLevel())) <= 0) {
            alertService.createLowStockAlert(product, currentStock);
        }

        // ── Stock OUT alert for Owner + Manager (all types) ──
        try {
            alertService.createStockOutAlert(
                    product,
                    request.getQuantity(),
                    request.getTransactionType(),
                    request.getReferenceNumber(),
                    currentUser.getUsername()
            );
        } catch (Exception e) {
            log.warn("Non-fatal: stock-out alert creation failed: {}", e.getMessage());
        }

        // ── QC alert + email only for Damage / Scrap ──
        if (QC_ALERT_TYPES.contains(request.getTransactionType())) {
            try {
                String severity = "Scrap".equals(request.getTransactionType()) ? "HIGH" : "MEDIUM";
                qcAlertService.createAlert(
                        "STOCK_OUT_" + request.getTransactionType().toUpperCase(),
                        severity,
                        "[" + request.getTransactionType().toUpperCase() + "] Stock OUT flagged for QC",
                        String.format("Product: %s (%s) | Qty: %s | Ref: %s | By: %s",
                                product.getPartNumber(), product.getDescription(),
                                request.getQuantity().toPlainString(),
                                request.getReferenceNumber() != null ? request.getReferenceNumber() : "—",
                                currentUser.getUsername()),
                        null, null
                );
                qcEmailService.sendStockOutAlert(
                        product.getPartNumber(), product.getDescription(),
                        request.getQuantity().toPlainString(), request.getTransactionType(),
                        request.getReferenceNumber(), currentUser.getUsername()
                );
            } catch (Exception e) {
                log.warn("Non-fatal: QC alert for stock out failed: {}", e.getMessage());
            }
        }

        return groupId;   // ← now returns the group id
    }

    // ─────────────────────────────────────────────────────────────
    // REVERSE / CANCEL / EDIT a completed Stock OUT
    // ─────────────────────────────────────────────────────────────

    /**
     * Reverse every OUT movement in a transaction group:
     *  - restores the exact quantity to each lot it took from
     *  - recreates CurrentStock rows that were deleted at zero
     *  - writes a Reversal (IN) audit movement
     *  - flags the originals as reversed so it can't run twice
     */
    @Transactional
    public void reverseStockOut(String transactionGroupId, User currentUser, String reason) {
        List<StockMovement> originals =
                movementRepository.findByTransactionGroupIdOrderByCreatedAtAsc(transactionGroupId);

        if (originals.isEmpty()) {
            throw new com.company.inventory.exception.ResourceNotFoundException(
                    "StockMovement", "transactionGroupId", transactionGroupId);
        }

        if (originals.stream().anyMatch(StockMovement::isReversed)) {
            throw new IllegalStateException("This stock-out has already been reversed.");
        }

        // ── 3-day limit: OWNER unlimited, everyone else only within 3 days ──
        boolean isOwner = currentUser.getRole() != null
                && "OWNER".equals(currentUser.getRole());
        if (!isOwner) {
            LocalDateTime issuedAt = originals.stream()
                    .map(StockMovement::getCreatedAt)
                    .min(LocalDateTime::compareTo)
                    .orElse(LocalDateTime.now());
            if (issuedAt.isBefore(LocalDateTime.now().minusDays(3))) {
                throw new IllegalStateException(
                    "This stock-out is older than 3 days and can only be reversed by the Owner.");
            }
        }

        for (StockMovement orig : originals) {
            if (orig.getMovementType() != StockMovement.MovementType.OUT) continue;

            Lot lot = orig.getLot();
            BigDecimal qty = orig.getQuantity();

            // 1. give quantity back to the exact lot (flips Depleted → Active automatically)
            lotService.updateLotQuantity(lot.getLotId(), qty);

            // 2. restore CurrentStock — find existing row or recreate the deleted one
            List<CurrentStock> rows = currentStockRepository.findByLotLotId(lot.getLotId());
            if (rows.isEmpty()) {
                CurrentStock cs = new CurrentStock();
                cs.setProduct(orig.getProduct());
                cs.setLot(lot);
                cs.setRack(orig.getFromRack());
                cs.setBox(orig.getFromBox());
                cs.setAvailableQuantity(qty);
                cs.setPurchaseDate(lot.getPurchaseDate());     // ✅ same original Stock IN date, NOT today
                cs.setPurchasePrice(lot.getPurchasePrice());   // ✅ from the lot
                cs.setLastMovementDate(LocalDateTime.now());   // only THIS uses today (cancel time)
                currentStockRepository.save(cs);
            } else {
                CurrentStock cs = rows.get(0);
                cs.setAvailableQuantity(cs.getAvailableQuantity().add(qty));
                cs.setLastMovementDate(LocalDateTime.now());
                currentStockRepository.save(cs);
            }

            // 3. audit movement (IN, type Reversal) — never delete the original
            StockMovement rev = new StockMovement();
            rev.setLot(lot);
            rev.setProduct(orig.getProduct());
            rev.setMovementType(StockMovement.MovementType.IN);
            rev.setTransactionType(StockMovement.TransactionType.Reversal);
            rev.setQuantity(qty);
            rev.setToRack(orig.getFromRack());
            rev.setToBox(orig.getFromBox());
            rev.setReferenceNumber(orig.getReferenceNumber());
            rev.setNotes("REVERSAL of " + transactionGroupId
                    + (reason != null ? " | " + reason : ""));
            rev.setCreatedBy(currentUser);
            rev.setTransactionGroupId(transactionGroupId);
            movementRepository.save(rev);

            // 4. mark original so it can't be reversed twice
            orig.setReversed(true);
            movementRepository.save(orig);
        }

        log.info("Stock OUT group {} reversed by {}", transactionGroupId, currentUser.getUsername());
    }

    /** CANCEL = pure reversal. */
    @Transactional
    public void cancelStockOut(String transactionGroupId, User currentUser, String reason) {
        reverseStockOut(transactionGroupId, currentUser, reason);
    }

    /** EDIT = full reversal, then re-issue with corrected values. Returns the NEW group id. */
    @Transactional
    public String editStockOut(String transactionGroupId, StockOutRequest newRequest, User currentUser) {
        reverseStockOut(transactionGroupId, currentUser, "Superseded by edit");
        return stockOut(newRequest, currentUser);   // re-runs FIFO with new qty/type/ref
    }

    // ─────────────────────────────────────────────────────────────
    // OTHER READS
    // ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<StockMovement> getMovementsByProduct(Long productId) {
        return movementRepository.findByProductProductIdOrderByCreatedAtDesc(productId);
    }

    @Transactional(readOnly = true)
    public List<StockMovement> getMovementsByLot(Long lotId) {
        return movementRepository.findByLotLotIdOrderByCreatedAtDesc(lotId);
    }

    @Transactional(readOnly = true)
    public BigDecimal getCurrentStock(Long productId) {
        return lotService.getTotalStockByProduct(productId);
    }

    @Transactional(readOnly = true)
    public List<StockInBatch> getBatchesByStatus(String... statuses) {
        return stockInBatchRepository.findByQcStatusInOrderByCreatedAtDesc(
                java.util.Arrays.asList(statuses));
    }

    // ─────────────────────────────────────────────────────────────
    // LOTS BY BATCH
    // ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<com.company.inventory.dto.response.LotDetailResponse> getLotsByBatchId(Long batchId) {
        List<Lot> lots = lotRepository.findByStockInBatchId(batchId);
        return lots.stream().map(lot -> {
            Product p = lot.getProduct();
            BigDecimal qty   = lot.getPurchaseQuantity()  != null ? lot.getPurchaseQuantity()  : BigDecimal.ZERO;
            BigDecimal price = lot.getPurchasePrice()     != null ? lot.getPurchasePrice()     : BigDecimal.ZERO;
            return new com.company.inventory.dto.response.LotDetailResponse(
                    lot.getLotId(), lot.getLotNumber(),
                    p != null ? p.getProductId() : null,
                    p != null ? p.getPartNumber() : null,
                    p != null ? p.getDescription() : null,
                    (p != null && p.getCategory() != null) ? p.getCategory().getCategoryName() : null,
                    qty, lot.getRemainingQuantity(), price, qty.multiply(price),
                    lot.getPurchaseDate(), lot.getHsnCode(), lot.getGstPercent(), lot.getGstAmount(),
                    lot.getRack() != null ? lot.getRack().getRackName() : null,
                    lot.getBox()  != null ? lot.getBox().getBoxLabel()  : null,
                    lot.getStatus() != null ? lot.getStatus().name() : null
            );
        }).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────

    private StockInBatch createStockInBatch(Long supplierId, String invoiceNo,
                                            LocalDate receivedDate, BigDecimal totalQty,
                                            int itemCount, User currentUser) {
        StockInBatch batch = new StockInBatch();
        batch.setBatchRef(generateBatchRef());
        batch.setInvoiceNo(invoiceNo);
        if (supplierId != null) {
            supplierRepository.findById(supplierId).ifPresent(s -> {
                batch.setSupplier(s);
                batch.setSupplierName(s.getSupplierName());
            });
        }
        batch.setReceivedDate(receivedDate != null ? receivedDate : LocalDate.now());
        batch.setTotalQty(totalQty != null ? totalQty : BigDecimal.ZERO);
        batch.setItemCount(itemCount);
        batch.setQcStatus("PENDING_QC");
        batch.setCreatedBy(currentUser);
        return stockInBatchRepository.save(batch);
    }

    private String generateBatchRef() {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long ms = System.currentTimeMillis() % 1000;
        return "SIB-" + date + "-" + String.format("%03d", ms);
    }

    private void applyHsnGst(Lot lot, String hsnCode, BigDecimal gstPercent,
                              BigDecimal purchasePrice, BigDecimal quantity) {
        if (hsnCode != null && !hsnCode.isBlank()) lot.setHsnCode(hsnCode);
        if (gstPercent != null && gstPercent.compareTo(BigDecimal.ZERO) > 0) {
            lot.setGstPercent(gstPercent);
            BigDecimal gstAmount = purchasePrice.multiply(quantity)
                    .multiply(gstPercent)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            lot.setGstAmount(gstAmount);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // EDIT PENDING BATCH
    // ─────────────────────────────────────────────────────────────

    /**
     * Patch-edit a StockInBatch that is still PENDING_QC.
     *  - Only PENDING_QC batches may be edited.
     *  - Only non-null fields in the request are applied.
     *  - Changing supplierId updates both the FK and the denormalized supplierName.
     */
    @Transactional
    public StockInBatchEditResponse editPendingBatch(Long batchId,
                                                      StockInBatchEditRequest request) {

        StockInBatch batch = stockInBatchRepository.findById(batchId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                        "Batch not found: " + batchId));

        // ── Guard: only PENDING_QC may be edited ──
        if (!"PENDING_QC".equals(batch.getQcStatus())) {
            throw new IllegalStateException(
                    "Batch " + batch.getBatchRef() + " cannot be edited — status is " + batch.getQcStatus());
        }

        // ── Apply patch fields ──
        if (request.getInvoiceNo() != null) {
            batch.setInvoiceNo(request.getInvoiceNo().isBlank() ? null : request.getInvoiceNo().trim());
        }

        if (request.getReceivedDate() != null) {
            batch.setReceivedDate(request.getReceivedDate());
        }

        if (request.getNotes() != null) {
            batch.setNotes(request.getNotes().isBlank() ? null : request.getNotes().trim());
        }

        // ── Supplier change (0 = clear, null = leave unchanged) ──
        if (request.getSupplierId() != null) {
            if (request.getSupplierId() == 0L) {
                batch.setSupplier(null);
                batch.setSupplierName(null);
            } else {
                supplierRepository.findById(request.getSupplierId()).ifPresentOrElse(
                        supplier -> {
                            batch.setSupplier(supplier);
                            batch.setSupplierName(supplier.getSupplierName());
                        },
                        () -> { throw new IllegalArgumentException(
                                "Supplier not found: " + request.getSupplierId()); }
                );
            }
        }

        StockInBatch saved = stockInBatchRepository.save(batch);
        log.info("Batch {} updated — invoice={}, supplier={}, date={}",
                saved.getBatchRef(), saved.getInvoiceNo(),
                saved.getSupplierName(), saved.getReceivedDate());

        return new StockInBatchEditResponse(
                saved.getId(),
                saved.getBatchRef(),
                saved.getInvoiceNo(),
                saved.getSupplier() != null ? saved.getSupplier().getSupplierId() : null,
                saved.getSupplierName(),
                saved.getReceivedDate(),
                saved.getTotalQty(),
                saved.getItemCount(),
                saved.getQcStatus(),
                saved.getNotes(),
                saved.getUpdatedAt()
        );
    }
}