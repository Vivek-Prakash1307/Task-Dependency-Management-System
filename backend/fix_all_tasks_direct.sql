-- Direct SQL to fix all problematic tasks
-- Run this in MySQL directly if needed

-- Fix tasks with null or invalid priority
UPDATE tasks SET priority = 3 WHERE priority IS NULL OR priority < 1 OR priority > 5;

-- Fix tasks with null or invalid estimated_hours
UPDATE tasks SET estimated_hours = 8 WHERE estimated_hours IS NULL OR estimated_hours <= 0;

-- Fix tasks with invalid status
UPDATE tasks SET status = 'pending' WHERE status NOT IN ('pending', 'in_progress', 'completed', 'blocked');

-- Show results
SELECT id, title, priority, estimated_hours, status FROM tasks ORDER BY id;