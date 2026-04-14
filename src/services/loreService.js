import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const loreRoot = path.resolve(__dirname, "../../data/lore");

async function readLoreFile(...segments) {
  const filePath = path.join(loreRoot, ...segments);
  return fs.readFile(filePath, "utf-8");
}

export async function getBaseLore() {
  const [promptCore, laurenceCard, ludwigRelation] = await Promise.all([
    readLoreFile("base", "prompt_core.txt"),
    readLoreFile("base", "laurence_card.txt"),
    readLoreFile("base", "ludwig_relation.txt")
  ]);

  return {
    promptCore,
    laurenceCard,
    ludwigRelation
  };
}
