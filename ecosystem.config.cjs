module.exports = {
  apps: [
    {
      name: 'backend.shifaul.dev',
      script: 'pnpm',
      args: 'start',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
