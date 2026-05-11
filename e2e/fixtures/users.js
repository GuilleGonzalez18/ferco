export const adminUser = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@ferco.com',
  password: process.env.E2E_ADMIN_PASSWORD || 'changeme123',
};

export const invalidUser = {
  email: 'noexiste@ferco.com',
  password: 'wrongpassword',
};
