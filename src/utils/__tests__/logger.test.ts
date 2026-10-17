import { describe, expect, it, vi } from 'vitest';

describe('logger', () => {
  it('enmascara claves sensibles', async () => {
    const spy = vi.spyOn(globalThis.console, 'debug').mockImplementation(() => {});
    // El logger enlaza console.* al importarse: se importa después de espiar
    const { logger } = await import('../logger');
    logger.debug('test', { documento: '123', numero_cuenta: '999', status: 200 });
    const printed = JSON.stringify(spy.mock.calls);
    spy.mockRestore();
    expect(printed).not.toContain('123');
    expect(printed).not.toContain('999');
    expect(printed).toContain('[REDACTED]');
    expect(printed).toContain('200');
  });
});
