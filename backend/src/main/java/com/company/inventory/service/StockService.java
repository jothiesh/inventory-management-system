package com.company.inventory.service;

import com.company.inventory.dto.request.StockInRequest;
import com.company.inventory.dto.request.StockOutRequest;
import com.company.inventory.entity.*;
import com.company.inventory.exception.InsufficientStockException;
import com.company.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockService {

    private final StockMovementRepository movementRepository;
    private final LotService lotService;
    private final ProductService productService;
    private final AlertService alertService;

    @Transactional
    public Lot stockIn(StockInRequest request, User currentUser) {
        // Create lot
        Lot lot = lotService.createLot(
                request.getProductId(),
                request.getSupplierId(),
                request.getQuantity(),
                request.getPurchasePrice(),
                request.getPurchaseDate(),
                request.getRackId(),
                request.getBoxId(),
                currentUser
        );

        Product product = productService.getProductById(request.getProductId());
        
        // Create stock movement
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
        
        // ✅ CREATE ALERT FOR STOCK ADDITION
        try {
            BigDecimal totalStock = lotService.getTotalStockByProduct(request.getProductId());
            alertService.createStockAddedAlert(product, request.getQuantity(), totalStock);
            log.info("Stock IN alert created for: {}", product.getPartNumber());
        } catch (Exception e) {
            log.error("Failed to create stock IN alert: {}", e.getMessage());
        }

        return lot;
    }

    @Transactional
    public void stockOut(StockOutRequest request, User currentUser) {
        Product product = productService.getProductById(request.getProductId());
        BigDecimal remainingQuantity = request.getQuantity();

        List<Lot> lots = lotService.getActiveLotsByProduct(request.getProductId());

        if (lots.isEmpty()) {
            throw new InsufficientStockException("No stock available for product: " + product.getPartNumber() + " - " + product.getDescription());
        }

        BigDecimal totalAvailable = lots.stream()
                .map(Lot::getRemainingQuantity)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalAvailable.compareTo(request.getQuantity()) < 0) {
            throw new InsufficientStockException(
                    "Insufficient stock. Required: " + request.getQuantity() + ", Available: " + totalAvailable
            );
        }

        // Issue stock using FIFO
        for (Lot lot : lots) {
            if (remainingQuantity.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }

            BigDecimal quantityToDeduct = lot.getRemainingQuantity().min(remainingQuantity);
            lotService.updateLotQuantity(lot.getLotId(), quantityToDeduct.negate());

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

        // Check for low stock
        BigDecimal currentStock = lotService.getTotalStockByProduct(request.getProductId());
        
        if (product.getMinStockLevel() != null && 
            currentStock.compareTo(BigDecimal.valueOf(product.getMinStockLevel())) <= 0) {
            alertService.createLowStockAlert(product, currentStock);
        }
    }

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
}