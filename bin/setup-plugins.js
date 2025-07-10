const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pluginsDir = path.join(__dirname, '../plugins');

fs.readdirSync(pluginsDir).forEach(pluginName => {
  const pluginPath = path.join(pluginsDir, pluginName);
  const packageJsonPath = path.join(pluginPath, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    console.log(`Installing dependencies for plugin: ${pluginName}`);
    try {
      execSync('npm install', { cwd: pluginPath, stdio: 'inherit' });
    } catch (error) {
      console.error(`Failed to install dependencies for plugin: ${pluginName}`, error);
    }
  }
});

console.log('Plugin dependencies installation complete.');