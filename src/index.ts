import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { TreeNode, TreeOptions, RenderContext } from "./types";
import { buildTree } from "./utils";

const FOLDER_ICON = "📁";
const FILE_ICON = "📄";
const BRANCH = "├── ";
const LAST_BRANCH = "└── ";
const VERTICAL = "│   ";
const EMPTY = "    ";

function formatSize(bytes?: number): string {
  if (bytes === undefined) return "";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
}

function formatTime(date?: Date): string {
  if (!date) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildNodeSuffix(node: TreeNode, options: TreeOptions): string {
  const parts: string[] = [];
  if (options.showSize === true && node.size !== undefined) {
    parts.push(chalk.gray(formatSize(node.size)));
  }
  if (options.showTime === true && node.mtime) {
    parts.push(chalk.gray(formatTime(node.mtime)));
  }
  return parts.length > 0 ? `  ${parts.join("  ")}` : "";
}

function renderNode(
  node: TreeNode,
  context: RenderContext,
  options: TreeOptions
): string[] {
  const lines: string[] = [];
  const icon = node.isDirectory ? FOLDER_ICON : FILE_ICON;
  const connector = context.isLast ? LAST_BRANCH : BRANCH;
  const suffix = buildNodeSuffix(node, options);
  const line = `${context.prefix}${connector}${icon} ${node.name}${suffix}`;
  lines.push(line);

  if (node.children.length > 0 || node.truncated > 0) {
    const childPrefix = context.prefix + (context.isLast ? EMPTY : VERTICAL);

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const isLastChild = i === node.children.length - 1 && node.truncated === 0;
      lines.push(
        ...renderNode(child, { prefix: childPrefix, isLast: isLastChild, depth: context.depth + 1 }, options)
      );
    }

    if (node.truncated > 0) {
      const truncatedLine = `${childPrefix}${LAST_BRANCH}... and ${node.truncated} more item${node.truncated > 1 ? "s" : ""}`;
      lines.push(chalk.gray(truncatedLine));
    }
  }

  return lines;
}

export function renderTree(node: TreeNode, options: TreeOptions): string {
  const lines: string[] = [];
  const icon = node.isDirectory ? FOLDER_ICON : FILE_ICON;
  const suffix = buildNodeSuffix(node, options);
  lines.push(`${icon} ${node.name}${suffix}`);

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const isLastChild = i === node.children.length - 1 && node.truncated === 0;
    lines.push(
      ...renderNode(child, { prefix: "", isLast: isLastChild, depth: 1 }, options)
    );
  }

  if (node.truncated > 0) {
    lines.push(
      chalk.gray(
        `${LAST_BRANCH}... and ${node.truncated} more item${node.truncated > 1 ? "s" : ""}`
      )
    );
  }

  return lines.join("\n");
}

export function generateTree(options: TreeOptions): string {
  const absolutePath = path.resolve(options.targetDir);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Directory not found: ${absolutePath}`);
  }
  const stat = fs.statSync(absolutePath);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${absolutePath}`);
  }

  const tree = buildTree(absolutePath, options);
  if (!tree) {
    throw new Error(`Failed to build tree for: ${absolutePath}`);
  }
  return renderTree(tree, options);
}

export function saveOutput(content: string, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, content, "utf-8");
}

export { TreeOptions, TreeNode, RenderContext };
