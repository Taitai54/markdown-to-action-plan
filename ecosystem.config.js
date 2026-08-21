module.exports = {
  apps: [
    {
      name: 'markdown-action-plan',
      script: 'npm',
      args: 'run start:headless',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production'
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log'
    }
  ]
}
