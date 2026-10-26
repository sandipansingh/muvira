function configureTestEnvironment() {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '4000',
    LOG_LEVEL: 'fatal',
    SUPABASE_URL: process.env.SUPABASE_TEST_URL ?? 'https://example.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_TEST_ANON_KEY ?? 'test-anon-key-value',
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? 'test-service-role-key-value',
    RAZORPAY_KEY_ID: 'rzp_test_example',
    RAZORPAY_KEY_SECRET: 'test-secret',
    RAZORPAY_WEBHOOK_SECRET: 'test-webhook-secret',
    ALLOWED_ORIGINS: 'http://localhost:5173',
    EMAIL_FROM: 'orders@example.com',
    SHIPROCKET_EMAIL: 'shipping@example.com',
    SHIPROCKET_PASSWORD: 'test-password',
    SHIPROCKET_WEBHOOK_ENABLED: 'false',
    CACHE_ENABLED: 'false',
  })
}
module.exports = { configureTestEnvironment }
