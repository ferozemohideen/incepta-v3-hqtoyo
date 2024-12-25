/**
 * @fileoverview Unit tests for validation utility functions
 * Tests data validation with security classifications and input sanitization
 * @version 1.0.0
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'; // Version: ^29.0.0
import { validateUser, validateTechnology } from '../../src/utils/validation';
import { UserRole } from '../../src/constants/roles';
import { PatentStatus, SecurityClassification } from '../../src/interfaces/technology.interface';

/**
 * Mock data class for generating test data with different security classifications
 */
class MockData {
  validUserData: any;
  validTechnologyData: any;

  constructor() {
    this.initializeValidUserData();
    this.initializeValidTechnologyData();
  }

  private initializeValidUserData() {
    this.validUserData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.RESEARCHER,
      profile: {
        organization: 'Test University',
        title: 'Research Scientist',
        phone: '+1-555-123-4567',
        bio: 'Test researcher bio',
        interests: ['AI', 'Machine Learning'],
        avatar: 'https://example.com/avatar.jpg'
      },
      preferences: {
        emailNotifications: true,
        theme: 'light',
        language: 'en',
        timezone: 'UTC'
      },
      security: {
        mfaEnabled: true,
        lastLogin: new Date(),
        passwordChangedAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private initializeValidTechnologyData() {
    this.validTechnologyData = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Test Technology',
      description: 'A comprehensive test technology description',
      university: 'Test University',
      patentStatus: PatentStatus.GRANTED,
      trl: 5,
      domains: ['AI', 'Healthcare'],
      metadata: {
        inventors: ['John Doe', 'Jane Smith'],
        patentNumber: 'US123456789',
        filingDate: new Date(),
        keywords: ['AI', 'ML', 'Healthcare'],
        publications: [{
          title: 'Test Publication',
          authors: ['John Doe'],
          journal: 'Test Journal',
          doi: '10.1234/test',
          year: 2023,
          url: 'https://example.com/publication'
        }],
        fundingHistory: [{
          source: 'NSF',
          amount: 100000,
          grantNumber: 'NSF123',
          startDate: new Date(),
          status: 'ACTIVE'
        }]
      },
      securityLevel: SecurityClassification.CONFIDENTIAL,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  generateInvalidData(type: 'user' | 'technology', scenario: string): any {
    if (type === 'user') {
      const invalidData = { ...this.validUserData };
      switch (scenario) {
        case 'invalid_email':
          invalidData.email = 'invalid-email';
          break;
        case 'missing_required':
          delete invalidData.name;
          break;
        case 'invalid_role':
          invalidData.role = 'invalid_role';
          break;
        case 'invalid_phone':
          invalidData.profile.phone = '123';
          break;
      }
      return invalidData;
    } else {
      const invalidData = { ...this.validTechnologyData };
      switch (scenario) {
        case 'invalid_trl':
          invalidData.trl = 10;
          break;
        case 'missing_patent':
          invalidData.patentStatus = PatentStatus.GRANTED;
          delete invalidData.metadata.patentNumber;
          break;
        case 'invalid_security':
          invalidData.securityLevel = 'INVALID';
          break;
        case 'short_description':
          invalidData.description = 'Short';
          break;
      }
      return invalidData;
    }
  }
}

describe('User Validation', () => {
  let mockData: MockData;

  beforeEach(() => {
    mockData = new MockData();
  });

  test('should validate correct user data', async () => {
    const result = await validateUser(mockData.validUserData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should detect invalid email format', async () => {
    const invalidData = mockData.generateInvalidData('user', 'invalid_email');
    const result = await validateUser(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      field: 'email',
      code: 'INVALID_EMAIL'
    }));
  });

  test('should enforce required fields', async () => {
    const invalidData = mockData.generateInvalidData('user', 'missing_required');
    const result = await validateUser(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'SCHEMA_VALIDATION_ERROR'
    }));
  });

  test('should validate user role assignments', async () => {
    const invalidData = mockData.generateInvalidData('user', 'invalid_role');
    const result = await validateUser(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      field: 'role'
    }));
  });

  test('should validate phone number format', async () => {
    const invalidData = mockData.generateInvalidData('user', 'invalid_phone');
    const result = await validateUser(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      field: 'profile.phone'
    }));
  });
});

describe('Technology Validation', () => {
  let mockData: MockData;

  beforeEach(() => {
    mockData = new MockData();
  });

  test('should validate correct technology data', async () => {
    const result = await validateTechnology(mockData.validTechnologyData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should validate TRL range', async () => {
    const invalidData = mockData.generateInvalidData('technology', 'invalid_trl');
    const result = await validateTechnology(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      field: 'trl',
      code: 'INVALID_TRL'
    }));
  });

  test('should enforce patent number for granted patents', async () => {
    const invalidData = mockData.generateInvalidData('technology', 'missing_patent');
    const result = await validateTechnology(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      field: 'metadata.patentNumber',
      code: 'MISSING_PATENT_NUMBER'
    }));
  });

  test('should validate security classification', async () => {
    const invalidData = mockData.generateInvalidData('technology', 'invalid_security');
    const result = await validateTechnology(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      field: 'securityLevel'
    }));
  });

  test('should enforce minimum description length', async () => {
    const invalidData = mockData.generateInvalidData('technology', 'short_description');
    const result = await validateTechnology(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      field: 'description'
    }));
  });

  test('should set appropriate security level for restricted data', async () => {
    const restrictedData = { ...mockData.validTechnologyData };
    restrictedData.securityLevel = SecurityClassification.RESTRICTED;
    const result = await validateTechnology(restrictedData);
    expect(result.securityLevel).toBe('CRITICAL');
  });
});