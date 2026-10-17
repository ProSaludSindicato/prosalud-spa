import { describe, expect, it } from 'vitest';
import { sanitizeExternalUrl } from '../safeUrl';

describe('sanitizeExternalUrl', () => {
  it('permite http y https', () => {
    expect(sanitizeExternalUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(sanitizeExternalUrl('http://example.com/')).toBe('http://example.com/');
  });

  it('descarta esquemas peligrosos', () => {
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeExternalUrl('  JavaScript:alert(1)')).toBeUndefined();
    expect(sanitizeExternalUrl('data:text/html,<script>1</script>')).toBeUndefined();
  });

  it('maneja vacíos', () => {
    expect(sanitizeExternalUrl('')).toBeUndefined();
    expect(sanitizeExternalUrl(null)).toBeUndefined();
    expect(sanitizeExternalUrl(undefined)).toBeUndefined();
  });
});
