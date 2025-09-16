-- Update questions table class_level column from text to class_level enum type
ALTER TABLE questions 
ALTER COLUMN class_level TYPE class_level USING class_level::class_level;