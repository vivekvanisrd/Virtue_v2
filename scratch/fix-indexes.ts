import fs from "fs";
import path from "path";

function fixSchemaIndexes() {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const content = fs.readFileSync(schemaPath, "utf8");

  const lines = content.split("\n");
  let currentModel: string | null = null;
  let modelLines: string[] = [];
  const outputLines: string[] = [];

  interface ModelMeta {
    fields: Record<string, string>;
    relations: string[];
    indexes: Set<string>;
    uniques: Set<string>;
  }

  // First Pass: Extract metadata for all models
  const modelsMeta: Record<string, ModelMeta> = {};
  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("model ")) {
      currentModel = trimmed.split(" ")[1];
      modelsMeta[currentModel] = {
        fields: {},
        relations: [],
        indexes: new Set(),
        uniques: new Set()
      };
      continue;
    }

    if (currentModel && trimmed === "}") {
      currentModel = null;
      continue;
    }

    if (currentModel && trimmed.length > 0) {
      if (trimmed.startsWith("@@index")) {
        const match = trimmed.match(/@@index\(\[([^\]]+)\]\)/);
        if (match) {
          const fields = match[1].split(",").map(f => f.trim().replace(/"/g, ""));
          modelsMeta[currentModel].indexes.add(fields[0]);
        }
        continue;
      }

      if (trimmed.startsWith("@@unique")) {
        const match = trimmed.match(/@@unique\(\[([^\]]+)\]\)/);
        if (match) {
          const fields = match[1].split(",").map(f => f.trim().replace(/"/g, ""));
          modelsMeta[currentModel].uniques.add(fields[0]);
        }
        continue;
      }

      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const fieldName = parts[0];
        const attributes = parts.slice(2).join(" ");
        modelsMeta[currentModel].fields[fieldName] = attributes;

        if (attributes.includes("@id") || attributes.includes("@unique")) {
          modelsMeta[currentModel].uniques.add(fieldName);
        }

        const relMatch = attributes.match(/@relation\([^)]*fields:\s*\[([^\]]+)\][^)]*\)/);
        if (relMatch) {
          const foreignKeys = relMatch[1].split(",").map(f => f.trim().replace(/"/g, ""));
          for (const fk of foreignKeys) {
            modelsMeta[currentModel].relations.push(fk);
          }
        }
      }
    }
  }

  // Second Pass: Inject missing index statements before closing brackets
  currentModel = null;
  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("model ")) {
      currentModel = trimmed.split(" ")[1];
      outputLines.push(line);
      continue;
    }

    if (currentModel && trimmed === "}") {
      const meta = modelsMeta[currentModel];
      const missingIndexes: string[] = [];

      for (const fk of meta.relations) {
        const isIndexed = meta.indexes.has(fk) || meta.uniques.has(fk);
        if (!isIndexed) {
          missingIndexes.push(fk);
          // Prevent duplicates during injection
          meta.indexes.add(fk);
        }
      }

      if (missingIndexes.length > 0) {
        outputLines.push("");
        for (const fk of missingIndexes) {
          outputLines.push(`  @@index([${fk}])`);
        }
      }

      outputLines.push(line);
      currentModel = null;
      continue;
    }

    outputLines.push(line);
  }

  fs.writeFileSync(schemaPath, outputLines.join("\n"), "utf8");
  console.log("✅ [INDEX_FIXER] Successfully updated prisma/schema.prisma with all missing relation indexes!");
}

fixSchemaIndexes();
