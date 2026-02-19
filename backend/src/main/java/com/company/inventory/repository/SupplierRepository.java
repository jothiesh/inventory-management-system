package com.company.inventory.repository;

import com.company.inventory.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findByIsActiveTrue();
    Optional<Supplier> findBySupplierCode(String supplierCode);
    Boolean existsBySupplierName(String supplierName);
    Boolean existsBySupplierCode(String supplierCode);
}