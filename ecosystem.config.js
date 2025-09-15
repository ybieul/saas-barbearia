module.exports = {
  apps: [{
    name: 'saas-barbearia',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/saas-barbearia',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/saas-barbearia-error.log',
    out_file: '/var/log/pm2/saas-barbearia-out.log',
    log_file: '/var/log/pm2/saas-barbearia.log'
  }]
}
