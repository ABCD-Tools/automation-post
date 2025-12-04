import fs from 'fs/promises';
import path from 'path';
import { validateAction } from './action-types.js';

/**
 * WorkflowStorage - Save and load workflows from files
 * 
 * Supports:
 * - JSON format
 * - Workflow metadata (name, description, platform)
 * - Validation on load
 * - Multiple workflow directories
 */
export class WorkflowStorage {
  constructor(baseDir = './workflows') {
    this.baseDir = baseDir;
  }

  /**
   * Save workflow to file
   * @param {Object} workflow - Workflow object
   * @param {string} filename - Filename (without extension)
   * @returns {Promise<string>} File path
   */
  async saveWorkflow(workflow, filename) {
    // Ensure directory exists
    await fs.mkdir(this.baseDir, { recursive: true });

    // Add metadata
    const workflowData = {
      version: '1.0.0',
      createdAt: workflow.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...workflow,
    };

    // Validate actions
    if (workflowData.actions) {
      for (const action of workflowData.actions) {
        const validation = validateAction(action);
        if (!validation.valid) {
          throw new Error(`Invalid action "${action.name}": ${validation.errors.join(', ')}`);
        }
      }
    }

    // Write to file
    const filePath = path.join(this.baseDir, `${filename}.json`);
    await fs.writeFile(filePath, JSON.stringify(workflowData, null, 2), 'utf-8');

    console.log(`✅ Workflow saved: ${filePath}`);
    return filePath;
  }

  /**
   * Load workflow from file
   * @param {string} filename - Filename (with or without extension)
   * @returns {Promise<Object>} Workflow object
   */
  async loadWorkflow(filename) {
    // Add .json extension if not present
    const file = filename.endsWith('.json') ? filename : `${filename}.json`;
    const filePath = path.join(this.baseDir, file);

    // Read file
    const data = await fs.readFile(filePath, 'utf-8');
    const workflow = JSON.parse(data);

    // Validate actions
    if (workflow.actions) {
      for (const action of workflow.actions) {
        const validation = validateAction(action);
        if (!validation.valid) {
          console.warn(`⚠️  Invalid action "${action.name}": ${validation.errors.join(', ')}`);
        }
      }
    }

    console.log(`✅ Workflow loaded: ${filePath} (${workflow.actions?.length || 0} actions)`);
    return workflow;
  }

  /**
   * List all workflows in directory
   * @returns {Promise<Array>} Array of workflow metadata
   */
  async listWorkflows() {
    try {
      const files = await fs.readdir(this.baseDir);
      const workflows = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.baseDir, file);
            const data = await fs.readFile(filePath, 'utf-8');
            const workflow = JSON.parse(data);

            workflows.push({
              filename: file,
              name: workflow.name,
              platform: workflow.platform,
              description: workflow.description,
              actionCount: workflow.actions?.length || 0,
              createdAt: workflow.createdAt,
              updatedAt: workflow.updatedAt,
            });
          } catch (error) {
            console.warn(`⚠️  Failed to read ${file}:`, error.message);
          }
        }
      }

      return workflows;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // Directory doesn't exist yet
      }
      throw error;
    }
  }

  /**
   * Delete workflow file
   * @param {string} filename - Filename
   * @returns {Promise<void>}
   */
  async deleteWorkflow(filename) {
    const file = filename.endsWith('.json') ? filename : `${filename}.json`;
    const filePath = path.join(this.baseDir, file);
    
    await fs.unlink(filePath);
    console.log(`✅ Workflow deleted: ${filePath}`);
  }

  /**
   * Check if workflow exists
   * @param {string} filename - Filename
   * @returns {Promise<boolean>}
   */
  async workflowExists(filename) {
    try {
      const file = filename.endsWith('.json') ? filename : `${filename}.json`;
      const filePath = path.join(this.baseDir, file);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Duplicate workflow with new name
   * @param {string} sourceFilename - Source workflow filename
   * @param {string} newFilename - New workflow filename
   * @returns {Promise<string>} New file path
   */
  async duplicateWorkflow(sourceFilename, newFilename) {
    const workflow = await this.loadWorkflow(sourceFilename);
    
    // Update metadata
    workflow.name = workflow.name + ' (Copy)';
    workflow.createdAt = new Date().toISOString();
    workflow.updatedAt = new Date().toISOString();
    
    return await this.saveWorkflow(workflow, newFilename);
  }

  /**
   * Export workflow with screenshots to separate directory
   * @param {string} filename - Workflow filename
   * @param {string} exportDir - Export directory
   * @returns {Promise<string>} Export directory path
   */
  async exportWorkflow(filename, exportDir) {
    const workflow = await this.loadWorkflow(filename);
    
    // Create export directory
    const exportPath = path.join(exportDir, filename.replace('.json', ''));
    await fs.mkdir(exportPath, { recursive: true });

    // Extract screenshots
    const screenshots = [];
    
    if (workflow.actions) {
      for (let i = 0; i < workflow.actions.length; i++) {
        const action = workflow.actions[i];
        
        if (action.params.visual?.screenshot) {
          const screenshot = action.params.visual.screenshot;
          
          // Save screenshot as separate file
          const screenshotFilename = `action-${i + 1}-screenshot.png`;
          const screenshotPath = path.join(exportPath, screenshotFilename);
          
          // Extract base64 data
          const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
          await fs.writeFile(screenshotPath, Buffer.from(base64Data, 'base64'));
          
          screenshots.push({
            actionIndex: i,
            filename: screenshotFilename,
          });
          
          // Replace with file reference
          action.params.visual.screenshot = `./${screenshotFilename}`;
        }
      }
    }

    // Save workflow JSON
    await fs.writeFile(
      path.join(exportPath, 'workflow.json'),
      JSON.stringify(workflow, null, 2),
      'utf-8'
    );

    // Save manifest
    await fs.writeFile(
      path.join(exportPath, 'manifest.json'),
      JSON.stringify({
        name: workflow.name,
        platform: workflow.platform,
        description: workflow.description,
        actionCount: workflow.actions?.length || 0,
        screenshots: screenshots.length,
        exportedAt: new Date().toISOString(),
      }, null, 2),
      'utf-8'
    );

    console.log(`✅ Workflow exported: ${exportPath}`);
    console.log(`   Actions: ${workflow.actions?.length || 0}`);
    console.log(`   Screenshots: ${screenshots.length}`);
    
    return exportPath;
  }

  /**
   * Import workflow from exported directory
   * @param {string} exportDir - Export directory path
   * @param {string} filename - New filename to save as
   * @returns {Promise<string>} Saved file path
   */
  async importWorkflow(exportDir, filename) {
    // Load workflow JSON
    const workflowPath = path.join(exportDir, 'workflow.json');
    const data = await fs.readFile(workflowPath, 'utf-8');
    const workflow = JSON.parse(data);

    // Load screenshots back
    if (workflow.actions) {
      for (const action of workflow.actions) {
        if (action.params.visual?.screenshot && action.params.visual.screenshot.startsWith('./')) {
          // Load screenshot file
          const screenshotFilename = action.params.visual.screenshot.replace('./', '');
          const screenshotPath = path.join(exportDir, screenshotFilename);
          
          try {
            const buffer = await fs.readFile(screenshotPath);
            const base64 = buffer.toString('base64');
            action.params.visual.screenshot = `data:image/png;base64,${base64}`;
          } catch (error) {
            console.warn(`⚠️  Failed to load screenshot: ${screenshotFilename}`);
          }
        }
      }
    }

    // Save workflow
    return await this.saveWorkflow(workflow, filename);
  }

  /**
   * Get workflow statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    const workflows = await this.listWorkflows();
    
    const stats = {
      totalWorkflows: workflows.length,
      totalActions: 0,
      byPlatform: {},
      mostRecent: null,
    };

    for (const workflow of workflows) {
      stats.totalActions += workflow.actionCount;
      
      if (workflow.platform) {
        stats.byPlatform[workflow.platform] = (stats.byPlatform[workflow.platform] || 0) + 1;
      }
      
      if (!stats.mostRecent || workflow.updatedAt > stats.mostRecent.updatedAt) {
        stats.mostRecent = workflow;
      }
    }

    return stats;
  }
}

/**
 * Create standard workflow structure
 */
export function createWorkflowStructure(name, platform, description, actions = []) {
  return {
    name,
    platform,
    description,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    actions,
    metadata: {
      author: null,
      tags: [],
      category: null,
    },
  };
}

/**
 * Merge multiple workflows into one
 */
export function mergeWorkflows(workflows, name) {
  const merged = createWorkflowStructure(
    name || 'Merged Workflow',
    workflows[0]?.platform || 'mixed',
    'Merged from multiple workflows',
    []
  );

  for (const workflow of workflows) {
    if (workflow.actions) {
      merged.actions.push(...workflow.actions);
    }
  }

  return merged;
}

/**
 * Split workflow into chunks
 */
export function splitWorkflow(workflow, chunkSize = 10) {
  const chunks = [];
  
  for (let i = 0; i < workflow.actions.length; i += chunkSize) {
    const chunk = createWorkflowStructure(
      `${workflow.name} (Part ${Math.floor(i / chunkSize) + 1})`,
      workflow.platform,
      workflow.description,
      workflow.actions.slice(i, i + chunkSize)
    );
    
    chunks.push(chunk);
  }
  
  return chunks;
}
