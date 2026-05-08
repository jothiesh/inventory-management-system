package com.company.inventory.repository;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.company.inventory.entity.PurchaseOrder;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    Optional<PurchaseOrder> findByPoCode(String poCode);

    List<PurchaseOrder> findAllByOrderByCreatedAtDesc();

    // Get max sequential number for PO code generation → TT.PO-066
    @Query("SELECT COALESCE(MAX(p.id), 0) FROM PurchaseOrder p")
    Long findMaxId();
}