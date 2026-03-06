const maskEmail  = (email)  => email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(b.length) + c);
const maskName   = (name)   => name[0] + '*'.repeat(name.length - 1);
const maskToken  = (token)  => token.slice(0, 6) + '...' + token.slice(-4);

function maskUser(user) {
  if (!user) return user;
  return {
    ...user,
    email:    user.email    ? maskEmail(user.email)   : undefined,
    name:     user.name     ? maskName(user.name)     : undefined,
    password: undefined
  };
}

module.exports = { maskEmail, maskName, maskToken, maskUser };
