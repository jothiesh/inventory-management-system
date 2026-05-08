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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final LotRepository lotRepository;

    // ─── Basic CRUD ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Supplier> getAllSuppliers() {
        return supplierRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Supplier> getActiveSuppliers() {
        return supplierRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public Supplier getSupplierById(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));
    }

    @Transactional
    public Supplier createSupplier(
            String supplierName, String supplierCode, String contactPerson,
            String phone, String email, String address, User currentUser
    ) {
        if (supplierRepository.existsBySupplierName(supplierName))
            throw new DuplicateResourceException("Supplier name already exists: " + supplierName);
        if (supplierCode != null && supplierRepository.existsBySupplierCode(supplierCode))
            throw new DuplicateResourceException("Supplier code already exists: " + supplierCode);

        Supplier supplier = new Supplier();
        supplier.setSupplierName(supplierName);
        supplier.setSupplierCode(supplierCode);
        supplier.setContactPerson(contactPerson);
        supplier.setPhone(phone);
        supplier.setEmail(email);
        supplier.setAddress(address);
        supplier.setIsActive(true);
        supplier.setCreatedBy(currentUser);
        return supplierRepository.save(supplier);
    }

    @Transactional
    public Supplier updateSupplier(
            Long id, String supplierName, String supplierCode,
            String contactPerson, String phone, String email, String address
    ) {
        Supplier supplier = getSupplierById(id);

        if (!supplier.getSupplierName().equals(supplierName) &&
                supplierRepository.existsBySupplierName(supplierName))
            throw new DuplicateResourceException("Supplier name already exists: " + supplierName);

        if (supplierCode != null && !supplierCode.equals(supplier.getSupplierCode()) &&
                supplierRepository.existsBySupplierCode(supplierCode))
            throw new DuplicateResourceException("Supplier code already exists: " + supplierCode);

        supplier.setSupplierName(supplierName);
        supplier.setSupplierCode(supplierCode);
        supplier.setContactPerson(contactPerson);
        supplier.setPhone(phone);
        supplier.setEmail(email);
        supplier.setAddress(address);
        return supplierRepository.save(supplier);
    }

    @Transactional
    public void deleteSupplier(Long id) {
        Supplier supplier = getSupplierById(id);
        supplier.setIsActive(false);
        supplierRepository.save(supplier);
    }

    // ─── Supplier purchase history ────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SupplierProductSummaryDto> getSupplierProductSummary(Long supplierId) {
        getSupplierById(supplierId);

        List<Lot> lots = lotRepository.findBySupplierSupplierIdWithFetch(supplierId);

        Map<Long, List<Lot>> byProduct = lots.stream()
                .collect(Collectors.groupingBy(l -> l.getProduct().getProductId()));

        return byProduct.entrySet().stream().map(entry -> {
            List<Lot> productLots = entry.getValue().stream()
                    .sorted(Comparator.comparing(Lot::getPurchaseDate).reversed())
                    .collect(Collectors.toList());

            Lot latest   = productLots.get(0);
            Lot earliest = productLots.get(productLots.size() - 1);

            BigDecimal totalQty = productLots.stream()
                    .map(Lot::getInitialQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

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
        getSupplierById(supplierId);

        List<Lot> lots = lotRepository.findBySupplierSupplierIdWithFetch(supplierId);

        return lots.stream().map(lot -> {
            SupplierPurchaseDetailDto dto = new SupplierPurchaseDetailDto();

            // Lot info
            dto.setLotId(lot.getLotId());
            dto.setLotNumber(lot.getLotNumber());
            dto.setPurchaseDate(lot.getPurchaseDate());
            dto.setQuantity(lot.getInitialQuantity());
            dto.setPurchasePrice(lot.getPurchasePrice());
            dto.setTotalValue(lot.getInitialQuantity().multiply(lot.getPurchasePrice()));
            dto.setReferenceNumber(lot.getReferenceNumber());

            // Product info
            if (lot.getProduct() != null) {
                dto.setProductId(lot.getProduct().getProductId());
                dto.setPartNumber(lot.getProduct().getPartNumber());
                dto.setDescription(lot.getProduct().getDescription());
                dto.setPackageType(lot.getProduct().getPackageType());
                dto.setCategoryName(lot.getProduct().getCategory() != null
                        ? lot.getProduct().getCategory().getCategoryName() : "Uncategorized");
            }

            // Location
            if (lot.getRack() != null) dto.setRackName(lot.getRack().getRackName());
            if (lot.getBox()  != null) dto.setBoxLabel(lot.getBox().getBoxLabel());

            // ── NEW: HSN / GST ────────────────────────────────────
            dto.setHsnCode(lot.getHsnCode());
            dto.setGstPercent(lot.getGstPercent());
            dto.setGstAmount(lot.getGstAmount());
            // ─────────────────────────────────────────────────────

            return dto;
        }).collect(Collectors.toList());
    }
}