module.exports = {
  apps: [
    {
      name: 'tiu-bot',
      script: 'dist/app.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production' },
      error_file: 'logs/bot-error.log',
      out_file: 'logs/bot-out.log',
      time: true,
    },
    {
      name: 'tiu-worker',
      script: 'dist/worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production' },
      error_file: 'logs/worker-error.log',
      out_file: 'logs/worker-out.log',
      time: true,
    },
  ],
};
