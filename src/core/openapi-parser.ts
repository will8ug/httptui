/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import type { FileVariable, HttpMethod, ParseResult, ParsedRequest } from './types';

const SUPPORTED_METHODS: ReadonlySet<string> = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

const KNOWN_UNSUPPORTED_METHODS: ReadonlySet<string> = new Set([
  'TRACE',
  'CONNECT',
]);

const NON_METHOD_PATH_KEYS: ReadonlySet<string> = new Set([
  'parameters',
  'summary',
  'description',
  'servers',
  '$ref',
]);

export const logger = {
  warn(message: string): void {
    process.stderr.write(`\x1b[33m⚠ ${message}\x1b[0m\n`);
  },
};

function isSupportedMethod(method: string): method is HttpMethod {
  if (!method) {
    return false;
  }
  return SUPPORTED_METHODS.has(method.toUpperCase());
}

/**
 * Resolve an internal `$ref` (e.g. `#/components/parameters/UserIdParam`) by
 * traversing the parsed JSON document. External refs are logged as warnings
 * and return undefined.
 */
function resolveRef(ref: string, doc: any): any {
  if (!ref.startsWith('#/')) {
    logger.warn(`External $ref "${ref}" is not supported — skipped`);
    return undefined;
  }

  const parts = ref.split('/').slice(1);
  let current: any = doc;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

function resolveSchema(schema: any, doc: any): any {
  if (!schema) {
    return undefined;
  }
  if (schema.$ref) {
    return resolveRef(schema.$ref, doc);
  }
  return schema;
}

function resolveParamValue(param: any, doc: any): string {
  if (!param || !param.schema) {
    return '';
  }

  const schema = resolveSchema(param.schema, doc);
  if (!schema) {
    return '';
  }

  if (schema.default !== undefined) {
    return String(schema.default);
  }
  if (schema.example !== undefined) {
    return String(schema.example);
  }
  if (typeof schema.type === 'string') {
    return String(schema.type);
  }
  return '';
}

function serializeExample(example: any): string {
  if (typeof example === 'string') {
    return example;
  }
  return JSON.stringify(example);
}

function determineName(method: HttpMethod, path: string, operation: any): string {
  const baseName = operation.operationId || operation.summary || `${method} ${path}`;

  if (operation.tags && Array.isArray(operation.tags) && operation.tags.length > 0) {
    return `${operation.tags[0]} / ${baseName}`;
  }

  return baseName;
}

function extractBaseUrl(doc: any): { url: string; templateVars: FileVariable[] } {
  const servers = doc?.servers;
  if (!servers || !Array.isArray(servers) || servers.length === 0) {
    return { url: '', templateVars: [] };
  }

  const server = servers[0];
  if (!server || !server.url) {
    return { url: '', templateVars: [] };
  }

  let url: string = server.url;
  const templateVars: FileVariable[] = [];
  const serverVars = server.variables;

  if (serverVars && typeof serverVars === 'object') {
    url = url.replace(/\{([^}]+)\}/g, (_, varName: string) => {
      const varDef = serverVars[varName];
      if (varDef && varDef.default !== undefined) {
        return String(varDef.default);
      }
      templateVars.push({ name: varName, value: '' });
      return `{{${varName}}}`;
    });
  }

  return { url, templateVars };
}

function collectParameters(pathItem: any, operation: any): any[] {
  const params: any[] = [];

  if (pathItem?.parameters && Array.isArray(pathItem.parameters)) {
    params.push(...pathItem.parameters);
  }

  if (operation?.parameters && Array.isArray(operation.parameters)) {
    params.push(...operation.parameters);
  }

  return params;
}

function processSecurity(
  operation: any,
  doc: any,
  headers: Record<string, string>,
  queryParts: string[],
  cookieParts: string[],
  variables: FileVariable[],
): void {
  const securitySchemes = doc?.components?.securitySchemes;
  if (!securitySchemes) {
    return;
  }

  // Operation-level security overrides global; explicit [] means no auth
  const security = operation.security !== undefined ? operation.security : doc.security;
  if (!security || !Array.isArray(security) || security.length === 0) {
    return;
  }

  for (const requirement of security) {
    if (!requirement || typeof requirement !== 'object') {
      continue;
    }

    for (const schemeName of Object.keys(requirement)) {
      const scheme = securitySchemes[schemeName];
      if (!scheme) {
        logger.warn(`Security scheme "${schemeName}" not found in components.securitySchemes — skipped`);
        continue;
      }

      const type = scheme.type;

      if (type === 'http') {
        const httpScheme = scheme.scheme?.toLowerCase();

        if (httpScheme === 'bearer') {
          headers['Authorization'] = `Bearer {{${schemeName}}}`;
          variables.push({ name: schemeName, value: '' });
        } else if (httpScheme === 'basic') {
          headers['Authorization'] = `Basic {{${schemeName}}}`;
          variables.push({ name: schemeName, value: '' });
        } else {
          logger.warn(`Unsupported HTTP auth scheme "${scheme.scheme ?? '(unknown)'}" in security scheme "${schemeName}" — skipped`);
        }
      } else if (type === 'apiKey') {
        const inLocation = scheme.in?.toLowerCase();
        const keyName = scheme.name ?? schemeName;

        if (inLocation === 'header') {
          headers[keyName] = `{{${schemeName}}}`;
          variables.push({ name: schemeName, value: '' });
        } else if (inLocation === 'query') {
          queryParts.push(`${keyName}={{${schemeName}}}`);
          variables.push({ name: schemeName, value: '' });
        } else if (inLocation === 'cookie') {
          cookieParts.push(`${keyName}={{${schemeName}}}`);
          variables.push({ name: schemeName, value: '' });
        } else {
          logger.warn(`Unsupported apiKey location "${scheme.in ?? '(unknown)'}" in security scheme "${schemeName}" — skipped`);
        }
      } else {
        logger.warn(`Unsupported security scheme type "${type ?? '(unknown)'}" for "${schemeName}" — skipped`);
      }
    }
  }
}

function processRequestBody(
  requestBody: any,
  doc: any,
): { body: string | undefined; contentType: string | undefined } {
  if (!requestBody) {
    return { body: undefined, contentType: undefined };
  }

  let resolvedBody = requestBody;
  if (requestBody.$ref) {
    resolvedBody = resolveRef(requestBody.$ref, doc);
    if (!resolvedBody) {
      return { body: undefined, contentType: undefined };
    }
  }

  const content = resolvedBody.content;
  if (!content || typeof content !== 'object') {
    return { body: undefined, contentType: undefined };
  }

  const contentKeys = Object.keys(content);
  if (contentKeys.length === 0) {
    return { body: undefined, contentType: undefined };
  }

  let mediaType: string;
  if (content['application/json']) {
    mediaType = 'application/json';
  } else {
    mediaType = contentKeys[0];
  }

  const mediaTypeDef = content[mediaType];
  if (!mediaTypeDef) {
    return { body: undefined, contentType: undefined };
  }

  // Tier 1: content[mediaType].example
  if (mediaTypeDef.example !== undefined) {
    return { body: serializeExample(mediaTypeDef.example), contentType: mediaType };
  }

  // Tier 2: content[mediaType].examples[firstKey].value
  if (mediaTypeDef.examples && typeof mediaTypeDef.examples === 'object') {
    const exampleKeys = Object.keys(mediaTypeDef.examples);
    if (exampleKeys.length > 0) {
      const firstExample = mediaTypeDef.examples[exampleKeys[0]];
      if (firstExample && firstExample.value !== undefined) {
        return { body: serializeExample(firstExample.value), contentType: mediaType };
      }
    }
  }

  if (mediaTypeDef.schema) {
    const resolvedSchema = resolveSchema(mediaTypeDef.schema, doc);

    // Tier 3: schema.example (after resolving $ref)
    if (resolvedSchema && resolvedSchema.example !== undefined) {
      return { body: serializeExample(resolvedSchema.example), contentType: mediaType };
    }

    // Tier 4: synthesize flat object from per-property examples
    if (resolvedSchema && resolvedSchema.type === 'object' && resolvedSchema.properties) {
      const synthesized: Record<string, any> = {};
      let hasAny = false;

      for (const [propName, propSchema] of Object.entries(resolvedSchema.properties)) {
        const prop = resolveSchema(propSchema, doc);
        if (!prop) continue;
        if (prop.example !== undefined) {
          synthesized[propName] = prop.example;
          hasAny = true;
        } else if (prop.default !== undefined) {
          synthesized[propName] = prop.default;
          hasAny = true;
        } else if (typeof prop.type === 'string') {
          synthesized[propName] = String(prop.type);
          hasAny = true;
        }
      }

      if (hasAny) {
        if (mediaType === 'application/x-www-form-urlencoded') {
          const body = Object.entries(synthesized)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join('&');
          return { body, contentType: mediaType };
        }
        return { body: JSON.stringify(synthesized), contentType: mediaType };
      }
    }
  }

  // Tier 5: no body
  return { body: undefined, contentType: undefined };
}

function buildRequest(
  method: HttpMethod,
  path: string,
  pathItem: any,
  operation: any,
  doc: any,
  lineNumber: number,
  variables: FileVariable[],
): ParsedRequest {
  const name = determineName(method, path, operation);

  let url = `{{baseUrl}}${path.replace(/\{([^}]+)\}/g, '{{$1}}')}`;

  const headers: Record<string, string> = {};
  const queryParts: string[] = [];
  const cookieParts: string[] = [];

  const parameters = collectParameters(pathItem, operation);

  for (const param of parameters) {
    if (!param) {
      continue;
    }

    const resolvedParam = param.$ref ? resolveRef(param.$ref, doc) : param;
    if (!resolvedParam) {
      continue;
    }

    const paramName = resolvedParam.name;
    if (!paramName) {
      continue;
    }

    const paramIn = resolvedParam.in;
    const paramValue = resolveParamValue(resolvedParam, doc);

    if (paramIn === 'path') {
      variables.push({ name: paramName, value: paramValue });
    } else if (paramIn === 'query') {
      queryParts.push(`${paramName}={{${paramName}}}`);
      variables.push({ name: paramName, value: paramValue });
    } else if (paramIn === 'header') {
      headers[paramName] = `{{${paramName}}}`;
      variables.push({ name: paramName, value: paramValue });
    } else if (paramIn === 'cookie') {
      cookieParts.push(`${paramName}={{${paramName}}}`);
      variables.push({ name: paramName, value: paramValue });
    }
  }

  processSecurity(operation, doc, headers, queryParts, cookieParts, variables);

  const { body, contentType } = processRequestBody(operation.requestBody, doc);
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  if (cookieParts.length > 0) {
    headers['Cookie'] = cookieParts.join('; ');
  }

  if (queryParts.length > 0) {
    url = `${url}?${queryParts.join('&')}`;
  }

  return {
    name,
    method,
    url,
    headers,
    body,
    lineNumber,
  };
}

function deduplicate(variables: FileVariable[]) {
  const seen = new Set<string>();
  return variables.filter((v) => {
    if (seen.has(v.name)) {
      return false;
    }
    seen.add(v.name);
    return true;
  });
}

/**
 * Recursively dereference every internal `$ref` (`#/...`) in the parsed JSON
 * document in place, replacing each with its target object. External refs
 * (non-`#/`) are left as stubs so the existing call-site resolution still
 * warns. Circular internal refs are detected via a path-scoped visited set
 * and left as stubs with a warning. A defensive depth counter guards against
 * stack overflow on pathological specs.
 *
 * Mutates `doc` in place. `doc` is private to `parseOpenApiSpec`.
 */
function dereferenceDoc(doc: any): void {
  function dereferenceNode(node: any, current: any, visited: Set<string>, depth: number): any {
    if (node === null || typeof node !== 'object') {
      return node;
    }

    // Defensive guard against deep recursion blowing the JS call stack.
    if (depth > 100) {
      logger.warn(`Max dereference depth (100) exceeded at "${node.$ref ?? '<root>'}" — stop resolving`);
      return node;
    }

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        node[i] = dereferenceNode(node[i], current, visited, depth + 1);
      }
      return node;
    }

    if (node.$ref) {
      // Circular ref on current resolution path — stop, leave the stub.
      if (visited.has(node.$ref)) {
        logger.warn(`Circular $ref "${node.$ref}" — stop resolving`);
        return node;
      }

      // External ref (non-#/): leave stub. The existing call sites call
      // resolveRef, which warns about unsupported external refs. Do NOT
      // warn here — avoids double-warning.
      if (!node.$ref.startsWith('#/')) {
        return node;
      }

      visited.add(node.$ref);
      const target = resolveRef(node.$ref, current);
      if (target === undefined) {
        // resolveRef already warned (external ref or broken path). Leave stub.
        visited.delete(node.$ref);
        return node;
      }
      const resolved = dereferenceNode(target, current, visited, depth + 1);
      visited.delete(node.$ref);
      return resolved;
    }

    for (const [key, value] of Object.entries(node)) {
      node[key] = dereferenceNode(value, current, visited, depth + 1);
    }
    return node;
  }

  dereferenceNode(doc, doc, new Set(), 0);
}

/**
 * Parse an OpenAPI 3.x JSON spec into a `ParseResult` with `ParsedRequest[]`
 * and `FileVariable[]`. Uses manual JSON parsing with zero external dependencies.
 *
 * Unsupported features (external $ref, OAuth2, webhooks, Swagger 2.0) are
 * logged as warnings to stderr and skipped.
 */
export function parseOpenApiSpec(content: string): ParseResult {
  let doc: any;

  try {
    doc = JSON.parse(content);
  } catch {
    throw new Error('Failed to parse OpenAPI spec: invalid JSON');
  }

  const variables: FileVariable[] = [];
  const requests: ParsedRequest[] = [];

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    variables.push({ name: 'baseUrl', value: '' });
    return { requests, variables };
  }

  if (doc.swagger && !doc.openapi) {
    logger.warn('Swagger 2.0 specs are not supported — returning empty results');
    variables.push({ name: 'baseUrl', value: '' });
    return { requests, variables };
  }

  dereferenceDoc(doc);

  const { url: baseUrl, templateVars } = extractBaseUrl(doc);
  variables.push({ name: 'baseUrl', value: baseUrl });
  variables.push(...templateVars);

  if (!doc.paths || typeof doc.paths !== 'object' || Array.isArray(doc.paths)) {
    return { requests, variables };
  }

  let lineNumber = 0;

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    for (const [methodKey, operation] of Object.entries(pathItem)) {
      if (NON_METHOD_PATH_KEYS.has(methodKey)) {
        continue;
      }

      const method = methodKey.toUpperCase();

      if (KNOWN_UNSUPPORTED_METHODS.has(method)) {
        logger.warn(`Unsupported HTTP method "${method}" on path "${path}" — skipped`);
        continue;
      }

      if (!isSupportedMethod(method)) {
        continue;
      }

      if (!operation || typeof operation !== 'object') {
        continue;
      }

      lineNumber += 1;

      const request = buildRequest(
        method,
        path,
        pathItem,
        operation,
        doc,
        lineNumber,
        variables,
      );

      requests.push(request);
    }
  }

  const deduped = deduplicate(variables);
  return { requests, variables: deduped };
}
