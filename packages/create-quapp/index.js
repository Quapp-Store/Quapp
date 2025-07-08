#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const degit = (await import('degit')).default;
const prompts = (await import('prompts')).default;

// ========== Terminal Colors ==========
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;
const boldBlue = (text) => `\x1b[1m\x1b[34m${text}\x1b[0m`;

const colorize = (text, fn) => (process.argv.includes('--no-color') ? text : fn(text));

// ========== Escape + Ctrl+C Handling ==========
function setupEscapeHandler() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', handleKeyPress);
  }
}

function handleKeyPress(key) {
  if (key.toString() === '\u001b') {
    cleanupInput();
    console.log(red('\n  Setup canceled (Escape).\n'));
    process.exit(0);
  }
}

function cleanupInput() {
  if (process.stdin.isTTY && process.stdin.isRaw) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
  process.stdin.removeListener('data', handleKeyPress);
}

process.on('SIGINT', () => {
  cleanupInput();
  console.log(red('\n  Setup canceled (Ctrl+C).\n'));
  process.exit(0);
});

// ========== Helper Functions ==========
function isGitAvailable() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function copyRecursiveSync(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    for (const file of fs.readdirSync(src)) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      copyRecursiveSync(srcPath, destPath);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// ========== Script Starts Here ==========
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
let providedName = args[0];
let templateFlagIndex = args.indexOf('--template');
let templateArg = templateFlagIndex !== -1 ? args[templateFlagIndex + 1] : null;

const force = args.includes('--force');
const autoGit = args.includes('--git');
const autoInstall = args.includes('--install');

setupEscapeHandler();

// ========== Ask Project Name ==========
const askProjectName = async () => {
  if (providedName) return providedName;
  console.log('\n' + boldBlue('  Welcome to Quapp Setup!\n'));
  const response = await prompts({
    type: 'text',
    name: 'projectName',
    message: colorize('  Enter Project Name:', yellow),
    validate: (name) => (name.trim() === '' ? 'Project name is required' : true),
  });
  if (!response.projectName) {
    console.log(red('  Project name is required. Exiting...'));
    cleanupInput();
    process.exit(0);
  }
  return response.projectName.trim();
};

// ========== Main Async Flow ==========
try {
  const projectName = await askProjectName();

  const allTemplates = {
    react: ['react', 'react-ts', 'react+swc', 'react-ts+swc'],
    vue: ['vue', 'vue-ts'],
    vanilla: ['vanilla-js', 'vanilla-ts'],
  };

  // Ask for framework + template
  if (!templateArg || !Object.values(allTemplates).flat().includes(templateArg)) {
    const { framework } = await prompts({
      type: 'select',
      name: 'framework',
      message: 'Choose a framework:',
      choices: [
        { title: 'React', value: 'react' },
        { title: 'Vue', value: 'vue' },
        { title: 'Vanilla', value: 'vanilla' },
      ],
    });

    if (!framework) {
      console.log(red('\n  Setup canceled.\n'));
      process.exit(0);
    }

    const { template } = await prompts({
      type: 'select',
      name: 'template',
      message: `Choose a ${framework} template:`,
      choices: allTemplates[framework].map((item) => ({ title: item, value: item })),
    });

    if (!template) {
      console.log(red('\n  Setup canceled.\n'));
      process.exit(0);
    }

    templateArg = template;
  }

  console.log('\n' + colorize('  Creating a new Quapp project...\n', green));
  const projectDir = path.join(process.cwd(), projectName);
  const templateRepo = `Quapp-Store/Quapp/packages/templates/${templateArg}`;

  // ========== Template Cloning ==========
  try {
    const emitter = degit(templateRepo, { cache: false, force });
    await emitter.clone(projectDir);
  } catch (err) {
    console.error(red('  Error creating project:'), err.message);
    process.exit(1);
  }

  // ========== Update package.json ==========
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = projectName;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } else {
    console.error(red('  package.json not found!'));
    process.exit(1);
  }

  // ========== Git Setup ==========
  let gitInit = autoGit;
  if (!autoGit) {
    const gitMessage = isGitAvailable()
      ? 'Do you want to initialize a Git repository?'
      : 'Git is not installed. Skipping Git setup.';
    const gitResponse = await prompts({
      type: isGitAvailable() ? 'confirm' : null,
      name: 'gitInit',
      message: gitMessage,
      initial: false,
    });
    gitInit = isGitAvailable() && gitResponse.gitInit;
  }

  if (gitInit) {
    try {
      execSync('git init', { cwd: projectDir });
      console.log(blue('  Initialized empty Git repository.'));
    } catch {
      console.log(red('  Failed to initialize Git repository.'));
    }
  } else if (!isGitAvailable()) {
    console.log(yellow('  Git is not installed. Skipping Git initialization.'));
  }

  // ========== Dependency Install ==========
  let doInstall = autoInstall;
  if (!autoInstall) {
    const installResponse = await prompts({
      type: 'confirm',
      name: 'install',
      message: 'Do you want to install dependencies?',
    });
    doInstall = installResponse.install;
  }

  if (doInstall) {
    console.log(blue('  Installing dependencies...\n'));
    try {
      execSync('npm install', { cwd: projectDir, stdio: 'inherit' });
      execSync('npm install qrcode-terminal', { cwd: projectDir, stdio: 'ignore' });
    } catch {
      console.log(red('  Dependency installation failed. Please run it manually.'));
    }
  }

  // ========== Done ==========
  console.log('\n' + yellow(`Now run the following commands:\n`));
  console.log(boldBlue(`  cd ${projectName}`));
  if (!doInstall) console.log(boldBlue('  npm install'));
  console.log(boldBlue('  npm run dev\n'));

  cleanupInput();
  setTimeout(() => process.exit(0), 100);
} catch (err) {
  cleanupInput();
  console.error(red('  Unexpected error:'), err);
  process.exit(1);
}
