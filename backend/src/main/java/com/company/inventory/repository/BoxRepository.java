package com.company.inventory.repository;

import com.company.inventory.entity.Box;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoxRepository extends JpaRepository<Box, Long> {
    List<Box> findByRackRackId(Long rackId);
    List<Box> findByIsActiveTrue();
    Boolean existsByRackRackIdAndBoxNumber(Long rackId, String boxNumber);
}