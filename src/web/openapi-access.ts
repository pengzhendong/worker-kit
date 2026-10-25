import type { OpenAPIV3_1 as O } from 'openapi-types';

/** Describe the declared scheme; documentation never grants access by itself. */
export function authenticationLabel(document: O.Document, operation: O.OperationObject & { 'x-authentication-label'?: string }) {
  if (operation['x-authentication-label']) return operation['x-authentication-label'];
  const requirements = operation.security ?? document.security ?? [];
  if (!requirements.length) return '公开';
  return requirements.map((requirement) => {
    const names = Object.keys(requirement);
    if (!names.length) return '公开';
    return names.map((name) => {
      const scheme = document.components?.securitySchemes?.[name];
      if (!scheme || '$ref' in scheme) return name;
      if (scheme.type === 'http') return scheme.scheme.toLowerCase() === 'bearer' ? 'Token' : scheme.scheme.toLowerCase() === 'basic' ? 'Basic' : scheme.scheme;
      if (scheme.type === 'apiKey') return scheme.in === 'cookie' ? 'Cookie' : scheme.name;
      return scheme.type === 'oauth2' ? 'OAuth 2.0' : scheme.type === 'openIdConnect' ? 'OpenID Connect' : name;
    }).join(' + ');
  }).join(' / ');
}
