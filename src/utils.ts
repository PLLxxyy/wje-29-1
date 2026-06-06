import * as fs from "fs";
import * as path from "path";
import { TreeNode, TreeOptions } from "./types";

const DEFAULT_EXCLUDES = new Set([
  "node_modules",
  ".git",
  ".DS_Store",
  ".vscode",
  ".idea",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
]);

export function shouldExclude(
  name: string,
  fullPath: string,
  options: TreeOptions
): boolean {
  if (DEFAULT_EXCLUDES.has(name)) return true;
  for (const pattern of options.exclude) {
    if (name === pattern) return true;
    if (pattern.includes("*") || pattern.includes("?")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
      );
      if (regex.test(name)) return true;
    }
  }
  return false;
}

export function buildTree(
  dirPath: string,
  options: TreeOptions,
  currentDepth: number = 0
): TreeNode | null {
  const stats = fs.statSync(dirPath);
  const name = path.basename(dirPath);

  if (!stats.isDirectory()) {
    return {
      name,
      isDirectory: false,
      children: [],
      truncated: 0,
      size: stats.size,
      mtime: stats.mtime,
    };
  }

  const node: TreeNode = {
    name,
    isDirectory: true,
    children: [],
    truncated: 0,
    size: stats.size,
    mtime: stats.mtime,
  };

  if (currentDepth >= options.maxDepth) {
    return node;
  }

  let entries: string[];
  try {
    entries = fs.readdirSync(dirPath);
  } catch {
    return node;
  }

  const filtered: { name: string; fullPath: string; isDir: boolean; stat: fs.Stats }[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    if (shouldExclude(entry, fullPath, options)) continue;

    let entryStat: fs.Stats;
    try {
      entryStat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    if (options.dirsOnly && !entryStat.isDirectory()) continue;

    filtered.push({
      name: entry,
      fullPath,
      isDir: entryStat.isDirectory(),
      stat: entryStat,
    });
  }

  filtered.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  let visible = filtered;
  if (filtered.length > options.maxFiles) {
    visible = filtered.slice(0, options.maxFiles);
    node.truncated = filtered.length - options.maxFiles;
  }

  for (const item of visible) {
    if (item.isDir) {
      const child = buildTree(item.fullPath, options, currentDepth + 1);
      if (child) node.children.push(child);
    } else {
      node.children.push({
        name: item.name,
        isDirectory: false,
        children: [],
        truncated: 0,
        size: item.stat.size,
        mtime: item.stat.mtime,
      });
    }
  }

  return node;
}
