import { test, before, after, describe } from "node:test";
import * as assert from "node:assert";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { generateTree, TreeOptions } from "../src/index";

describe("Tree Generation Tests", () => {
  let testDir: string;
  let fileA: string;
  let fileB: string;
  let subDir: string;
  let fileC: string;
  let fixedMtime: Date;

  function createTestStructure(): void {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "wje29-test-"));
    fixedMtime = new Date("2025-01-15T10:30:00Z");

    fileA = path.join(testDir, "file-a.txt");
    fs.writeFileSync(fileA, "Hello World");
    fs.utimesSync(fileA, fixedMtime, fixedMtime);

    fileB = path.join(testDir, "file-b.log");
    fs.writeFileSync(fileB, "x".repeat(2048));
    fs.utimesSync(fileB, fixedMtime, fixedMtime);

    subDir = path.join(testDir, "subdir");
    fs.mkdirSync(subDir);
    fs.utimesSync(subDir, fixedMtime, fixedMtime);

    fileC = path.join(subDir, "file-c.json");
    fs.writeFileSync(fileC, '{"key": "value"}');
    fs.utimesSync(fileC, fixedMtime, fixedMtime);
  }

  function cleanupTestStructure(): void {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }

  function buildOptions(overrides: Partial<TreeOptions> = {}): TreeOptions {
    return {
      targetDir: testDir,
      maxDepth: Infinity,
      dirsOnly: false,
      exclude: [],
      maxFiles: 50,
      showSize: false,
      showTime: false,
      ...overrides,
    };
  }

  function stripAnsi(str: string): string {
    return str.replace(/\x1B\[[0-9;]*m/g, "");
  }

  before(() => {
    createTestStructure();
  });

  after(() => {
    cleanupTestStructure();
  });

  test("默认输出不带大小和时间", () => {
    const options = buildOptions();
    const output = generateTree(options);
    const clean = stripAnsi(output);

    assert.match(clean, /📁 .*test.*/);
    assert.match(clean, /📄 file-a\.txt$/m);
    assert.match(clean, /📄 file-b\.log$/m);
    assert.match(clean, /📁 subdir$/m);
    assert.match(clean, /📄 file-c\.json$/m);

    assert.doesNotMatch(clean, /\d+(\.\d+)?\s+(B|KB|MB|GB|TB)/);
    assert.doesNotMatch(clean, /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/);
  });

  test("开启 showSize 后显示文件大小", () => {
    const options = buildOptions({ showSize: true });
    const output = generateTree(options);
    const clean = stripAnsi(output);

    assert.match(clean, /file-a\.txt.*11\s+B/);
    assert.match(clean, /file-b\.log.*2\.0\s+KB/);
    assert.match(clean, /file-c\.json.*16\s+B/);
    assert.match(clean, /subdir.*\d+\s+B/);
  });

  test("开启 showTime 后显示修改时间", () => {
    const options = buildOptions({ showTime: true });
    const output = generateTree(options);
    const clean = stripAnsi(output);

    const expectedDate = "2025-01-15";
    const expectedTime = "10:30";

    const matches = clean.match(/2025-01-15\s+10:30/g);
    assert.ok(matches && matches.length >= 4, `Expected at least 4 time entries, got ${matches?.length || 0}`);

    assert.match(clean, new RegExp(`file-a\\.txt.*${expectedDate}\\s+${expectedTime}`));
    assert.match(clean, new RegExp(`file-b\\.log.*${expectedDate}\\s+${expectedTime}`));
    assert.match(clean, new RegExp(`file-c\\.json.*${expectedDate}\\s+${expectedTime}`));
    assert.match(clean, new RegExp(`subdir.*${expectedDate}\\s+${expectedTime}`));
  });

  test("同时开启 showSize 和 showTime 后都显示", () => {
    const options = buildOptions({ showSize: true, showTime: true });
    const output = generateTree(options);
    const clean = stripAnsi(output);

    assert.match(clean, /file-a\.txt.*11\s+B.*2025-01-15\s+10:30/);
    assert.match(clean, /file-b\.log.*2\.0\s+KB.*2025-01-15\s+10:30/);
    assert.match(clean, /file-c\.json.*16\s+B.*2025-01-15\s+10:30/);
    assert.match(clean, /subdir.*\d+\s+B.*2025-01-15\s+10:30/);
  });

  test("目录和文件节点都能正确渲染", () => {
    const options = buildOptions({ showSize: true, showTime: true });
    const output = generateTree(options);
    const clean = stripAnsi(output);

    const lines = clean.split("\n");
    const rootLine = lines[0];
    assert.match(rootLine, /^📁 /);
    assert.match(rootLine, /\d+\s+B/);
    assert.match(rootLine, /2025-01-15\s+10:30/);

    const fileLines = lines.filter(l => l.includes("📄"));
    assert.ok(fileLines.length >= 3, `Expected at least 3 file lines, got ${fileLines.length}`);

    for (const line of fileLines) {
      assert.match(line, /📄 \S+/);
      assert.match(line, /\d+(\.\d+)?\s+(B|KB)/);
      assert.match(line, /2025-01-15\s+10:30/);
    }

    const dirLines = lines.filter(l => l.includes("📁"));
    assert.ok(dirLines.length >= 2, `Expected at least 2 directory lines, got ${dirLines.length}`);

    for (const line of dirLines) {
      assert.match(line, /📁 \S+/);
      assert.match(line, /\d+\s+B/);
      assert.match(line, /2025-01-15\s+10:30/);
    }
  });

  test("仅开启 showSize 时不显示时间", () => {
    const options = buildOptions({ showSize: true });
    const output = generateTree(options);
    const clean = stripAnsi(output);

    assert.match(clean, /11\s+B/);
    assert.doesNotMatch(clean, /\d{4}-\d{2}-\d{2}/);
  });

  test("仅开启 showTime 时不显示大小", () => {
    const options = buildOptions({ showTime: true });
    const output = generateTree(options);
    const clean = stripAnsi(output);

    assert.match(clean, /2025-01-15/);
    assert.doesNotMatch(clean, /\d+\s+(B|KB|MB|GB|TB)/);
  });

  test("大小格式化正确处理不同单位", () => {
    const bigFile = path.join(testDir, "big-file.dat");
    const content = Buffer.alloc(1024 * 1024 * 3, "x");
    fs.writeFileSync(bigFile, content);
    fs.utimesSync(bigFile, fixedMtime, fixedMtime);

    const options = buildOptions({ showSize: true });
    const output = generateTree(options);
    const clean = stripAnsi(output);

    assert.match(clean, /big-file\.dat.*3\.0\s+MB/);

    fs.rmSync(bigFile);
  });

  test("缩进和树形结构正确", () => {
    const options = buildOptions();
    const output = generateTree(options);
    const clean = stripAnsi(output);

    assert.match(clean, /├── 📄 file-a\.txt/);
    assert.match(clean, /├── 📄 file-b\.log/);
    assert.match(clean, /└── 📁 subdir/);
    assert.match(clean, /│   /);
    assert.match(clean, /└── 📄 file-c\.json/);

    const subdirFileLine = clean.split("\n").find(l => l.includes("file-c.json"));
    assert.ok(subdirFileLine, "Should find file-c.json line");
    assert.ok(subdirFileLine.startsWith("    ") || subdirFileLine.includes("    └──"), 
      "Subdir file should be indented");
  });
});
