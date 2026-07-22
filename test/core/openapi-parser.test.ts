import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { parseOpenApiSpec, logger } from '../../src/core/openapi-parser';

function readFixture(name: string): string {
  return readFileSync(resolve(__dirname, '..', 'fixtures', name), 'utf8');
}

let warnSpy: MockInstance<typeof logger.warn>;

beforeEach(() => {
  warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

function getWarnings(): string {
  return warnSpy.mock.calls.map((c) => c[0]).join('\n');
}

describe('parseOpenApiSpec - basic parsing', () => {
  it('parses a basic spec with a single GET operation', () => {
    const content = JSON.parse(readFixture('openapi-basic.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].method).toBe('GET');
    expect(result.requests[0].url).toBe('{{baseUrl}}/users');
    expect(result.requests[0].name).toBe('listUsers');
  });

  it('parses a YAML spec with the same result as the JSON equivalent', () => {
    const yamlContent = readFixture('openapi-basic.yaml');
    const doc = parseYaml(yamlContent);
    const result = parseOpenApiSpec(doc);

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].method).toBe('GET');
    expect(result.requests[0].url).toBe('{{baseUrl}}/users');
    expect(result.requests[0].name).toBe('listUsers');
  });

  it('parses spec with multiple operations on same path', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/users/{id}': {
          get: { operationId: 'getUser' },
          put: { operationId: 'updateUser' },
          delete: { operationId: 'deleteUser' },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests).toHaveLength(3);
    expect(result.requests[0].name).toBe('getUser');
    expect(result.requests[1].name).toBe('updateUser');
    expect(result.requests[2].name).toBe('deleteUser');
  });

  it('parses empty spec with baseUrl variable', () => {
    const content = JSON.parse(readFixture('openapi-empty.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests).toHaveLength(0);
    expect(result.variables).toContainEqual({ name: 'baseUrl', value: 'https://api.example.com' });
  });

  it('warns on Swagger 2.0 spec and returns empty results', () => {
    const content = { swagger: '2.0', paths: {} };
    const result = parseOpenApiSpec(content);

    expect(result.requests).toHaveLength(0);
    expect(getWarnings()).toContain('Swagger 2.0');
  });
});

describe('parseOpenApiSpec - server URL / baseUrl', () => {
  it('extracts single server URL as baseUrl', () => {
    const content = JSON.parse(readFixture('openapi-auth.json'));
    const result = parseOpenApiSpec(content);

    expect(result.variables).toContainEqual({ name: 'baseUrl', value: 'https://api.example.com' });
  });

  it('sets baseUrl to empty string when no servers', () => {
    const content = {
      openapi: '3.0.3',
      paths: { '/test': { get: { operationId: 'test' } } },
    };
    const result = parseOpenApiSpec(content);

    expect(result.variables).toContainEqual({ name: 'baseUrl', value: '' });
  });

  it('resolves server template variable with default', () => {
    const content = JSON.parse(readFixture('openapi-variables.json'));
    const result = parseOpenApiSpec(content);

    expect(result.variables).toContainEqual({ name: 'baseUrl', value: 'https://api.example.com/v1' });
  });

  it('leaves template variable as {{var}} when no default and emits FileVariable', () => {
    const content = {
      openapi: '3.0.3',
      servers: [{ url: 'https://{host}/v1', variables: { host: {} } }],
      paths: { '/test': { get: { operationId: 'test' } } },
    };
    const result = parseOpenApiSpec(content);

    expect(result.variables).toContainEqual({ name: 'baseUrl', value: 'https://{{host}}/v1' });
    expect(result.variables).toContainEqual({ name: 'host', value: '' });
  });
});

describe('parseOpenApiSpec - operation names', () => {
  it('uses operationId as name', () => {
    const content = JSON.parse(readFixture('openapi-basic.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].name).toBe('listUsers');
  });

  it('uses summary when operationId is absent', () => {
    const content = {
      openapi: '3.0.3',
      paths: { '/users': { get: { summary: 'List all users' } } },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].name).toBe('List all users');
  });

  it('falls back to METHOD /path when no operationId or summary', () => {
    const content = {
      openapi: '3.0.3',
      paths: { '/users': { get: {} } },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].name).toBe('GET /users');
  });

  it('prefixes with first tag', () => {
    const content = JSON.parse(readFixture('openapi-tags.json'));
    const result = parseOpenApiSpec(content);

    const names = result.requests.map((r) => r.name);
    expect(names).toContain('Users / listUsers');
    expect(names).toContain('Users / createUser');
    expect(names).toContain('Orders / List orders');
  });

  it('does not add tag prefix when no tags', () => {
    const content = JSON.parse(readFixture('openapi-tags.json'));
    const result = parseOpenApiSpec(content);

    const healthRequest = result.requests.find((r) => r.name === 'GET /health');
    expect(healthRequest).toBeDefined();
  });
});

describe('parseOpenApiSpec - line numbers', () => {
  it('assigns incrementing line numbers', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/users/{id}': {
          get: { operationId: 'getUser' },
          put: { operationId: 'updateUser' },
          delete: { operationId: 'deleteUser' },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].lineNumber).toBe(1);
    expect(result.requests[1].lineNumber).toBe(2);
    expect(result.requests[2].lineNumber).toBe(3);
  });
});

describe('parseOpenApiSpec - path parameters', () => {
  it('maps path parameter with default', () => {
    const content = JSON.parse(readFixture('openapi-params.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].url).toContain('{{id}}');
    expect(result.variables).toContainEqual({ name: 'id', value: '1' });
  });

  it('maps path parameter with example and no default', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/users/{id}': {
          get: {
            operationId: 'getUser',
            parameters: [{ name: 'id', in: 'path', schema: { type: 'integer', example: 42 } }],
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.variables).toContainEqual({ name: 'id', value: '42' });
  });

  it('maps path parameter with type but no default or example to type value', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/users/{id}': {
          get: {
            operationId: 'getUser',
            parameters: [{ name: 'id', in: 'path', schema: { type: 'integer' } }],
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.variables).toContainEqual({ name: 'id', value: 'integer' });
  });

  it('maps path parameter with no schema to empty string', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/users/{id}': {
          get: {
            operationId: 'getUser',
            parameters: [{ name: 'id', in: 'path' }],
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.variables).toContainEqual({ name: 'id', value: '' });
  });

  it('maps path parameter with nullable union type to empty string', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/users/{id}': {
          get: {
            operationId: 'getUser',
            parameters: [{ name: 'id', in: 'path', schema: { type: ['string', 'null'] } }],
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.variables).toContainEqual({ name: 'id', value: '' });
  });
});

describe('parseOpenApiSpec - query parameters', () => {
  it('appends query parameter with default to URL', () => {
    const content = JSON.parse(readFixture('openapi-params.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].url).toContain('?limit={{limit}}');
    expect(result.variables).toContainEqual({ name: 'limit', value: '20' });
  });

  it('appends multiple query parameters to URL', () => {
    const content = JSON.parse(readFixture('openapi-params.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].url).toContain('?limit={{limit}}&status={{status}}');
  });

  it('uses example value for query parameter', () => {
    const content = JSON.parse(readFixture('openapi-params.json'));
    const result = parseOpenApiSpec(content);

    expect(result.variables).toContainEqual({ name: 'status', value: 'active' });
  });
});

describe('parseOpenApiSpec - header parameters', () => {
  it('maps header parameter with type but no default', () => {
    const content = JSON.parse(readFixture('openapi-params.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].headers['X-Trace-Id']).toBe('{{X-Trace-Id}}');
    expect(result.variables).toContainEqual({ name: 'X-Trace-Id', value: 'string' });
  });

  it('maps header parameter with default', () => {
    const content = JSON.parse(readFixture('openapi-params.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].headers['Accept']).toBe('{{Accept}}');
    expect(result.variables).toContainEqual({ name: 'Accept', value: 'application/json' });
  });
});

describe('parseOpenApiSpec - cookie parameters', () => {
  it('combines single cookie parameter into Cookie header', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/test': {
          get: {
            operationId: 'test',
            parameters: [{ name: 'session', in: 'cookie', schema: { type: 'string' } }],
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].headers['Cookie']).toBe('session={{session}}');
    expect(result.variables).toContainEqual({ name: 'session', value: 'string' });
  });

  it('combines multiple cookie parameters into Cookie header', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/test': {
          get: {
            operationId: 'test',
            parameters: [
              { name: 'session', in: 'cookie', schema: { type: 'string' } },
              { name: 'theme', in: 'cookie', schema: { type: 'string' } },
            ],
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].headers['Cookie']).toBe('session={{session}}; theme={{theme}}');
  });
});

describe('parseOpenApiSpec - $ref resolution', () => {
  it('resolves internal parameter $ref', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/users/{id}': {
          get: {
            operationId: 'getUser',
            parameters: [{ $ref: '#/components/parameters/UserIdParam' }],
          },
        },
      },
      components: {
        parameters: {
          UserIdParam: { name: 'id', in: 'path', schema: { type: 'integer', default: 1 } },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].url).toContain('{{id}}');
    expect(result.variables).toContainEqual({ name: 'id', value: '1' });
  });

  it('warns on external $ref and skips parameter', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/users/{id}': {
          get: {
            operationId: 'getUser',
            parameters: [{ $ref: './other.json#/UserIdParam' }],
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(getWarnings()).toContain('External $ref');
    expect(result.requests).toHaveLength(1);
  });

  it('deduplicates variables with the same name across multiple operations', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/users/{id}': {
          get: {
            operationId: 'getUser',
            parameters: [{ name: 'id', in: 'path', schema: { type: 'integer', default: 1 } }],
          },
          delete: {
            operationId: 'deleteUser',
            parameters: [{ name: 'id', in: 'path', schema: { type: 'integer', default: 1 } }],
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    const idVars = result.variables.filter((v) => v.name === 'id');
    expect(idVars).toHaveLength(1);
    expect(idVars[0]).toEqual({ name: 'id', value: '1' });
  });
});

describe('parseOpenApiSpec - recursive $ref resolution', () => {
  it('resolves $ref chain (A → B → C) to C content', () => {
    const content = JSON.parse(readFixture('openapi-ref-chain.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe('{"id":1}');
  });

  it('resolves nested property $ref with top-level example on sub-schema', () => {
    const content = JSON.parse(readFixture('openapi-nested-refs.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'createOrder');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected createOrder');
    expect(req.body).toBe(
      '{"customer":{"name":"Alice","email":"alice@example.com"},"shipping":{"street":"123 Main St","city":"Springfield"},"currency":"USD","metadata":{"source":"web"}}',
    );
  });

  it('resolves diamond $ref without cycle warning', () => {
    const content = JSON.parse(readFixture('openapi-diamond-ref.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe(
      '{"billing":{"street":"123 Main St","city":"Springfield"},"shipping":{"street":"123 Main St","city":"Springfield"}}',
    );
    expect(getWarnings()).not.toContain('Circular');
  });

  it('omits external $ref stub from synthesized body', () => {
    const content = JSON.parse(readFixture('openapi-external-ref-unaffected.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe('{"internal":{"id":1}}');
  });
});

describe('parseOpenApiSpec - circular $ref guard', () => {
  it('handles direct self-cycle (A → A) with warning and no throw', () => {
    const content = JSON.parse(readFixture('openapi-self-cycle.json'));
    const result = parseOpenApiSpec(content);

    // The em-dash (U+2014) is intentional and spec-mandated.
    expect(getWarnings()).toContain('Circular $ref "#/components/schemas/A" — stop resolving');
    expect(result.requests[0].body).toBeUndefined();
  });

  it('handles indirect cycle (A → B → A) with warning and no throw', () => {
    const content = JSON.parse(readFixture('openapi-circular-ref.json'));
    const result = parseOpenApiSpec(content);

    expect(getWarnings()).toContain('Circular $ref');
    expect(result.requests[0].body).toBeUndefined();
  });

  it('does not warn on acyclic nested $ref', () => {
    const content = JSON.parse(readFixture('openapi-nested-refs.json'));
    parseOpenApiSpec(content);

    expect(getWarnings()).not.toContain('Circular');
  });

  it('does not suppress other operations when one operation has a cycle', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/cyclic': {
          post: {
            operationId: 'cyclicOp',
            requestBody: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/CyclicA' } } },
            },
          },
        },
        '/acyclic': {
          post: {
            operationId: 'acyclicOp',
            requestBody: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Simple' } } },
            },
          },
        },
      },
      components: {
        schemas: {
          CyclicA: { $ref: '#/components/schemas/CyclicB' },
          CyclicB: { $ref: '#/components/schemas/CyclicA' },
          Simple: { type: 'object', example: { id: 1 } },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    const cyclicReq = result.requests.find((r) => r.name === 'cyclicOp');
    const acyclicReq = result.requests.find((r) => r.name === 'acyclicOp');
    expect(cyclicReq).toBeDefined();
    expect(acyclicReq).toBeDefined();
    if (!cyclicReq || !acyclicReq) throw new Error('Expected both requests');

    expect(cyclicReq.body).toBeUndefined();
    expect(acyclicReq.body).toBe('{"id":1}');

    const circularWarnings = getWarnings()
      .split('\n')
      .filter((line) => line.includes('Circular $ref'));
    expect(circularWarnings.length).toBeGreaterThan(0);
  });
});

describe('parseOpenApiSpec - recursive $ref regression', () => {
  it('flat spec produces identical output after dereference pass', () => {
    const content = JSON.parse(readFixture('openapi-body-ref.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe(
      '{"id":1,"name":"Widget","description":"A widget","secret":"string"}',
    );
  });

  it('spring-boot real-world spec produces identical request list', () => {
    const content = JSON.parse(readFileSync(
      resolve(__dirname, '..', '..', 'examples', 'spring-boot-api-service-openapi.json'),
      'utf8',
    ));
    const result = parseOpenApiSpec(content);

    expect(result.requests).toHaveLength(7);
    for (const req of result.requests) {
      expect(req.name).toBeTruthy();
      expect(req.method).toMatch(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/);
      expect(req.url).toMatch(/^{{baseUrl}}/);
    }
  });
});

describe('parseOpenApiSpec - recursive body synthesis', () => {
  it('synthesizes nested object from per-property examples', () => {
    const content = JSON.parse(readFixture('openapi-nested-object-examples.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'createOrder');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected createOrder');
    expect(req.body).toBe(
      '{"customer":{"name":"Alice","email":"alice@example.com"},"shipping":{"street":"123 Main St","city":"Springfield"},"currency":"USD","metadata":{"source":"web"}}',
    );
  });

  it('synthesizes array of object refs', () => {
    const content = JSON.parse(readFixture('openapi-array-of-refs.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'bulkCreate');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected bulkCreate');
    expect(req.body).toBe('[{"sku":"W-001","quantity":2}]');
  });

  it('synthesizes array of primitives', () => {
    const content = JSON.parse(readFixture('openapi-array-of-primitives.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'setTags');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected setTags');
    expect(req.body).toBe('["priority"]');
  });

  it('synthesizes deeply-nested object (3+ levels)', () => {
    const content = JSON.parse(readFixture('openapi-deeply-nested.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'createDeep');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected createDeep');
    expect(req.body).toBe('{"order":{"customer":{"name":"Alice"}}}');
  });

  it('uses default value for primitive property without example', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      count: { type: 'integer', default: 10 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe('{"count":10}');
  });

  it('omits external $ref stub from synthesized body', () => {
    const content = JSON.parse(readFixture('openapi-external-ref-stub.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe('{"internal":"resolved"}');
    expect(getWarnings()).not.toContain('External $ref');
  });

  it('returns undefined body for composition keyword (allOf)', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/Base' },
                      { properties: { name: { type: 'string', example: 'Alice' } } },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Base: { type: 'object', properties: { id: { type: 'integer', example: 1 } } },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBeUndefined();
  });
});

describe('parseOpenApiSpec - urlencoded nested encoding', () => {
  it('uses bracket notation for nested object properties', () => {
    const content = JSON.parse(readFixture('openapi-urlencoded-nested.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'submitForm');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected submitForm');
    expect(req.body).toBe('name=John&address%5Bcity%5D=SF&tags=vip');
    expect(req.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('uses repeated keys for array properties', () => {
    const content = JSON.parse(readFixture('openapi-urlencoded-nested.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toContain('tags=vip');
    expect(result.requests[0].body).not.toContain('tags=vip&tags=vip');
  });

  it('encodes mixed nested object and array properties', () => {
    const content = JSON.parse(readFixture('openapi-urlencoded-nested.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe('name=John&address%5Bcity%5D=SF&tags=vip');
  });
});

describe('parseOpenApiSpec - recursive body synthesis depth guard', () => {
  it('fires depth guard for deeply nested schemas (depth > 50)', () => {
    // JSON can't represent cycles, so use deep nesting to trigger the depth guard.
    function buildNested(levels: number): Record<string, unknown> {
      let schema: Record<string, unknown> = { type: 'string', example: 'deep' };
      for (let i = 0; i < levels; i++) {
        schema = { type: 'object', properties: { level: schema } };
      }
      return schema;
    }

    const content = {
      openapi: '3.0.3',
      paths: {
        '/deep': {
          post: {
            operationId: 'deepOp',
            requestBody: {
              content: { 'application/json': { schema: buildNested(55) } },
            },
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(getWarnings()).toContain('Max synthesis depth');
    expect(result.requests[0].body).toBeUndefined();
  });
});

describe('parseOpenApiSpec - recursive body synthesis real-world regression', () => {
  it('spring-boot real-world spec produces correct output', () => {
    const content = JSON.parse(readFileSync(
      resolve(__dirname, '..', '..', 'examples', 'spring-boot-api-service-openapi.json'),
      'utf8',
    ));
    const result = parseOpenApiSpec(content);

    expect(result.requests).toHaveLength(7);
    for (const req of result.requests) {
      expect(req.name).toBeTruthy();
      expect(req.method).toMatch(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/);
      expect(req.url).toMatch(/^{{baseUrl}}/);
    }
  });
});

describe('parseOpenApiSpec - security / auth', () => {
  it('maps bearer auth to Authorization header', () => {
    const content = JSON.parse(readFixture('openapi-auth.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'bearerEndpoint');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected bearerEndpoint');
    expect(req.headers['Authorization']).toBe('Bearer {{bearerAuth}}');
    expect(result.variables).toContainEqual({ name: 'bearerAuth', value: '' });
  });

  it('maps basic auth to Authorization header', () => {
    const content = JSON.parse(readFixture('openapi-auth.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'basicEndpoint');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected basicEndpoint');
    expect(req.headers['Authorization']).toBe('Basic {{basicAuth}}');
    expect(result.variables).toContainEqual({ name: 'basicAuth', value: '' });
  });

  it('maps apiKey in header to custom header', () => {
    const content = JSON.parse(readFixture('openapi-auth.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'apiKeyHeaderEndpoint');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected apiKeyHeaderEndpoint');
    expect(req.headers['X-API-Key']).toBe('{{apiKeyHeader}}');
    expect(result.variables).toContainEqual({ name: 'apiKeyHeader', value: '' });
  });

  it('maps apiKey in query to URL query string', () => {
    const content = JSON.parse(readFixture('openapi-auth.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'apiKeyQueryEndpoint');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected apiKeyQueryEndpoint');
    expect(req.url).toContain('api_key={{apiKeyQuery}}');
    expect(result.variables).toContainEqual({ name: 'apiKeyQuery', value: '' });
  });

  it('maps apiKey in cookie to Cookie header', () => {
    const content = JSON.parse(readFixture('openapi-auth.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'apiKeyCookieEndpoint');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected apiKeyCookieEndpoint');
    expect(req.headers['Cookie']).toBe('session={{apiKeyCookie}}');
    expect(result.variables).toContainEqual({ name: 'apiKeyCookie', value: '' });
  });

  it('warns on unsupported security scheme (oauth2)', () => {
    const content = JSON.parse(readFixture('openapi-auth.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'oauthEndpoint');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected oauthEndpoint');
    expect(req.headers['Authorization']).toBeUndefined();
    expect(getWarnings()).toContain('oauth2');
  });

  it('adds no auth headers when no security defined', () => {
    const content = JSON.parse(readFixture('openapi-basic.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].headers['Authorization']).toBeUndefined();
  });
});

describe('parseOpenApiSpec - request body', () => {
  it('uses content-level example verbatim', () => {
    const content = JSON.parse(readFixture('openapi-body-example.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'createUser');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected createUser');
    expect(req.body).toBe('{"name":"Alice","email":"alice@example.com"}');
    expect(req.headers['Content-Type']).toBe('application/json');
  });

  it('uses named examples (first key value)', () => {
    const content = JSON.parse(readFixture('openapi-body-example.json'));
    const result = parseOpenApiSpec(content);

    const req = result.requests.find((r) => r.name === 'createUserNamed');
    expect(req).toBeDefined();
    if (!req) throw new Error('Expected createUserNamed');
    expect(req.body).toBe('{"name":"Alice","email":"alice@example.com"}');
  });

  it('uses schema-level example via $ref', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Item' },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Item: { type: 'object', example: { name: 'Alice' } },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe('{"name":"Alice"}');
  });

  it('synthesizes flat object from per-property examples', () => {
    const content = JSON.parse(readFixture('openapi-body-ref.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe('{"id":1,"name":"Widget","description":"A widget","secret":"string"}');
  });

  it('uses type as placeholder for properties without example or default', () => {
    const content = JSON.parse(readFixture('openapi-body-ref.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toContain('"secret":"string"');
  });

  it('uses type as placeholder for type-only properties', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/generate': {
          post: {
            operationId: 'generate-content',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      templateId: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe('{"templateId":"string"}');
  });

  it('uses property default when no example present', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      count: { type: 'integer', default: 0 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe('{"count":0}');
  });

  it('resolves property $ref before value lookup', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/UserRef' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          UserRef: { type: 'string', example: 'alice' },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe('{"user":"alice"}');
  });

  it('resolves property $ref with type only', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      templateId: { $ref: '#/components/schemas/TemplateId' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          TemplateId: { type: 'string' },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe('{"templateId":"string"}');
  });

  it('skips property with nullable union type', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      optional: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBeUndefined();
  });

  it('returns undefined body when no examples exist', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            requestBody: {
              content: {
                'application/json': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBeUndefined();
  });

  it('prefers application/json over other content types', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/items': {
          post: {
            operationId: 'createItem',
            requestBody: {
              content: {
                'application/xml': { example: '<item/>' },
                'application/json': { example: { name: 'Alice' } },
              },
            },
          },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].headers['Content-Type']).toBe('application/json');
    expect(result.requests[0].body).toBe('{"name":"Alice"}');
  });

  it('serializes urlencoded body as key=value', () => {
    const content = JSON.parse(readFixture('openapi-urlencoded.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBe('name=John&email=john%40example.com');
    expect(result.requests[0].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('returns undefined body and no Content-Type when no requestBody', () => {
    const content = JSON.parse(readFixture('openapi-basic.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests[0].body).toBeUndefined();
    expect(result.requests[0].headers['Content-Type']).toBeUndefined();
  });
});

describe('parseOpenApiSpec - warnings', () => {
  it('warns on unsupported HTTP method (trace)', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/test': {
          trace: { operationId: 'traceTest' },
        },
      },
    };
    const result = parseOpenApiSpec(content);

    expect(result.requests).toHaveLength(0);
    expect(getWarnings()).toMatch(/Unsupported HTTP method "TRACE"/);
  });

  it('warns on external $ref', () => {
    const content = {
      openapi: '3.0.3',
      paths: {
        '/users/{id}': {
          get: {
            operationId: 'getUser',
            parameters: [{ $ref: './other.json#/UserIdParam' }],
          },
        },
      },
    };
    parseOpenApiSpec(content);

    expect(getWarnings()).toContain('External $ref');
  });

  it('produces no warnings for fully supported operations', () => {
    const content = JSON.parse(readFixture('openapi-basic.json'));
    parseOpenApiSpec(content);

    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('integration smoke test', () => {
  it('parsed spec produces valid requests', () => {
    const content = JSON.parse(readFixture('openapi-params.json'));
    const result = parseOpenApiSpec(content);

    expect(result.requests.length).toBeGreaterThan(0);

    for (const req of result.requests) {
      expect(req.name).toBeTruthy();
      expect(req.method).toMatch(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/);
      expect(req.url).toMatch(/^{{baseUrl}}/);
      expect(typeof req.lineNumber).toBe('number');
      expect(req.lineNumber).toBeGreaterThan(0);
    }
  });
});
