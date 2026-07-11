import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Database Schema', () => {
  it('should have a valid schema.sql file', () => {
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    expect(fs.existsSync(schemaPath)).toBe(true);
    
    const content = fs.readFileSync(schemaPath, 'utf-8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS');
    expect(content).toContain('students');
    expect(content).toContain('departments');
    expect(content).toContain('courses');
    expect(content).toContain('users');
  });
});
