package com.company.inventory.service;

import com.company.inventory.entity.Rack;
import com.company.inventory.entity.User;
import com.company.inventory.exception.DuplicateResourceException;
import com.company.inventory.exception.ResourceNotFoundException;
import com.company.inventory.repository.RackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RackService {

    private final RackRepository rackRepository;

    @Transactional(readOnly = true)
    public List<Rack> getAllRacks() {
        log.debug("Querying data schema table structures to list all existing racks records.");
        return rackRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Rack> getActiveRacks() {
        log.debug("Filtering database elements mapping exclusively active physical storage structures.");
        return rackRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public Rack getRackById(Long id) {
        log.debug("Looking up target profile definitions for physical storage entity node ID: {}", id);
        return rackRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Rack resource indexing lookup fault matching specified target identification tag: {}", id);
                    return new ResourceNotFoundException("Rack not found with id: " + id);
                });
    }

    @Transactional
    public Rack createRack(String rackNumber, String rackName, String location, Integer capacity, User currentUser) {
        log.info("Attempting allocation registration execution sequence for new functional entity. Identifier: '{}', Designation: '{}'", rackNumber, rackName);

        if (rackRepository.existsByRackNumber(rackNumber)) {
            log.error("Aborting storage creation: Identification reference alphanumeric sequence code '{}' conflicts with an active row component.", rackNumber);
            throw new DuplicateResourceException("Rack number already exists: " + rackNumber);
        }

        Rack rack = new Rack();
        rack.setRackNumber(rackNumber);
        rack.setRackName(rackName);
        rack.setLocation(location);
        rack.setCapacity(capacity);
        rack.setIsActive(true);
        rack.setCreatedBy(currentUser);

        Rack savedRack = rackRepository.save(rack);
        log.info("New spatial hardware framework tracking configuration registered inside master schemas database. Auto ID assigned: {}", savedRack.getRackId());
        return savedRack;
    }

    @Transactional
    public Rack updateRack(Long id, String rackNumber, String rackName, String location, Integer capacity) {
        log.info("Processing proposed mutation data updates overlay against existing layout container target tracking reference ID: {}", id);
        Rack rack = getRackById(id);

        if (!rack.getRackNumber().equals(rackNumber) && rackRepository.existsByRackNumber(rackNumber)) {
            log.error("Aborting storage modification pipeline: Alphanumeric sequence update configuration '{}' overlaps another data item row.", rackNumber);
            throw new DuplicateResourceException("Rack number already exists: " + rackNumber);
        }

        rack.setRackNumber(rackNumber);
        rack.setRackName(rackName);
        rack.setLocation(location);
        rack.setCapacity(capacity);

        Rack updatedRack = rackRepository.save(rack);
        log.info("Properties mutation parameters updated successfully against schema indices configuration tracker node ID: {}", id);
        return updatedRack;
    }

    @Transactional
    public void deleteRack(Long id) {
        log.warn("Triggering storage soft deletion decommissioning pipeline logic operations against container profile item node ID: {}", id);
        Rack rack = getRackById(id);
        rack.setIsActive(false);
        rackRepository.save(rack);
        log.info("Soft-decommission process status update flag handled successfully on target node index context: {}. [isActive=false]", id);
    }

    @Transactional
    public void initializeDefaultRacks(User systemUser) {
        log.info("Evaluating configuration profiles layer verification: Verification checkpoint on default baseline storage racks layout matrices setup configurations.");
        String[][] defaultRacks = {
            {"R1", "Components Rack", "Zone A", "100"},
            {"R2", "PCBA Rack", "Zone B", "50"},
            {"R3", "Modules Rack", "Zone C", "75"},
            {"R4", "Finished Products Rack", "Zone D", "60"}
        };

        for (String[] rackData : defaultRacks) {
            if (!rackRepository.existsByRackNumber(rackData[0])) {
                log.info("Seeding data row allocation placeholder into database layers index configuration mapping for: '{}'", rackData[1]);
                createRack(rackData[0], rackData[1], rackData[2], Integer.parseInt(rackData[3]), systemUser);
            }
        }
        log.info("Operational hardware initialization verification complete. Seed arrays loaded neatly inside schemas execution thread paths.");
    }
}