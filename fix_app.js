const fs = require('fs');
const path = require('path');

let appContent = fs.readFileSync(path.join(__dirname, 'mobile', 'App.js'), 'utf8');

// Find the indices
const startStr = '// --- HALAMAN 1: DASHBOARD REALTIME ---';
const endStr = '// --- HALAMAN DUMMY: DATA PERANGKAT ---';

const startIndex = appContent.indexOf(startStr);
const endIndex = appContent.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    appContent = appContent.substring(0, startIndex) + endStr + appContent.substring(endIndex + endStr.length);
}

// Add import for DashboardScreen
if (!appContent.includes("import DashboardScreen")) {
  appContent = appContent.replace("import LoginScreen from './src/screens/LoginScreen';", "import DashboardScreen from './src/screens/DashboardScreen';\nimport LoginScreen from './src/screens/LoginScreen';");
}

fs.writeFileSync(path.join(__dirname, 'mobile', 'App.js'), appContent);
console.log("App.js fixed");
