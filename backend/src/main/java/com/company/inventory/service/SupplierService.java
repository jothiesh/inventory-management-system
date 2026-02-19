package com.company.inventory.service;

import com.company.inventory.entity.Supplier;
import com.company.inventory.entity.User;
import com.company.inventory.exception.DuplicateResourceException;
import com.company.inventory.exception.ResourceNotFoundException;
import com.company.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;

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
            String supplierName,
            String supplierCode,
            String contactPerson,
            String phone,
            String email,
            String address,
            User currentUser
    ) {
        if (supplierRepository.existsBySupplierName(supplierName)) {
            throw new DuplicateResourceException("Supplier name already exists: " + supplierName);
        }

        if (supplierCode != null && supplierRepository.existsBySupplierCode(supplierCode)) {
            throw new DuplicateResourceException("Supplier code already exists: " + supplierCode);
        }

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
            Long id,
            String supplierName,
            String supplierCode,
            String contactPerson,
            String phone,
            String email,
            String address
    ) {
        Supplier supplier = getSupplierById(id);

        if (!supplier.getSupplierName().equals(supplierName) &&
            supplierRepository.existsBySupplierName(supplierName)) {
            throw new DuplicateResourceException("Supplier name already exists: " + supplierName);
        }

        if (supplierCode != null && !supplierCode.equals(supplier.getSupplierCode()) &&
            supplierRepository.existsBySupplierCode(supplierCode)) {
            throw new DuplicateResourceException("Supplier code already exists: " + supplierCode);
        }

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
}