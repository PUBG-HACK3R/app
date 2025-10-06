module.exports = {
  apps: [{
    name: 'deposit-listener',
    script: 'standalone-deposit-listener.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      LISTENER_INTERVAL_MS: '30000'
    },
    env_production: {
      NODE_ENV: 'production',
      LISTENER_INTERVAL_MS: '30000'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
