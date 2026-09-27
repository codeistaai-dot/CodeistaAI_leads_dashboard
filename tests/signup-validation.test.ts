import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SignupSchema,
  normalizeIndiaPhone,
  isValidUnicodeName,
  hasValidAttribution,
} from '../server/validators/user.validator';

describe('Landing Page & Signup Validation Protections', () => {
  it('should normalize Indian phone numbers properly', () => {
    assert.equal(normalizeIndiaPhone('+91 98765 43210'), '9876543210');
    assert.equal(normalizeIndiaPhone('919876543210'), '9876543210');
    assert.equal(normalizeIndiaPhone('09876543210'), '9876543210');
    assert.equal(normalizeIndiaPhone('9876543210'), '9876543210');
  });

  it('should validate unicode names', () => {
    assert.equal(isValidUnicodeName('Aarav Sharma'), true);
    assert.equal(isValidUnicodeName('Renée O’Connor'), true);
    assert.equal(isValidUnicodeName('A'), false); // too short
    assert.equal(isValidUnicodeName('12345'), false); // no letters
  });

  it('should detect valid UTM attribution presence', () => {
    assert.equal(hasValidAttribution({ utm_source: 'google' }), true);
    assert.equal(hasValidAttribution({ gclid: 'test_gclid_123' }), true);
    assert.equal(hasValidAttribution({}), false);
    assert.equal(hasValidAttribution({ utm_source: '   ' }), false);
  });

  it('should validate complete signup payload and reject invalid ones', () => {
    const valid = {
      name: 'Aditi Rao',
      email: 'aditi@example.com',
      phone: '9876543210',
      pythonStartingPoint: 'new',
      message: 'Interested in Python course',
    };
    const res = SignupSchema.safeParse(valid);
    assert.equal(res.success, true);

    const invalidPhone = {
      ...valid,
      phone: '1234567890', // invalid initial digit for Indian mobile
    };
    const invalidRes = SignupSchema.safeParse(invalidPhone);
    assert.equal(invalidRes.success, false);
  });
});
