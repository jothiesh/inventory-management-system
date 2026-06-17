package com.company.inventory.service;

import com.company.inventory.dto.response.SupplierProductSummaryDto;
import com.company.inventory.dto.response.SupplierPurchaseDetailDto;
import com.company.inventory.entity.Lot;
import com.company.inventory.entity.Supplier;
import com.company.inventory.entity.User;
import com.company.inventory.exception.DuplicateResourceException;
import com.company.inventory.exception.ResourceNotFoundException;
import com.company.inventory.repository.LotRepository;
import com.company.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j // <-- Lombok annotation to inject the 'log' field automatically
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final LotRepository lotRepository;

    // ─── Basic CRUD ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Supplier> getAllSuppliers() {
        log.debug("Request received to fetch all suppliers from the database.");
        List<Supplier> suppliers = supplierRepository.findAll();
        log.info("Successfully fetched {} total suppliers.", suppliers.size());
        return suppliers;
    }

    @Transactional(readOnly = true)
    public List<Supplier> getActiveSuppliers() {
        log.debug("Request received to fetch all active suppliers.");
        List<Supplier> activeSuppliers = supplierRepository.findByIsActiveTrue();
        log.info("Successfully fetched {} active suppliers.", activeSuppliers.size());
        return activeSuppliers;
    }

    @Transactional(readOnly = true)
    public Supplier getSupplierById(Long id) {
        log.debug("Looking up supplier records for ID: {}", id);
        return supplierRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Supplier retrieval failed. No record matches ID: {}", id);
                    return new ResourceNotFoundException("Supplier not found with id: " + id);
                });
    }

    @Transactional
    public Supplier createSupplier(
            String supplierName, String supplierCode, String contactPerson,
            String phone, String email, String address,
            String gstnNumber,
            User currentUser
    ) {
        log.info("Initiating creation of new supplier. Name: '{}', Code: '{}', Triggered by User ID: {}", 
                supplierName, supplierCode, currentUser != null ? currentUser.getUserId() : "SYSTEM");

        if (supplierRepository.existsBySupplierName(supplierName)) {
            log.error("Supplier creation aborted: A supplier named '{}' already exists in the system.", supplierName);
            throw new DuplicateResourceException("Supplier name already exists: " + supplierName);
        }

        // ❌ REMOVED: Uniqueness validation check for supplierCode dropped to allow identical matches

        Supplier supplier = new Supplier();
        supplier.setSupplierName(supplierName);
        supplier.setSupplierCode(supplierCode != null && !supplierCode.trim().isEmpty() ? supplierCode.trim() : null);
        supplier.setContactPerson(contactPerson);
        supplier.setPhone(phone);
        supplier.setEmail(email);
        supplier.setAddress(address);
        supplier.setGstnNumber(gstnNumber != null && !gstnNumber.trim().isEmpty() ? gstnNumber.toUpperCase().trim() : null);
        supplier.setIsActive(true);
        supplier.setCreatedBy(currentUser);

        Supplier savedSupplier = supplierRepository.save(supplier);
        log.info("Supplier successfully created and persisted. Allocated Database ID: {}", savedSupplier.getSupplierId());
        return savedSupplier;
    }

    @Transactional
    public Supplier updateSupplier(
            Long id, String supplierName, String supplierCode,
            String contactPerson, String phone, String email,
            String address, String gstnNumber
    ) {
        log.info("Attempting up update profile details for Supplier ID: {}", id);
        Supplier supplier = getSupplierById(id);

        if (!supplier.getSupplierName().equals(supplierName) &&
                supplierRepository.existsBySupplierName(supplierName)) {
            log.error("Update failed for Supplier ID {}: Proposed name change to '{}' conflicts with an existing supplier record.", id, supplierName);
            throw new DuplicateResourceException("Supplier name already exists: " + supplierName);
        }

        // ❌ REMOVED: Uniqueness validation check for supplierCode dropped on record updates

        String cleanCode = supplierCode != null ? supplierCode.trim() : "";

        log.debug("Applying mutations to Supplier record ID: {}", id);
        supplier.setSupplierName(supplierName);
        supplier.setSupplierCode(cleanCode.isEmpty() ? null : cleanCode);
        supplier.setContactPerson(contactPerson);
        supplier.setPhone(phone);
        supplier.setEmail(email);
        supplier.setAddress(address);
        supplier.setGstnNumber(gstnNumber != null && !gstnNumber.trim().isEmpty() ? gstnNumber.toUpperCase().trim() : null);

        Supplier updatedSupplier = supplierRepository.save(supplier);
        log.info("Supplier details successfully modified and saved for ID: {}", id);
        return updatedSupplier;
    }

    @Transactional
    public void deleteSupplier(Long id) {
        log.info("Soft-deleting Supplier account from system. Target ID: {}", id);
        Supplier supplier = getSupplierById(id);
        
        supplier.setIsActive(false);
        supplierRepository.save(supplier);
        log.info("Supplier ID: {} status successfully updated to 'isActive = false'.", id);
    }

    // ─── Supplier purchase history ────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SupplierProductSummaryDto> getSupplierProductSummary(Long supplierId) {
        log.info("Processing compilation request for Product Summary View on Supplier ID: {}", supplierId);
        
        // Verifies supplier presence and throws exception if missing
        getSupplierById(supplierId);

        log.debug("Querying inventory lots linked to Supplier ID: {}", supplierId);
        List<Lot> lots = lotRepository.findBySupplierSupplierIdWithFetch(supplierId);
        log.debug("Discovered {} inventory lots for aggregate summary compilation.", lots.size());

        Map<Long, List<Lot>> byProduct = lots.stream()
                .filter(l -> l.getProduct() != null) // Safety boundary filter
                .collect(Collectors.groupingBy(l -> l.getProduct().getProductId()));

        log.debug("Grouping operation mapped lots into {} unique Product variants.", byProduct.size());

        return byProduct.entrySet().stream().map(entry -> {
            List<Lot> productLots = entry.getValue().stream()
                    .sorted(Comparator.comparing(Lot::getPurchaseDate).reversed())
                    .collect(Collectors.toList());

            Lot latest   = productLots.get(0);
            Lot earliest = productLots.get(productLots.size() - 1);

            BigDecimal totalQty = productLots.stream()
                    .map(Lot::getInitialQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            log.trace("Mapping Product Summary DTO -> Product ID: {}, Combined Lots Count: {}, Total Volume: {}", 
                    latest.getProduct().getProductId(), productLots.size(), totalQty);

            SupplierProductSummaryDto dto = new SupplierProductSummaryDto();
            dto.setProductId(latest.getProduct().getProductId());
            dto.setPartNumber(latest.getProduct().getPartNumber());
            dto.setDescription(latest.getProduct().getDescription());
            dto.setCategoryName(latest.getProduct().getCategory() != null
                    ? latest.getProduct().getCategory().getCategoryName() : "Uncategorized");
            dto.setPackageType(latest.getProduct().getPackageType());
            dto.setTotalQtyBought(totalQty);
            dto.setLastPurchasePrice(latest.getPurchasePrice());
            dto.setLastBoughtDate(latest.getPurchaseDate());
            dto.setFirstBoughtDate(earliest.getPurchaseDate());
            dto.setTotalPurchaseCount(productLots.size());
            return dto;

        }).sorted(Comparator.comparing(SupplierProductSummaryDto::getLastBoughtDate).reversed())
          .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SupplierPurchaseDetailDto> getSupplierPurchaseDetails(Long supplierId) {
        log.info("Processing compilation request for historical Ledger Details on Supplier ID: {}", supplierId);
        
        // Verifies supplier presence and throws exception if missing
        getSupplierById(supplierId);

        log.debug("Querying relationship mappings for all operational Lots linked to Supplier ID: {}", supplierId);
        List<Lot> lots = lotRepository.findBySupplierSupplierIdWithFetch(supplierId);
        log.info("Mapping and generating historical Purchase ledger for {} lots.", lots.size());

        return lots.stream().map(lot -> {
            SupplierPurchaseDetailDto dto = new SupplierPurchaseDetailDto();

            dto.setLotId(lot.getLotId());
            dto.setLotNumber(lot.getLotNumber());
            dto.setPurchaseDate(lot.getPurchaseDate());
            dto.setQuantity(lot.getInitialQuantity());
            dto.setPurchasePrice(lot.getPurchasePrice());
            
            if (lot.getInitialQuantity() != null && lot.getPurchasePrice() != null) {
                dto.setTotalValue(lot.getInitialQuantity().multiply(lot.getPurchasePrice()));
            } else {
                dto.setTotalValue(BigDecimal.ZERO);
            }
            
            dto.setReferenceNumber(lot.getReferenceNumber());

            if (lot.getProduct() != null) {
                dto.setProductId(lot.getProduct().getProductId());
                dto.setPartNumber(lot.getProduct().getPartNumber());
                dto.setDescription(lot.getProduct().getDescription());
                dto.setPackageType(lot.getProduct().getPackageType());
                dto.setCategoryName(lot.getProduct().getCategory() != null
                        ? lot.getProduct().getCategory().getCategoryName() : "Uncategorized");
            }

            if (lot.getRack() != null) dto.setRackName(lot.getRack().getRackName());
            if (lot.getBox()  != null) dto.setBoxLabel(lot.getBox().getBoxLabel());

            dto.setHsnCode(lot.getHsnCode());
            dto.setGstPercent(lot.getGstPercent());
            dto.setGstAmount(lot.getGstAmount());

            log.trace("Assembled Item Ledger Record -> Lot ID: {}, Lot Number: '{}', Total Valuation: {}", 
                    lot.getLotId(), lot.getLotNumber(), dto.getTotalValue());

            return dto;
        }).collect(Collectors.toList());
    }
}