module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'dist/main.js',
      exec_mode: 'cluster',
      instances: 2,
      max_memory_restart: '400M',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
