# Quapp 🧪

**Quapp** is a developer-friendly CLI tool to scaffold front-end projects (React, Angular, etc.), configure them instantly, and serve them over LAN with a shareable QR code.

---

## 🚀 Features

- ⚡ Create projects with ease  
- 📱 Serve locally and share via LAN QR code  
- 📦 Adds useful scripts automatically to `package.json`  
- 📁 Lightweight and extensible project setup  

---

## 📦 Installation

```bash
npm create quapp

```
## 🔧 Usage

Follow the prompts to:

Select your framework (React, Angular, etc.)

Initialize your project

Auto-setup a local server with LAN access

## 🏁 CLI Flags

Quapp supports the following command-line flags to customize project generation and dev behavior:

| Flag              | Type      | Description                                                                 |
|-------------------|-----------|-----------------------------------------------------------------------------|
| `--framework`     | `string`  | Specify the framework (`react`, `react-ts`, `vue`, `angular`, etc.)        |
| `--name`          | `string`  | Set a custom name for your project directory                               |
| `--force`          | `boolean`  | Set to Overwrite the Folder or Not
| `--no-color`          | `boolean`  | sets the terminal to use no colors while creating the Template file
| `--git`          | `boolean`  | initialize Git repository

---

### Example

```bash

npm create quapp my-app --template react-ts+swc --git --install --force --no-color