export const adminUser = {
  email: process.env.E2E_ADMIN_EMAIL || 'e2e-admin@mercatus.com',
  password: process.env.E2E_ADMIN_PASSWORD || 'TestPass123!',
};

export const invalidUser = {
  email: 'noexiste@mercatus.com',
  password: 'wrongpassword',
};
