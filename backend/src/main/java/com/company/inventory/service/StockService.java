package com.company.inventory.service;

import com.company.inventory.dto.request.BulkStockInRequest;
import com.company.inventory.dto.request.StockInRequest;
import com.company.inventory.dto.request.StockOutRequest;
import com.company.inventory.dto.response.BulkStockInResponse;
import com.company.inventory.dto.response.StockedProductResponse;
import com.company.inventory.entity.*;
import com.company.inventory.exception.InsufficientStockException;
import com.company.inventory.repository.CurrentStockRepository;
import com.company.inventory.repository.LotRepository;
import com.company.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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

    // ─────────────────────────────────────────────────────────────
    // SINGLE STOCK IN
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public Lot stockIn(StockInRequest request, User currentUser) {
        Lot lot = lotService.createLot(
                request.getProductId(), request.getSupplierId(),
                request.getQuantity(), request.getPurchasePrice(),
                request.getPurchaseDate(), request.getRackId(),
                request.getBoxId(), currentUser
        );

        // ── Save HSN/GST on lot ───────────────────────────────────
        applyHsnGst(lot, request.getHsnCode(), request.getGstPercent(),
                request.getPurchasePrice(), request.getQuantity());
        lotRepository.save(lot);
        // ─────────────────────────────────────────────────────────

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

        CurrentStock currentStock = new CurrentStock();
        currentStock.setProduct(product);
        currentStock.setLot(lot);
        currentStock.setRack(lot.getRack());
        currentStock.setBox(lot.getBox());
        currentStock.setAvailableQuantity(request.getQuantity());
        currentStock.setPurchasePrice(request.getPurchasePrice());
        currentStock.setPurchaseDate(request.getPurchaseDate());
        currentStock.setLastMovementDate(LocalDateTime.now());
        currentStockRepository.save(currentStock);

        try {
            BigDecimal totalStock = lotService.getTotalStockByProduct(request.getProductId());
            alertService.createStockAddedAlert(product, request.getQuantity(), totalStock);
        } catch (Exception e) {
            log.error("Failed to create stock IN alert: {}", e.getMessage());
        }

        return lot;
    }

    // ─────────────────────────────────────────────────────────────
    // BULK STOCK IN
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public BulkStockInResponse bulkStockIn(BulkStockInRequest request, User currentUser) {
        List<BulkStockInResponse.BulkStockInItemResult> results = new ArrayList<>();
        int successCount = 0, failedCount = 0;

        for (BulkStockInRequest.BulkStockInItem item : request.getItems()) {
            BulkStockInResponse.BulkStockInItemResult result = new BulkStockInResponse.BulkStockInItemResult();
            result.setProductId(item.getProductId());
            result.setQuantity(item.getQuantity());
            result.setPurchasePrice(item.getPurchasePrice());
            result.setPurchaseDate(item.getPurchaseDate());

            try {
                Lot lot = lotService.createLot(
                        item.getProductId(), item.getSupplierId(),
                        item.getQuantity(), item.getPurchasePrice(),
                        item.getPurchaseDate(), item.getRackId(),
                        item.getBoxId(), currentUser
                );

                // ── Save HSN/GST on lot ───────────────────────────
                applyHsnGst(lot, item.getHsnCode(), item.getGstPercent(),
                        item.getPurchasePrice(), item.getQuantity());
                lotRepository.save(lot);
                // ─────────────────────────────────────────────────

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

                CurrentStock currentStock = new CurrentStock();
                currentStock.setProduct(product);
                currentStock.setLot(lot);
                currentStock.setRack(lot.getRack());
                currentStock.setBox(lot.getBox());
                currentStock.setAvailableQuantity(item.getQuantity());
                currentStock.setPurchasePrice(item.getPurchasePrice());
                currentStock.setPurchaseDate(item.getPurchaseDate());
                currentStock.setLastMovementDate(LocalDateTime.now());
                currentStockRepository.save(currentStock);

                try {
                    BigDecimal totalStock = lotService.getTotalStockByProduct(item.getProductId());
                    alertService.createStockAddedAlert(product, item.getQuantity(), totalStock);
                } catch (Exception e) {
                    log.error("Alert failed for product {}: {}", item.getProductId(), e.getMessage());
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
                log.error("Bulk stock in failed for product {}: {}", item.getProductId(), e.getMessage());
                result.setSuccess(false);
                result.setErrorMessage(e.getMessage());
                failedCount++;
            }
            results.add(result);
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
                    product.getProductId(),
                    product.getPartNumber(),
                    product.getDescription(),
                    product.getPackageType(),
                    product.getManufacturerPn(),
                    product.getCategory() != null ? product.getCategory().getCategoryName() : null,
                    product.getCategory() != null ? product.getCategory().getCategoryId() : null,
                    product.getSupplier() != null ? product.getSupplier().getSupplierName() : null,
                    product.getRack() != null ? product.getRack().getRackName() : null,
                    product.getBox() != null ? product.getBox().getBoxLabel() : null,
                    product.getUnitPrice(),
                    totalStock,
                    status
            );

            // Set HSN/GST from product
            resp.setHsnCode(product.getHsnCode());
            resp.setGstPercent(product.getGstPercent());

            // Last purchase price from most recent lot
            try {
                lotRepository.findTopByProductProductIdOrderByCreatedAtDesc(product.getProductId())
                        .ifPresent(lot -> resp.setLastPurchasePrice(lot.getPurchasePrice()));
            } catch (Exception e) {
                log.warn("Could not fetch last purchase price for product {}", product.getProductId());
            }

            return resp;
        }).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // STOCK OUT
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public void stockOut(StockOutRequest request, User currentUser) {
        Product product = productService.getProductById(request.getProductId());
        BigDecimal remainingQuantity = request.getQuantity();
        List<Lot> lots = lotService.getActiveLotsByProduct(request.getProductId());

        if (lots.isEmpty()) throw new InsufficientStockException(
                "No stock available for product: " + product.getPartNumber());

        BigDecimal totalAvailable = lots.stream()
                .map(Lot::getRemainingQuantity).reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalAvailable.compareTo(request.getQuantity()) < 0)
            throw new InsufficientStockException(
                    "Insufficient stock. Required: " + request.getQuantity() +
                    ", Available: " + totalAvailable);

        for (Lot lot : lots) {
            if (remainingQuantity.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal quantityToDeduct = lot.getRemainingQuantity().min(remainingQuantity);
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
            movementRepository.save(movement);

            remainingQuantity = remainingQuantity.subtract(quantityToDeduct);
        }

        BigDecimal currentStock = lotService.getTotalStockByProduct(request.getProductId());
        if (product.getMinStockLevel() != null &&
                currentStock.compareTo(BigDecimal.valueOf(product.getMinStockLevel())) <= 0) {
            alertService.createLowStockAlert(product, currentStock);
        }
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

    // ─────────────────────────────────────────────────────────────
    // PRIVATE HELPER
    // ─────────────────────────────────────────────────────────────

    /**
     * Apply HSN code and GST% to a lot, calculating gstAmount.
     * gstAmount = purchasePrice * quantity * gstPercent / 100
     */
    private void applyHsnGst(Lot lot, String hsnCode, BigDecimal gstPercent,
                              BigDecimal purchasePrice, BigDecimal quantity) {
        if (hsnCode != null && !hsnCode.isBlank()) {
            lot.setHsnCode(hsnCode);
        }
        if (gstPercent != null && gstPercent.compareTo(BigDecimal.ZERO) > 0) {
            lot.setGstPercent(gstPercent);
            BigDecimal gstAmount = purchasePrice
                    .multiply(quantity)
                    .multiply(gstPercent)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            lot.setGstAmount(gstAmount);
        }
    }
}