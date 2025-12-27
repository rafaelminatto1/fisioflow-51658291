import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse,
  getPaginationParams,
  getSearchParam,
  getSortParams,
  isValidUUID,
  extractIdFromPath,
} from '../../_shared/api-helpers.ts';

describe('API Helpers', () => {
  describe('successResponse', () => {
    it('should create a success response with default status 200', async () => {
      const data = { id: '123', name: 'Test' };
      const response = successResponse(data);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual(data);
    });

    it('should create a success response with custom status', async () => {
      const data = { message: 'Created' };
      const response = successResponse(data, 201);
      
      expect(response.status).toBe(201);
    });
  });

  describe('errorResponse', () => {
    it('should create an error response with default status 400', async () => {
      const response = errorResponse('Error message');
      
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toHaveProperty('code');
      expect(json).toHaveProperty('message', 'Error message');
    });

    it('should create an error response with custom code and details', async () => {
      const response = errorResponse('Validation failed', 422, 'VALIDATION_ERROR', { field: 'email' });
      
      expect(response.status).toBe(422);
      const json = await response.json();
      expect(json.code).toBe('VALIDATION_ERROR');
      expect(json.details).toEqual({ field: 'email' });
    });
  });

  describe('createdResponse', () => {
    it('should create a 201 response', async () => {
      const data = { id: '123' };
      const response = createdResponse(data);
      
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json).toEqual(data);
    });
  });

  describe('noContentResponse', () => {
    it('should create a 204 response', () => {
      const response = noContentResponse();
      
      expect(response.status).toBe(204);
    });
  });

  describe('paginatedResponse', () => {
    it('should create a paginated response', async () => {
      const data = [{ id: '1' }, { id: '2' }];
      const response = paginatedResponse(data, 100, 1, 10);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toEqual(data);
      expect(json.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
      });
    });
  });

  describe('getPaginationParams', () => {
    it('should return default pagination params', () => {
      const url = new URL('https://example.com/api');
      const params = getPaginationParams(url);
      
      expect(params.page).toBe(1);
      expect(params.limit).toBe(20);
      expect(params.offset).toBe(0);
    });

    it('should parse custom pagination params', () => {
      const url = new URL('https://example.com/api?page=2&limit=50');
      const params = getPaginationParams(url);
      
      expect(params.page).toBe(2);
      expect(params.limit).toBe(50);
      expect(params.offset).toBe(50);
    });

    it('should enforce max limit', () => {
      const url = new URL('https://example.com/api?limit=1000');
      const params = getPaginationParams(url);
      
      expect(params.limit).toBe(100);
    });
  });

  describe('getSearchParam', () => {
    it('should return search param', () => {
      const url = new URL('https://example.com/api?search=test');
      const search = getSearchParam(url);
      
      expect(search).toBe('test');
    });

    it('should return null if no search param', () => {
      const url = new URL('https://example.com/api');
      const search = getSearchParam(url);
      
      expect(search).toBeNull();
    });
  });

  describe('getSortParams', () => {
    it('should return default sort params', () => {
      const url = new URL('https://example.com/api');
      const params = getSortParams(url);
      
      expect(params.sortBy).toBe('name');
      expect(params.sortOrder).toBe('asc');
    });

    it('should parse custom sort params', () => {
      const url = new URL('https://example.com/api?sortBy=createdAt&sortOrder=desc');
      const params = getSortParams(url);
      
      expect(params.sortBy).toBe('createdAt');
      expect(params.sortOrder).toBe('desc');
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUID', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUID', () => {
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('123')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('extractIdFromPath', () => {
    it('should extract ID from path', () => {
      const path = '/api-patients/550e8400-e29b-41d4-a716-446655440000';
      const id = extractIdFromPath(path, '/api-patients');
      
      expect(id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return null if no ID in path', () => {
      const path = '/api-patients';
      const id = extractIdFromPath(path, '/api-patients');
      
      expect(id).toBeNull();
    });

    it('should handle nested paths', () => {
      const path = '/api-patients/550e8400-e29b-41d4-a716-446655440000/medical-record';
      const id = extractIdFromPath(path, '/api-patients');
      
      expect(id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });
});

