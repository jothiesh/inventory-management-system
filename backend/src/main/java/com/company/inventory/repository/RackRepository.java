package com.company.inventory.repository;

import com.company.inventory.entity.Rack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RackRepository extends JpaRepository<Rack, Long> {
    List<Rack> findByIsActiveTrue();
    Optional<Rack> findByRackNumber(String rackNumber);
    Boolean existsByRackNumber(String rackNumber);
}