package com.company.inventory.service;

import com.company.inventory.entity.Box;
import com.company.inventory.entity.Rack;
import com.company.inventory.entity.User;
import com.company.inventory.exception.DuplicateResourceException;
import com.company.inventory.exception.ResourceNotFoundException;
import com.company.inventory.repository.BoxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BoxService {

    private final BoxRepository boxRepository;
    private final RackService rackService;

    @Transactional(readOnly = true)
    public List<Box> getAllBoxes() {
        return boxRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Box> getActiveBoxes() {
        return boxRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public List<Box> getBoxesByRack(Long rackId) {
        return boxRepository.findByRackRackId(rackId);
    }

    @Transactional(readOnly = true)
    public Box getBoxById(Long id) {
        return boxRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Box not found with id: " + id));
    }

    @Transactional
    public Box createBox(Long rackId, String boxNumber, String boxLabel, User currentUser) {
        Rack rack = rackService.getRackById(rackId);

        if (boxRepository.existsByRackRackIdAndBoxNumber(rackId, boxNumber)) {
            throw new DuplicateResourceException("Box number already exists in this rack: " + boxNumber);
        }

        Box box = new Box();
        box.setRack(rack);
        box.setBoxNumber(boxNumber);
        box.setBoxLabel(boxLabel);
        box.setIsActive(true);
        box.setCreatedBy(currentUser);

        return boxRepository.save(box);
    }

    @Transactional
    public Box updateBox(Long id, String boxNumber, String boxLabel) {
        Box box = getBoxById(id);

        if (!box.getBoxNumber().equals(boxNumber) &&
            boxRepository.existsByRackRackIdAndBoxNumber(box.getRack().getRackId(), boxNumber)) {
            throw new DuplicateResourceException("Box number already exists in this rack: " + boxNumber);
        }

        box.setBoxNumber(boxNumber);
        box.setBoxLabel(boxLabel);

        return boxRepository.save(box);
    }

    @Transactional
    public void deleteBox(Long id) {
        Box box = getBoxById(id);
        box.setIsActive(false);
        boxRepository.save(box);
    }

    @Transactional
    public void initializeDefaultBoxes(User systemUser) {
        List<Rack> racks = rackService.getActiveRacks();

        for (Rack rack : racks) {
            for (int i = 1; i <= 5; i++) {
                String boxNumber = "B" + i;
                if (!boxRepository.existsByRackRackIdAndBoxNumber(rack.getRackId(), boxNumber)) {
                    createBox(rack.getRackId(), boxNumber, rack.getRackName() + " - Box " + i, systemUser);
                }
            }
        }
        System.out.println("Default boxes initialized");
    }
}