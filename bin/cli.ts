#!/usr/bin/env node

import { Command } from "commander";
import * as path from "path";
import { generateTree, saveOutput, TreeOptions } from "../src/index";

const program = new Command();

program
  .name("wje-29")
  .description("Directory tree visualization CLI tool")
  .version("1.0.0")
  .argument("[directory]", "Target directory to visualize", ".")
  .option("-d, --depth <number>", "Maximum depth to display", "Infinity")
  .option("-L, --level <number>", "Maximum depth to display (alias for --depth)")
  .option("--dirs-only", "Show only directories, skip files", false)
  .option(
    "-e, --exclude <patterns...>",
    "Additional patterns to exclude (supports wildcards * and ?)"
  )
  .option("-m, --max-files <number>", "Max items per directory before truncating", "50")
  .option("-o, --output <file>", "Save output to file instead of stdout")
  .action((directory: string, options: Record<string, any>) => {
    const targetDir = path.resolve(directory);

    let maxDepth: number;
    const depthValue = options.level ?? options.depth;
    if (depthValue === "Infinity") {
      maxDepth = Infinity;
    } else {
      maxDepth = parseInt(depthValue, 10);
      if (isNaN(maxDepth) || maxDepth < 0) {
        console.error("Error: depth/level must be a non-negative number");
        process.exit(1);
      }
    }

    const maxFiles = parseInt(options.maxFiles, 10);
    if (isNaN(maxFiles) || maxFiles < 1) {
      console.error("Error: max-files must be a positive number");
      process.exit(1);
    }

    const treeOptions: TreeOptions = {
      targetDir,
      maxDepth,
      dirsOnly: options.dirsOnly ?? false,
      exclude: options.exclude ?? [],
      maxFiles,
      output: options.output,
    };

    try {
      const output = generateTree(treeOptions);
      if (treeOptions.output) {
        saveOutput(output, path.resolve(treeOptions.output));
        console.log(`Tree saved to ${treeOptions.output}`);
      } else {
        console.log(output);
      }
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
