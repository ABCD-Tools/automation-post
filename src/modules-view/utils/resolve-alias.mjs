import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Resolve project root: from src/modules-view/utils -> project root
const projectRoot = resolve(__dirname, '../../..');

/**
 * Resolve alias imports to actual file paths
 * @param {string} aliasPath - Path with alias (e.g., '@modules-recorder/index.js')
 * @returns {string} Resolved file path
 */
export function resolveAlias(aliasPath) {
  const aliasMap = {
    '@components': resolve(projectRoot, 'src/modules-view/components'),
    '@utils': resolve(projectRoot, 'src/modules-view/utils'),
    '@modules-logic': resolve(projectRoot, 'src/modules-logic'),
    '@modules-agents': resolve(projectRoot, 'src/modules-agents'),
    '@modules-view': resolve(projectRoot, 'src/modules-view'),
    '@modules-recorder': resolve(projectRoot, 'src/modules-recorder'),
  };

  for (const [alias, basePath] of Object.entries(aliasMap)) {
    if (aliasPath.startsWith(alias)) {
      const rest = aliasPath.slice(alias.length);
      return resolve(basePath, rest.startsWith('/') ? rest.slice(1) : rest);
    }
  }

  // If no alias matched, return as-is (might be a relative path)
  return aliasPath;
}

/**
 * Import a module using alias path
 * @param {string} aliasPath - Path with alias (e.g., '@modules-recorder/index.js')
 * @returns {Promise<any>} Imported module
 */
export async function importAlias(aliasPath) {
  const resolvedPath = resolveAlias(aliasPath);
  // Convert to file:// URL for ESM import
  const fileUrl = `file://${resolvedPath}`;
  return import(fileUrl);
}

