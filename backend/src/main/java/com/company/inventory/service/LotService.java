package com.company.inventory.service;

import com.company.inventory.entity.*;
import com.company.inventory.exception.ResourceNotFoundException;
import com.company.inventory.repository.LotRepository;
import com.company.inventory.util.LotNumberGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LotService {

    private final LotRepository lotRepository;
    private final ProductService productService;
    private final SupplierService supplierService;
    private final RackService rackService;
    private final BoxService boxService;
    private final PriceDifferenceService priceDifferenceService;

    @Transactional(readOnly = true)
    public Lot getLotById(Long id) {
        log.debug("Querying repository layer for Lot instance matching target ID: {}", id);
        return lotRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Lot lookup failed. No entity record matches database key identifier: {}", id);
                    return new ResourceNotFoundException("Lot", "id", id);
                });
    }

    @Transactional(readOnly = true)
    public List<Lot> getAllLots() {
        log.debug("Request received to fetch all lot records from data storage rows.");
        List<Lot> lots = lotRepository.findAll();
        log.info("Fetched {} total lots from the database infrastructure.", lots.size());
        return lots;
    }

    @Transactional(readOnly = true)
    public List<Lot> getLotsByProduct(Long productId) {
        log.debug("Filtering lot registries for Product reference ID constraint: {}", productId);
        return lotRepository.findByProductProductId(productId);
    }

    @Transactional(readOnly = true)
    public List<Lot> getActiveLotsByProduct(Long productId) {
        log.debug("Querying chronological un-depleted lots matching active status for Product ID: {}", productId);
        return lotRepository.findByProductProductIdAndStatusOrderByPurchaseDateAsc(
                productId,
                Lot.LotStatus.Active
        );
    }

    @Transactional(readOnly = true)
    public List<Lot> getActiveLotsByProductForFIFO(Long productId) {
        log.debug("Fetching active lots optimized for FIFO allocation strategies matching Product ID: {}", productId);
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
        log.info("Initiating structural instantiation of new inventory Lot token for Product ID: {}, Volume Size: {}", productId, quantity);

        Product product = productService.getProductById(productId);
        
        // Null-safe conditional evaluations for relational entities
        log.trace("Resolving relational entity link pointers for nested metadata fields.");
        Supplier supplier = supplierId != null ? supplierService.getSupplierById(supplierId) : null;
        Rack rack = rackId != null ? rackService.getRackById(rackId) : null;
        Box box = boxId != null ? boxService.getBoxById(boxId) : null;

        String lotNumber = generateUniqueLotNumber();
        log.debug("Uniqueness verification loop complete. Allocated string code token: '{}'", lotNumber);

        log.trace("Passing financial transaction parameters to pricing fluctuations auditor interceptor.");
        priceDifferenceService.checkAndAlertPriceDifference(product, purchasePrice);

        Lot lot = new Lot();
        lot.setLotNumber(lotNumber);
        lot.setProduct(product);
        lot.setSupplier(supplier);
        lot.setPurchaseQuantity(quantity);
        lot.setInitialQuantity(quantity);   
        lot.setPurchasePrice(purchasePrice);
        lot.setPurchaseDate(purchaseDate);
        lot.setRack(rack);
        lot.setBox(box);
        lot.setRemainingQuantity(quantity);
        lot.setStatus(Lot.LotStatus.Active);
        lot.setCreatedBy(currentUser);

        Lot savedLot = lotRepository.save(lot);
        log.info("Inventory Lot record successfully persisted inside storage matrices. Assigned Row Key ID: {}", savedLot.getLotId());
        return savedLot;
    }

    private String generateUniqueLotNumber() {
        log.trace("Launching cryptographically secure identity verification loop sequence for alphanumeric generation.");
        String lotNumber;
        int attempts = 0;
        int maxAttempts = 10;

        do {
            lotNumber = LotNumberGenerator.generate();
            attempts++;
            if (attempts >= maxAttempts) {
                log.error("Identity sequencing fault: Collision ceiling hit. Failed to construct a distinct sequence key within {} attempts boundary limit.", maxAttempts);
                throw new RuntimeException("Failed to generate unique lot number after " + maxAttempts + " attempts");
            }
            log.trace("Identity loop trial run #{} produced code candidate: '{}'", attempts, lotNumber);
        } while (lotRepository.existsByLotNumber(lotNumber));

        return lotNumber;
    }

    @Transactional
    public void updateLotQuantity(Long lotId, BigDecimal quantityChange) {
        log.info("Applying physical inventory balance adjustment calculation onto Lot ID: {}. Mutation adjustment vector value: {}", lotId, quantityChange);
        Lot lot = getLotById(lotId);
        BigDecimal newQuantity = lot.getRemainingQuantity().add(quantityChange);

        if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
            log.error("Aborting quantity transaction update profile on Lot ID {}: Operation results in negative storage parameters. [Current: {}, Demanded Change: {}]", 
                    lotId, lot.getRemainingQuantity(), quantityChange);
            throw new IllegalArgumentException("Insufficient quantity in lot");
        }

        lot.setRemainingQuantity(newQuantity);

        if (newQuantity.compareTo(BigDecimal.ZERO) == 0) {
            log.warn("Lot balance resource completely drained. Flipping lifecycle flag to status level 'DEPLETED' on tracking target index: {}", lotId);
            lot.setStatus(Lot.LotStatus.Depleted);
        } else {
            lot.setStatus(Lot.LotStatus.Active);
        }

        lotRepository.save(lot);
        log.info("Lot ID: {} spatial storage tracking volume update committed safely. New remaining inventory balance metrics value: {}", lotId, newQuantity);
    }

    @Transactional
    public void deductQuantity(Long lotId, BigDecimal quantity) {
        log.info("Executing direct consumption deduction sequence against Lot ID: {}, Consumption volume: {}", lotId, quantity);
        Lot lot = getLotById(lotId);

        BigDecimal remaining = lot.getRemainingQuantity();
        if (remaining.compareTo(quantity) < 0) {
            log.error("Deduction canceled on Lot Number '{}'. Outflow bounds error. Available balance: {}, Requested volume subtraction: {}", 
                    lot.getLotNumber(), remaining, quantity);
            throw new IllegalArgumentException(
                String.format("Insufficient quantity in lot %s. Available: %s, Requested: %s",
                    lot.getLotNumber(), remaining, quantity)
            );
        }

        lot.setRemainingQuantity(remaining.subtract(quantity));

        if (lot.getRemainingQuantity().compareTo(BigDecimal.ZERO) == 0) {
            log.warn("Deduction operation brought Lot '{}' to a clean zero value. Status updated to 'DEPLETED'.", lot.getLotNumber());
            lot.setStatus(Lot.LotStatus.Depleted);
        }

        lotRepository.save(lot);
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalStockByProduct(Long productId) {
        log.debug("Calculating consolidated physical balance sums from all linked active subline lots matching Product key tracking ID: {}", productId);
        return lotRepository.getTotalStockByProduct(productId);
    }

    @Transactional(readOnly = true)
    public List<Lot> getLotsBySupplier(Long supplierId) {
        return lotRepository.findBySupplierSupplierId(supplierId);
    }

    @Transactional(readOnly = true)
    public List<Lot> getLotsByRack(Long rackId) {
        return lotRepository.findByRackRackId(rackId);
    }

    @Transactional(readOnly = true)
    public List<Lot> getLotsByBox(Long boxId) {
        return lotRepository.findByBoxBoxId(boxId);
    }

    @Transactional
    public void deleteLot(Long id) {
        log.warn("Triggering physical delete routine sequence against baseline inventory data tracker node identifier matching target ID: {}", id);
        Lot lot = getLotById(id);

        if (lot.getRemainingQuantity().compareTo(lot.getPurchaseQuantity()) < 0) {
            log.error("Lifecycle erasure rejected on tracking node ID {}: Lot contains outstanding transactional movement links and has been partially used.", id);
            throw new IllegalStateException("Cannot delete lot that has been partially used");
        }

        lotRepository.delete(lot);
        log.info("Lot structural entity completely purged from master schemas tracking matrix cells space. Original tracking string reference code was: '{}'", lot.getLotNumber());
    }
}