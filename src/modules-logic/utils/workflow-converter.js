/**
 * Workflow Converter Utility
 * 
 * Converts database workflow format (with steps) to execution format (with actions)
 * 
 * Database format:
 * {
 *   id: "uuid",
 *   name: "Workflow Name",
 *   steps: [
 *     { micro_action_id: "uuid", params_override: {}, micro_action: {...} }
 *   ]
 * }
 * 
 * Execution format:
 * {
 *   id: "uuid",
 *   name: "Workflow Name",
 *   actions: [
 *     { name: "...", type: "...", params: {...}, visual: {...}, backup_selector: "..." }
 *   ]
 * }
 */

/**
 * Convert database workflow format to execution format
 * @param {Object} workflow - Database workflow object with steps
 * @returns {Object} Workflow with actions array
 */
export function convertWorkflowToActions(workflow) {
  if (!workflow) {
    throw new Error('Workflow is required');
  }

  // If workflow already has actions, return as-is (might already be converted)
  if (workflow.actions && Array.isArray(workflow.actions)) {
    return workflow;
  }

  // Parse steps if it's a string (JSONB fields might be returned as strings)
  let steps = workflow.steps;
  if (steps && typeof steps === 'string') {
    try {
      steps = JSON.parse(steps);
    } catch (parseError) {
      throw new Error(`Failed to parse workflow steps: ${parseError.message}`);
    }
  }

  // Check if workflow has steps (database format)
  if (!steps || !Array.isArray(steps)) {
    throw new Error('Invalid workflow: missing steps or actions array');
  }

  // Convert steps to actions
  const actions = steps.map((step, index) => {
    // Get micro_action from step (should be populated)
    const microAction = step.micro_action;
    
    if (!microAction) {
      throw new Error(
        `Step ${index + 1} (micro_action_id: ${step.micro_action_id}) is missing micro_action data. ` +
        'Workflow must be loaded with micro_actions populated.'
      );
    }

    // Merge base params with step overrides
    const baseParams = microAction.params || {};
    const stepOverrides = step.params_override || {};
    const finalParams = {
      ...baseParams,
      ...stepOverrides,
    };

    // Extract visual and backup_selector from params (they might be at top level or in params)
    const visual = finalParams.visual || microAction.visual || null;
    const backupSelector = finalParams.backup_selector || microAction.backup_selector || null;
    const executionMethod = finalParams.execution_method || microAction.execution_method || 'visual_first';

    // Build action object
    const action = {
      name: microAction.name || step.name || `Action ${index + 1}`,
      type: microAction.type || step.type,
      params: finalParams,
    };

    // Add visual and backup_selector at top level if they exist
    if (visual) {
      action.visual = visual;
    }
    if (backupSelector) {
      action.backup_selector = backupSelector;
    }
    if (executionMethod) {
      action.execution_method = executionMethod;
    }

    return action;
  });

  return {
    id: workflow.id,
    name: workflow.name,
    platform: workflow.platform,
    type: workflow.type,
    description: workflow.description,
    actions: actions,
  };
}

/**
 * Populate micro_actions in workflow steps
 * @param {Object} workflow - Workflow with steps containing micro_action_id
 * @param {Array} microActions - Array of micro_action objects
 * @returns {Object} Workflow with populated micro_actions
 */
export function populateMicroActions(workflow, microActions) {
  if (!workflow || !workflow.steps || !Array.isArray(workflow.steps)) {
    return workflow;
  }

  // Create map of micro_actions by ID
  const microActionsMap = new Map(
    (microActions || []).map((ma) => [ma.id, ma])
  );

  // Populate micro_action in each step
  const populatedSteps = workflow.steps.map((step) => ({
    ...step,
    micro_action: microActionsMap.get(step.micro_action_id) || null,
  }));

  return {
    ...workflow,
    steps: populatedSteps,
  };
}

