# wje-29

A CLI tool for directory tree visualization with customizable depth, filtering, and output options.

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic usage

```bash
# Show current directory tree
npx wje-29

# Show a specific directory
npx wje-29 /path/to/directory
```

### Limit depth

```bash
# Show only top 3 levels
npx wje-29 -d 3
npx wje-29 -L 3
```

### Directories only

```bash
# Skip files, show directories only
npx wje-29 --dirs-only
```

### Exclude patterns

```bash
# Exclude specific files or directories
npx wje-29 -e "*.log" "temp" "cache"
```

### Limit items per directory

```bash
# Show max 20 items per directory before truncating
npx wje-29 -m 20
```

### Save to file

```bash
# Save output to a file instead of stdout
npx wje-29 -o tree.txt
```

### Combined example

```bash
npx wje-29 ./src -d 2 --dirs-only -e "*.test.ts" -o structure.txt
```

## Options

| Option | Description |
|--------|-------------|
| `-d, --depth <number>` | Maximum depth to display |
| `-L, --level <number>` | Alias for `--depth` |
| `--dirs-only` | Show only directories, skip files |
| `-e, --exclude <patterns...>` | Additional patterns to exclude (supports `*` and `?` wildcards) |
| `-m, --max-files <number>` | Max items per directory before truncating (default: 50) |
| `-o, --output <file>` | Save output to file instead of stdout |
| `-h, --help` | Display help |
| `-V, --version` | Display version |

## Default Exclusions

The following directories are excluded by default:

- `node_modules`
- `.git`
- `.DS_Store`
- `.vscode`
- `.idea`
- `dist`
- `build`
- `coverage`
- `.next`
- `.nuxt`

## License

MIT
