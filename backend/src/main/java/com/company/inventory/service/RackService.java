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
        return rackRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Rack> getActiveRacks() {
        return rackRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public Rack getRackById(Long id) {
        return rackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rack not found with id: " + id));
    }

    // AUTO-GENERATE: scans all racks (incl. soft-deleted, since rack_number is
    // globally unique) for pattern R<n>, returns R<max+1>.
    private String generateNextRackNumber() {
        int max = 0;
        for (Rack r : rackRepository.findAll()) {
            String num = r.getRackNumber();
            if (num != null && num.matches("R\\d+")) {
                max = Math.max(max, Integer.parseInt(num.substring(1)));
            }
        }
        return "R" + (max + 1);
    }

    @Transactional
    public Rack createRack(String rackNumber, String rackName, String location, Integer capacity, User currentUser) {
        // CHANGED: rackNumber is now optional — auto-generated when blank
        if (rackNumber == null || rackNumber.isBlank()) {
            rackNumber = generateNextRackNumber();
            log.info("Auto-generated rack number: {}", rackNumber);
        } else if (rackRepository.existsByRackNumber(rackNumber)) {
            throw new DuplicateResourceException("Rack number already exists: " + rackNumber);
        }

        Rack rack = new Rack();
        rack.setRackNumber(rackNumber);
        rack.setRackName(rackName);
        rack.setLocation(location);
        rack.setCapacity(capacity);
        rack.setIsActive(true);
        rack.setCreatedBy(currentUser);

        return rackRepository.save(rack);
    }

    @Transactional
    public Rack updateRack(Long id, String rackNumber, String rackName, String location, Integer capacity) {
        Rack rack = getRackById(id);

        // CHANGED: blank rackNumber on update = keep existing number
        if (rackNumber == null || rackNumber.isBlank()) {
            rackNumber = rack.getRackNumber();
        }

        if (!rack.getRackNumber().equals(rackNumber) && rackRepository.existsByRackNumber(rackNumber)) {
            throw new DuplicateResourceException("Rack number already exists: " + rackNumber);
        }

        rack.setRackNumber(rackNumber);
        rack.setRackName(rackName);
        rack.setLocation(location);
        rack.setCapacity(capacity);

        return rackRepository.save(rack);
    }

    @Transactional
    public void deleteRack(Long id) {
        Rack rack = getRackById(id);
        rack.setIsActive(false);
        rackRepository.save(rack);
    }

    @Transactional
    public void initializeDefaultRacks(User systemUser) {
        String[][] defaultRacks = {
            {"R1", "Components Rack", "Zone A", "100"},
            {"R2", "PCBA Rack", "Zone B", "50"},
            {"R3", "Modules Rack", "Zone C", "75"},
            {"R4", "Finished Products Rack", "Zone D", "60"}
        };

        for (String[] rackData : defaultRacks) {
            if (!rackRepository.existsByRackNumber(rackData[0])) {
                createRack(rackData[0], rackData[1], rackData[2], Integer.parseInt(rackData[3]), systemUser);
            }
        }
    }
}