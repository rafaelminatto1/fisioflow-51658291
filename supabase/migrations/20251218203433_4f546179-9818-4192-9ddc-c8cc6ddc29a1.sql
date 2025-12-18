-- Clear existing capacity configurations to avoid duplicates
DELETE FROM schedule_capacity_config;

-- Insert new capacity configurations
-- Monday to Friday (1-5): 7h-13h = 4 patients
INSERT INTO schedule_capacity_config (day_of_week, start_time, end_time, max_patients)
VALUES 
  (1, '07:00', '13:00', 4),
  (2, '07:00', '13:00', 4),
  (3, '07:00', '13:00', 4),
  (4, '07:00', '13:00', 4),
  (5, '07:00', '13:00', 4);

-- Monday to Friday (1-5): 13h-15h = 1 patient
INSERT INTO schedule_capacity_config (day_of_week, start_time, end_time, max_patients)
VALUES 
  (1, '13:00', '15:00', 1),
  (2, '13:00', '15:00', 1),
  (3, '13:00', '15:00', 1),
  (4, '13:00', '15:00', 1),
  (5, '13:00', '15:00', 1);

-- Monday to Friday (1-5): 15h-21h = 4 patients
INSERT INTO schedule_capacity_config (day_of_week, start_time, end_time, max_patients)
VALUES 
  (1, '15:00', '21:00', 4),
  (2, '15:00', '21:00', 4),
  (3, '15:00', '21:00', 4),
  (4, '15:00', '21:00', 4),
  (5, '15:00', '21:00', 4);

-- Saturday (6): 7h-13h = 3 patients
INSERT INTO schedule_capacity_config (day_of_week, start_time, end_time, max_patients)
VALUES 
  (6, '07:00', '13:00', 3);