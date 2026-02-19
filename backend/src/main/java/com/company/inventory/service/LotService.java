package com.company.inventory.service;

import com.company.inventory.entity.*;
import com.company.inventory.exception.ResourceNotFoundException;
import com.company.inventory.repository.LotRepository;
import com.company.inventory.util.LotNumberGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LotService {

    private final LotRepository lotRepository;
    private final ProductService productService;
    private final SupplierService supplierService;
    private final RackService rackService;
    private final BoxService boxService;
    private final PriceDifferenceService priceDifferenceService;

    @Transactional(readOnly = true)
    public Lot getLotById(Long id) {
        return lotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lot", "id", id));
    }

    @Transactional(readOnly = true)
    public List<Lot> getAllLots() {
        return lotRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Lot> getLotsByProduct(Long productId) {
        return lotRepository.findByProductProductId(productId);
    }

    /**
     * ADDED: Get only active lots for a product (with remaining quantity > 0)
     * Used for displaying current stock
     */
    @Transactional(readOnly = true)
    public List<Lot> getActiveLotsByProduct(Long productId) {
        return lotRepository.findByProductProductIdAndStatusOrderByPurchaseDateAsc(
                productId, 
                Lot.LotStatus.Active
        );
    }

    /**
     * Get active lots for FIFO processing (only with remaining quantity > 0)
     */
    @Transactional(readOnly = true)
    public List<Lot> getActiveLotsByProductForFIFO(Long productId) {
        return lotRepository.findActiveLotsByProductForFIFO(productId);
    }

    @Transactional
    public Lot createLot(
            Long productId,
            Long supplierId,
            BigDecimal quantity,
            BigDecimal purchasePrice,
            LocalDate purchaseDate,
            Long rackId,
            Long boxId,
            User currentUser
    ) {
        // Validate entities exist
        Product product = productService.getProductById(productId);
        Supplier supplier = supplierId != null ? supplierService.getSupplierById(supplierId) : null;
        Rack rack = rackService.getRackById(rackId);
        Box box = boxService.getBoxById(boxId);

        // Generate unique lot number
        String lotNumber = generateUniqueLotNumber();

        // Check for price difference using PriceDifferenceService
        priceDifferenceService.checkAndAlertPriceDifference(product, purchasePrice);

        // Create lot
        Lot lot = new Lot();
        lot.setLotNumber(lotNumber);
        lot.setProduct(product);
        lot.setSupplier(supplier);
        lot.setPurchaseQuantity(quantity);
        lot.setPurchasePrice(purchasePrice);
        lot.setPurchaseDate(purchaseDate);
        lot.setRack(rack);
        lot.setBox(box);
        lot.setRemainingQuantity(quantity);
        lot.setStatus(Lot.LotStatus.Active);
        lot.setCreatedBy(currentUser);

        return lotRepository.save(lot);
    }

    /**
     * Generate unique lot number with retry logic
     */
    private String generateUniqueLotNumber() {
        String lotNumber;
        int attempts = 0;
        int maxAttempts = 10;
        
        do {
            lotNumber = LotNumberGenerator.generate();
            attempts++;
            
            if (attempts >= maxAttempts) {
                throw new RuntimeException("Failed to generate unique lot number after " + maxAttempts + " attempts");
            }
        } while (lotRepository.existsByLotNumber(lotNumber));
        
        return lotNumber;
    }

    @Transactional
    public void updateLotQuantity(Long lotId, BigDecimal quantityChange) {
        Lot lot = getLotById(lotId);
        BigDecimal newQuantity = lot.getRemainingQuantity().add(quantityChange);

        if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Insufficient quantity in lot");
        }

        lot.setRemainingQuantity(newQuantity);

        // Update status based on remaining quantity
        if (newQuantity.compareTo(BigDecimal.ZERO) == 0) {
            lot.setStatus(Lot.LotStatus.Depleted);
        } else {
            lot.setStatus(Lot.LotStatus.Active);
        }

        lotRepository.save(lot);
    }

    /**
     * Deduct quantity from lot (for FIFO)
     */
    @Transactional
    public void deductQuantity(Long lotId, BigDecimal quantity) {
        Lot lot = getLotById(lotId);
        
        BigDecimal remaining = lot.getRemainingQuantity();
        if (remaining.compareTo(quantity) < 0) {
            throw new IllegalArgumentException(
                String.format("Insufficient quantity in lot %s. Available: %s, Requested: %s",
                    lot.getLotNumber(), remaining, quantity)
            );
        }

        lot.setRemainingQuantity(remaining.subtract(quantity));

        // Mark as depleted if quantity reaches zero
        if (lot.getRemainingQuantity().compareTo(BigDecimal.ZERO) == 0) {
            lot.setStatus(Lot.LotStatus.Depleted);
        }

        lotRepository.save(lot);
    }

    /**
     * Get total stock for a product from all active lots
     */
    @Transactional(readOnly = true)
    public BigDecimal getTotalStockByProduct(Long productId) {
        return lotRepository.getTotalStockByProduct(productId);
    }

    /**
     * Get lots by supplier
     */
    @Transactional(readOnly = true)
    public List<Lot> getLotsBySupplier(Long supplierId) {
        return lotRepository.findBySupplierSupplierId(supplierId);
    }

    /**
     * Get lots by rack
     */
    @Transactional(readOnly = true)
    public List<Lot> getLotsByRack(Long rackId) {
        return lotRepository.findByRackRackId(rackId);
    }

    /**
     * Get lots by box
     */
    @Transactional(readOnly = true)
    public List<Lot> getLotsByBox(Long boxId) {
        return lotRepository.findByBoxBoxId(boxId);
    }

    /**
     * Delete lot (admin only)
     */
    @Transactional
    public void deleteLot(Long id) {
        Lot lot = getLotById(id);
        
        // Check if lot has been used
        if (lot.getRemainingQuantity().compareTo(lot.getPurchaseQuantity()) < 0) {
            throw new IllegalStateException("Cannot delete lot that has been partially used");
        }
        
        lotRepository.delete(lot);
    }
}