# TyShell

A web-based Linux terminal emulator built with TypeScript.

## Features

- Terminal interface with command prompt and history
- Virtual file system with files and folders
- Unix commands (ls, cd, pwd, mkdir, rmdir, touch, cat, echo, grep, find)
- Command history navigation
- Tab completion for commands and file paths
- File operations in virtual filesystem

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Ether-G/tyshell.git
cd tyshell
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3000`

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project
- `npm start` - Start the production server
- `npm test` - Run tests

## Project Structure

```
tyshell/
├── src/
│   ├── server/         # Backend server code
│   ├── client/         # Frontend TypeScript code
│   ├── filesystem/     # Virtual file system implementation
│   └── commands/       # Command implementations
├── public/            # Static assets
└── dist/             # Compiled output
```

## License

MIT

## Author

Ether-G