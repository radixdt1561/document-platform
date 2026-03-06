process.env.JWT_SECRET          = 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

const { generateAccessToken, generateRefreshToken, verifyToken, verifyRefreshToken } =
  require('../../src/utils/jwt');

const mockUser = { id: 42 };

describe('jwt utils', () => {
  it('generates and verifies access token', () => {
    const token   = generateAccessToken(mockUser, 'ADMIN');
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(42);
    expect(decoded.role).toBe('ADMIN');
  });

  it('generates and verifies refresh token', () => {
    const token   = generateRefreshToken(mockUser);
    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe(42);
  });

  it('throws on tampered access token', () => {
    expect(() => verifyToken('bad.token.here')).toThrow();
  });

  it('throws on tampered refresh token', () => {
    expect(() => verifyRefreshToken('bad.token.here')).toThrow();
  });
});
