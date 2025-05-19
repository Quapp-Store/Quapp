#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const degit = (await import('degit')).default;
const prompts = (await import('prompts')).default;

// Terminal Colors
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;
const boldBlue = (text) => `\x1b[1m\x1b[34m${text}\x1b[0m`;

const colorize = (text, fn) => (process.argv.includes('--no-color') ? text : fn(text));

// Ctrl+C handler
process.on('SIGINT', () => {
  cleanupInput();
  console.log(red('\n  Setup canceled (Ctrl+C).\n'));
  process.exit(0);
});

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

// Core fs helper replacements for fs-extra
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
let providedName = args[0];
let templateFlagIndex = args.indexOf('--template');
let templateArg = templateFlagIndex !== -1 ? args[templateFlagIndex + 1] : null;
const force = args.includes('--force');
const noColor = args.includes('--no-color');
const autoGit = args.includes('--git');
const autoInstall = args.includes('--install');

const askProjectName = async () => {
  if (providedName) {
    return providedName;
  }
  console.log('\n');
  console.log(boldBlue('  Welcome to Quapp Setup!'));
  console.log('\n');
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

setupEscapeHandler();

try {
  const projectName = await askProjectName();

  const allTemplates = {
    react: ['react', 'react-ts', 'react+swc', 'react-ts+swc'],
    vue: ['vue', 'vue-ts'],
    vanilla: ['vanilla-js', 'vanilla-ts'],
  };

  console.log('\n');
  if (!templateArg || !Object.values(allTemplates).flat().includes(templateArg)) {
    const frameworkChoice = await prompts({
      type: 'select',
      name: 'framework',
      message: 'Choose a framework:',
      choices: [
        { title: 'React', value: 'react' },
        { title: 'Vue', value: 'vue' },
        { title: 'Vanilla', value: 'vanilla' },
      ],
    });

    if (!frameworkChoice.framework) {
      console.log(red('\n  Setup canceled.\n'));
      process.exit(0);
    }

    console.log('\n');

    const response = await prompts({
      type: 'select',
      name: 'template',
      message: `Choose a ${frameworkChoice.framework} template:`,
      choices: allTemplates[frameworkChoice.framework].map((item) => ({
        title: item,
        value: item,
      })),
    });

    if (!response.template) {
      console.log(red('\n  Setup canceled.\n'));
      process.exit(0);
    }

    templateArg = response.template;
  }

  console.log('\n' + colorize('  Creating a new Quapp project...\n', green));

  const projectDir = path.join(process.cwd(), projectName);
  const templateRepo = `Quapp-Store/Quapp/packages/templates/${templateArg}`;

  try {
    const emitter = degit(templateRepo, { cache: false, force });
    await emitter.clone(projectDir);
  } catch (err) {
    console.error(red('  Error creating project:'), err.message);
    process.exit(1);
  }

  const packageJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = projectName;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } else {
    console.error(red('  package.json not found!'));
    process.exit(1);
  }

  let gitInit = autoGit;
  if (!autoGit) {
    const gitResponse = await prompts({
      type: 'confirm',
      name: 'gitInit',
      message: 'Do you want to initialize a Git repository?',
    });
    gitInit = gitResponse.gitInit;
  }

  if (gitInit) {
    try {
      execSync('git init', { cwd: projectDir });
      console.log(blue('  Initialized empty Git repository.'));
    } catch (err) {
      console.log(yellow('  Git not found. Skipping Git init.'));
    }
  }

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
    } catch (err) {
      console.log(yellow('  NPM not found or installation failed. Please install dependencies manually.'));
    }
  }

  console.log('\n');
  console.log(yellow(`Now run the following commands to start your project:\n\n`));
  console.log(boldBlue(`  cd ${projectName}`));
  if (!doInstall) {
    console.log(boldBlue('  npm install'));
  }
  console.log(boldBlue('  npm run dev\n'));

  cleanupInput();
  setTimeout(() => process.exit(0), 100);
} catch (err) {
  cleanupInput();
  console.error(red('  Unexpected error:'), err);
  process.exit(1);
}
