import fs from "fs";
import path from "path";

function auditPrismaSchema() {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const content = fs.readFileSync(schemaPath, "utf8");

  const models: Record<string, {
    fields: Record<string, string>; // name -> type/attributes
    relations: Array<{ field: string; references: string }>;
    indexes: Set<string>;
    uniques: Set<string>;
  }> = {};

  let currentModel: string | null = null;

  const lines = content.split("\n");
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("model ")) {
      currentModel = line.split(" ")[1];
      models[currentModel] = {
        fields: {},
        relations: [],
        indexes: new Set(),
        uniques: new Set()
      };
      continue;
    }

    if (currentModel && line === "}") {
      currentModel = null;
      continue;
    }

    if (currentModel && line.length > 0) {
      if (line.startsWith("@@index")) {
        // Parse @@index([field1, field2])
        const match = line.match(/@@index\(\[([^\]]+)\]\)/);
        if (match) {
          const fields = match[1].split(",").map(f => f.trim().replace(/"/g, ""));
          // Mark the first field in index as indexed
          models[currentModel].indexes.add(fields[0]);
        }
        continue;
      }

      if (line.startsWith("@@unique")) {
        // Parse @@unique([field1, field2])
        const match = line.match(/@@unique\(\[([^\]]+)\]\)/);
        if (match) {
          const fields = match[1].split(",").map(f => f.trim().replace(/"/g, ""));
          models[currentModel].uniques.add(fields[0]);
        }
        continue;
      }

      // It's a field definition
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const fieldName = parts[0];
        const fieldType = parts[1];
        const attributes = parts.slice(2).join(" ");
        
        models[currentModel].fields[fieldName] = attributes;

        if (attributes.includes("@id")) {
          models[currentModel].uniques.add(fieldName);
        }
        if (attributes.includes("@unique")) {
          models[currentModel].uniques.add(fieldName);
        }

        // Parse relation fields: @relation(fields: [studentId], references: [id])
        const relMatch = attributes.match(/@relation\([^)]*fields:\s*\[([^\]]+)\][^)]*\)/);
        if (relMatch) {
          const foreignKeys = relMatch[1].split(",").map(f => f.trim().replace(/"/g, ""));
          for (const fk of foreignKeys) {
            models[currentModel].relations.push({ field: fk, references: fieldName });
          }
        }
      }
    }
  }

  console.log("🔍 [INDEX_AUDIT] Auditing foreign key relations in prisma/schema.prisma...\n");
  let missingIndexCount = 0;

  for (const [modelName, meta] of Object.entries(models)) {
    const missingInModel: string[] = [];
    for (const rel of meta.relations) {
      const isIndexed = meta.indexes.has(rel.field) || meta.uniques.has(rel.field);
      if (!isIndexed) {
        missingInModel.push(rel.field);
        missingIndexCount++;
      }
    }

    if (missingInModel.length > 0) {
      console.log(`❌ Model [${modelName}] is missing indexes on foreign keys:`);
      for (const field of missingInModel) {
        console.log(`   - ${field}`);
      }
      console.log("");
    }
  }

  console.log(`Total missing indexes: ${missingIndexCount}`);
}

auditPrismaSchema();
