const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionFilePath = path.join(__dirname, '..', 'lib', 'version.ts');
const packageLockPath = path.join(__dirname, '..', 'package-lock.json');

const bumpType = process.argv[2] || 'patch';

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const currentVersion = pkg.version || '1.0.0';

let [major, minor, patch] = currentVersion.split('.').map((num) => parseInt(num, 10) || 0);

if (bumpType === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (bumpType === 'minor') {
  minor += 1;
  patch = 0;
} else if (bumpType === 'patch') {
  patch += 1;
} else if (/^\d+\.\d+\.\d+$/.test(bumpType)) {
  const parts = bumpType.split('.').map((n) => parseInt(n, 10));
  major = parts[0];
  minor = parts[1];
  patch = parts[2];
} else {
  console.error(`Invalid argument: ${bumpType}. Use patch, minor, major or a version like 1.2.3`);
  process.exit(1);
}

const newVersion = `${major}.${minor}.${patch}`;
const today = new Date().toISOString().split('T')[0];

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

// Update package-lock.json if present
if (fs.existsSync(packageLockPath)) {
  try {
    const lock = JSON.parse(fs.readFileSync(packageLockPath, 'utf-8'));
    lock.version = newVersion;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = newVersion;
    }
    fs.writeFileSync(packageLockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.warn('Could not update package-lock.json:', err.message);
  }
}

// Update lib/version.ts
const versionFileContent = `export const APP_VERSION = '${newVersion}';\nexport const RELEASE_DATE = '${today}';\n`;
fs.writeFileSync(versionFilePath, versionFileContent, 'utf-8');

console.log(`Version bumped: ${currentVersion} -> ${newVersion} (${today})`);
