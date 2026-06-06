export interface TreeOptions {
  /** Maximum depth to display */
  maxDepth: number;
  /** Show only directories, skip files */
  dirsOnly: boolean;
  /** Additional patterns to exclude */
  exclude: string[];
  /** Maximum number of items to show per directory before truncating */
  maxFiles: number;
  /** Output file path (undefined = stdout) */
  output?: string;
  /** Target directory to visualize */
  targetDir: string;
}

export interface TreeNode {
  name: string;
  isDirectory: boolean;
  children: TreeNode[];
  truncated: number;
}

export interface RenderContext {
  prefix: string;
  isLast: boolean;
  depth: number;
}
