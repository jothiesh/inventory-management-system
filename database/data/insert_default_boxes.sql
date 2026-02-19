-- Insert Default Boxes for Rack R1
INSERT INTO boxes (rack_id, box_number, box_label, created_by) VALUES
(1, 'B1', 'Small Components', 1),
(1, 'B2', 'ICs Box 1', 1),
(1, 'B3', 'ICs Box 2', 1),
(1, 'B4', 'Resistors', 1),
(1, 'B5', 'Capacitors', 1);

-- Insert Default Boxes for Rack R2
INSERT INTO boxes (rack_id, box_number, box_label, created_by) VALUES
(2, 'B1', 'GPS PCBA', 1),
(2, 'B2', 'Tracker PCBA', 1),
(2, 'B3', 'Asset Tracker PCBA', 1);

-- Insert Default Boxes for Rack R3
INSERT INTO boxes (rack_id, box_number, box_label, created_by) VALUES
(3, 'B1', 'GPS Modules', 1),
(3, 'B2', 'GSM Modules', 1),
(3, 'B3', 'WiFi Modules', 1),
(3, 'B4', 'Bluetooth Modules', 1);

-- Insert Default Boxes for Rack R4
INSERT INTO boxes (rack_id, box_number, box_label, created_by) VALUES
(4, 'B1', 'Finished GPS Devices', 1),
(4, 'B2', 'Finished Trackers', 1);