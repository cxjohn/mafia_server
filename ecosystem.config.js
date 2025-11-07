const os = require("os");

module.exports = {
  apps: [
    {
      name: "colyseus-app",
      script: "lib/index.js",
      time: true,
      watch: false,
      instances: os.cpus().length,
      exec_mode: "fork",
      wait_ready: true,
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
  deploy: {
    production: {
      user: "deploy",
      host: ["149.28.229.164"],
      ref: "origin/master",
      repo: "git@github.com:cxjohn/mafia_server.git",
      path: "/home/deploy",
      "post-deploy":
        "npm install && npm run build && pm2 startOrRestart ecosystem.config.js --env production",
    },
  },
};
