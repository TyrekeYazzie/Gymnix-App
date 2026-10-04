import { validateName, validatePassword, validateEmail, sanitizeInput } from '@/utils/validation';

describe('validateName', () => {
  it('accepts real names from any language', () => {
    for (const name of ["José O'Brien", 'Mary-Jane', 'Zoë', 'Nguyễn Văn An', '李小龍', 'Martin Luther King Jr.']) {
      expect(validateName(name)).toEqual({ isValid: true });
    }
  });

  it('rejects markup, emoji, symbols and very long names', () => {
    for (const name of ['<script>', '😀', '@admin', '-dash', 'a'.repeat(51), '   ']) {
      expect(validateName(name).isValid).toBe(false);
    }
  });
});

describe('validatePassword', () => {
  it('needs 8+ characters, an uppercase letter, a number and a symbol', () => {
    expect(validatePassword('Abcdef1!').isValid).toBe(true);
    expect(validatePassword('abcdefgh').errors).toHaveLength(3);
    expect(validatePassword('Ab1!').errors).toEqual(['Password must be at least 8 characters long']);
  });
});

describe('validateEmail', () => {
  it('accepts normal addresses and rejects junk', () => {
    expect(validateEmail('someone@example.com').isValid).toBe(true);
    expect(validateEmail('not-an-email').isValid).toBe(false);
    expect(validateEmail('').isValid).toBe(false);
  });
});

describe('sanitizeInput', () => {
  it('trims and strips tags and brackets', () => {
    expect(sanitizeInput('  <b>Hi</b> [x] ')).toBe('Hi x');
  });
});
