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
    fixedMtime = new Date(2025, 0, 15, 10, 30, 0);

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

    const lines = clean.split("\n");
    assert.match(lines[0], /^📁 /);

    const fileLines = lines.filter(l => l.includes("📄"));
    const dirLines = lines.filter(l => l.includes("📁"));
    assert.ok(fileLines.length >= 3);
    assert.ok(dirLines.length >= 2);

    for (const line of lines) {
      if (line.includes("file-a.txt")) assert.match(line, /📄 file-a\.txt\s*$/);
      if (line.includes("file-b.log")) assert.match(line, /📄 file-b\.log\s*$/);
      if (line.includes("file-c.json")) assert.match(line, /📄 file-c\.json\s*$/);
      if (line.match(/📁 subdir/)) assert.match(line, /📁 subdir\s*$/);
    }

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

    const lines = clean.split("\n").filter(l => l.trim().length > 0);

    let dirIdx = -1;
    let fileAIdx = -1;
    let fileBIdx = -1;
    let subFileIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("📁 subdir")) dirIdx = i;
      if (lines[i].includes("file-a.txt")) fileAIdx = i;
      if (lines[i].includes("file-b.log")) fileBIdx = i;
      if (lines[i].includes("file-c.json")) subFileIdx = i;
    }

    assert.ok(dirIdx > 0, "subdir should be after root");
    assert.ok(fileAIdx > 0, "file-a.txt should be present");
    assert.ok(fileBIdx > 0, "file-b.log should be present");
    assert.ok(subFileIdx > dirIdx, "file-c.json should be after subdir");
    assert.ok(dirIdx < fileAIdx && dirIdx < fileBIdx, "Directory should be sorted before files");

    if (dirIdx > 0) {
      const dirLine = lines[dirIdx];
      if (dirIdx < fileAIdx && dirIdx < fileBIdx) {
        assert.match(dirLine, /├── 📁 subdir/, "subdir is not last, should use ├──");
      } else {
        assert.match(dirLine, /└── 📁 subdir/, "subdir is last, should use └──");
      }
    }

    const lastIdx = lines.length - 1;
    assert.match(lines[lastIdx], /└── /, "Last item should use └── connector");

    if (subFileIdx > 0) {
      const subFileLine = lines[subFileIdx];
      assert.ok(
        subFileLine.includes("└── 📄 file-c.json"),
        `subdir file should be indented and use └──, got: ${subFileLine}`
      );
      assert.ok(
        subFileLine.startsWith("    ") || subFileLine.includes("│   "),
        "Subdir file should be indented"
      );
    }

    if (dirIdx > 0 && subFileIdx > dirIdx) {
      assert.match(clean, /│   /, "Should have vertical connector for subdir children");
    }
  });
});
