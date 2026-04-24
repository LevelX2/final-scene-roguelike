import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const knowledgeBaseDir = path.join(rootDir, "KI-Wissen-Final Scene");
const textExtensions = new Set([".md", ".json", ".txt"]);
const suspiciousPatterns = [
  "\u00C3\u00A4",
  "\u00C3\u00B6",
  "\u00C3\u00BC",
  "\u00C3\u201E",
  "\u00C3\u2013",
  "\u00C3\u015C",
  "\u00C3\u0178",
  "\u00E2\u20AC\u201C",
  "\u00E2\u20AC\u201D",
  "\u00E2\u20AC\u00A6",
  "\u00E2\u20AC\u017E",
  "\u00E2\u20AC\u0153",
  "\u00E2\u20AC",
  "\u00C2 ",
  "\uFFFD",
];

function walkFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (textExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function getLineAndColumnFromBuffer(buffer, offset) {
  let line = 1;
  let column = 1;

  for (let index = 0; index < offset; index += 1) {
    if (buffer[index] === 0x0a) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

function findInvalidUtf8Offsets(buffer) {
  const invalidOffsets = [];
  let index = 0;

  while (index < buffer.length) {
    const byte = buffer[index];

    if (byte <= 0x7f) {
      index += 1;
      continue;
    }

    let width = 0;

    if (byte >= 0xc2 && byte <= 0xdf) {
      width = 2;
    } else if (byte === 0xe0) {
      if (
        index + 2 < buffer.length &&
        buffer[index + 1] >= 0xa0 &&
        buffer[index + 1] <= 0xbf &&
        buffer[index + 2] >= 0x80 &&
        buffer[index + 2] <= 0xbf
      ) {
        index += 3;
        continue;
      }
    } else if ((byte >= 0xe1 && byte <= 0xec) || (byte >= 0xee && byte <= 0xef)) {
      width = 3;
    } else if (byte === 0xed) {
      if (
        index + 2 < buffer.length &&
        buffer[index + 1] >= 0x80 &&
        buffer[index + 1] <= 0x9f &&
        buffer[index + 2] >= 0x80 &&
        buffer[index + 2] <= 0xbf
      ) {
        index += 3;
        continue;
      }
    } else if (byte === 0xf0) {
      if (
        index + 3 < buffer.length &&
        buffer[index + 1] >= 0x90 &&
        buffer[index + 1] <= 0xbf &&
        buffer[index + 2] >= 0x80 &&
        buffer[index + 2] <= 0xbf &&
        buffer[index + 3] >= 0x80 &&
        buffer[index + 3] <= 0xbf
      ) {
        index += 4;
        continue;
      }
    } else if (byte >= 0xf1 && byte <= 0xf3) {
      width = 4;
    } else if (byte === 0xf4) {
      if (
        index + 3 < buffer.length &&
        buffer[index + 1] >= 0x80 &&
        buffer[index + 1] <= 0x8f &&
        buffer[index + 2] >= 0x80 &&
        buffer[index + 2] <= 0xbf &&
        buffer[index + 3] >= 0x80 &&
        buffer[index + 3] <= 0xbf
      ) {
        index += 4;
        continue;
      }
    }

    if (width > 0 && index + width - 1 < buffer.length) {
      let valid = true;

      for (let continuationIndex = 1; continuationIndex < width; continuationIndex += 1) {
        const continuationByte = buffer[index + continuationIndex];
        if (continuationByte < 0x80 || continuationByte > 0xbf) {
          valid = false;
          break;
        }
      }

      if (valid) {
        index += width;
        continue;
      }
    }

    invalidOffsets.push(index);
    index += 1;
  }

  return invalidOffsets;
}

function findSuspiciousLines(text) {
  const hits = [];
  const lines = text.split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const matchedPatterns = suspiciousPatterns.filter((pattern) => line.includes(pattern));

    if (matchedPatterns.length === 0) {
      continue;
    }

    hits.push({
      line: index + 1,
      patterns: matchedPatterns,
      preview: line.trim().slice(0, 160),
    });
  }

  return hits;
}

const files = walkFiles(knowledgeBaseDir);
const invalidUtf8Files = [];
const suspiciousFiles = [];

for (const filePath of files) {
  const buffer = readFileSync(filePath);
  const invalidOffsets = findInvalidUtf8Offsets(buffer);
  const relativePath = path.relative(rootDir, filePath).replaceAll("\\", "/");

  if (invalidOffsets.length > 0) {
    invalidUtf8Files.push({
      path: relativePath,
      total: invalidOffsets.length,
      offsets: invalidOffsets.slice(0, 10).map((offset) => ({
        offset,
        byte: buffer[offset],
        ...getLineAndColumnFromBuffer(buffer, offset),
      })),
    });
    continue;
  }

  const text = buffer.toString("utf8");
  const suspiciousLines = findSuspiciousLines(text);
  if (suspiciousLines.length > 0) {
    suspiciousFiles.push({
      path: relativePath,
      total: suspiciousLines.length,
      lines: suspiciousLines.slice(0, 5),
    });
  }
}

if (invalidUtf8Files.length === 0 && suspiciousFiles.length === 0) {
  console.log(`Wissensbasis-Encoding-Check bestanden: ${files.length} Dateien geprüft.`);
  process.exit(0);
}

console.error("Wissensbasis-Encoding-Check fehlgeschlagen.");

for (const file of invalidUtf8Files) {
  console.error(`- Ungültiges UTF-8: ${file.path} (${file.total} Byte-Stellen)`);
  for (const location of file.offsets) {
    console.error(
      `  Zeile ${location.line}, Spalte ${location.column}, Offset ${location.offset}, Byte 0x${location.byte
        .toString(16)
        .toUpperCase()
        .padStart(2, "0")}`,
    );
  }
}

for (const file of suspiciousFiles) {
  console.error(`- Verdächtige Mojibake-Muster: ${file.path} (${file.total} Zeilen)`);
  for (const line of file.lines) {
    console.error(`  Zeile ${line.line}: Muster ${line.patterns.join(", ")} | ${line.preview}`);
  }
}

process.exit(1);
