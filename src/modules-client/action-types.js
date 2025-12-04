/**
 * Action Types and Interfaces
 * Defines standard action formats for visual recording system
 */

/**
 * Supported action types
 */
export const ActionTypes = {
  NAVIGATE: 'navigate',
  CLICK: 'click',
  TYPE: 'type',
  WAIT: 'wait',
  SCROLL: 'scroll',
  UPLOAD: 'upload',
  EXTRACT: 'extract',
  SCREENSHOT: 'screenshot',
  SUBMIT: 'submit',
};

/**
 * Execution methods for visual actions
 */
export const ExecutionMethods = {
  SELECTOR_FIRST: 'selector_first',   // Try selector first (fast)
  VISUAL_FIRST: 'visual_first',       // Try visual first (robust)
  VISUAL_ONLY: 'visual_only',         // Only visual (max robust)
};

/**
 * Template variable patterns
 */
export const TemplateVariables = {
  USERNAME: '{{username}}',
  PASSWORD: '{{password}}',
  EMAIL: '{{email}}',
  CAPTION: '{{caption}}',
  IMAGE_PATH: '{{imagePath}}',
  VIDEO_PATH: '{{videoPath}}',
  URL: '{{url}}',
  PHONE: '{{phone}}',
};

/**
 * Create a navigate action
 */
export function createNavigateAction(url, waitUntil = 'networkidle2') {
  return {
    name: `Navigate to ${url}`,
    type: ActionTypes.NAVIGATE,
    params: {
      url,
      waitUntil,
    },
  };
}

/**
 * Create a wait action
 */
export function createWaitAction(duration, randomize = true) {
  return {
    name: `Wait ${duration}ms`,
    type: ActionTypes.WAIT,
    params: {
      duration,
      randomize,
    },
  };
}

/**
 * Create a click action with visual data
 */
export function createClickAction(visual, backupSelector = null) {
  return {
    name: `Click "${visual.text || 'element'}"`,
    type: ActionTypes.CLICK,
    params: {
      visual,
      backup_selector: backupSelector,
      execution_method: ExecutionMethods.VISUAL_FIRST,
    },
  };
}

/**
 * Create a type action with visual data
 */
export function createTypeAction(visual, text, backupSelector = null) {
  return {
    name: `Type in "${visual.placeholder || visual.text || 'field'}"`,
    type: ActionTypes.TYPE,
    params: {
      visual,
      text,
      backup_selector: backupSelector,
      typeSpeed: 'normal',
      execution_method: ExecutionMethods.VISUAL_FIRST,
    },
  };
}

/**
 * Create a scroll action
 */
export function createScrollAction(direction, amount = null) {
  return {
    name: `Scroll ${direction}`,
    type: ActionTypes.SCROLL,
    params: {
      direction,
      amount,
    },
  };
}

/**
 * Create an upload action with visual data
 */
export function createUploadAction(visual, filePath, backupSelector = null) {
  return {
    name: `Upload file`,
    type: ActionTypes.UPLOAD,
    params: {
      visual,
      filePath,
      backup_selector: backupSelector,
      execution_method: ExecutionMethods.VISUAL_FIRST,
    },
  };
}

/**
 * Create a screenshot action
 */
export function createScreenshotAction(path = null, fullPage = false) {
  return {
    name: `Take screenshot`,
    type: ActionTypes.SCREENSHOT,
    params: {
      path: path || `screenshot-${Date.now()}.png`,
      fullPage,
    },
  };
}

/**
 * Validate action structure
 */
export function validateAction(action) {
  const errors = [];

  // Check required fields
  if (!action.name) {
    errors.push('Missing required field: name');
  }
  if (!action.type) {
    errors.push('Missing required field: type');
  }
  if (!action.params) {
    errors.push('Missing required field: params');
  }

  // Validate action type
  if (action.type && !Object.values(ActionTypes).includes(action.type)) {
    errors.push(`Invalid action type: ${action.type}`);
  }

  // Type-specific validation
  if (action.type === ActionTypes.CLICK || action.type === ActionTypes.TYPE) {
    if (!action.params.visual && !action.params.backup_selector) {
      errors.push('Visual actions require either visual data or backup_selector');
    }

    if (action.params.visual) {
      if (!action.params.visual.position) {
        errors.push('Visual data missing position');
      }
      if (!action.params.visual.boundingBox) {
        errors.push('Visual data missing boundingBox');
      }
      if (!action.params.visual.timestamp) {
        errors.push('Visual data missing timestamp');
      }
    }
  }

  if (action.type === ActionTypes.TYPE && !action.params.text) {
    errors.push('Type action requires text parameter');
  }

  if (action.type === ActionTypes.NAVIGATE && !action.params.url) {
    errors.push('Navigate action requires url parameter');
  }

  if (action.type === ActionTypes.WAIT && !action.params.duration) {
    errors.push('Wait action requires duration parameter');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Replace template variables in action text
 */
export function replaceTemplates(action, variables) {
  if (!action.params.text) {
    return action;
  }

  let text = action.params.text;

  for (const [key, value] of Object.entries(variables)) {
    const template = `{{${key}}}`;
    text = text.replace(new RegExp(template, 'g'), value);
  }

  return {
    ...action,
    params: {
      ...action.params,
      text,
    },
  };
}

/**
 * Estimate action execution time
 */
export function estimateExecutionTime(action) {
  const baseTime = {
    [ActionTypes.NAVIGATE]: 3000,      // 3 seconds
    [ActionTypes.CLICK]: 500,          // 500ms (average)
    [ActionTypes.TYPE]: 1000,          // 1 second per field
    [ActionTypes.WAIT]: 0,             // Duration specified
    [ActionTypes.SCROLL]: 500,         // 500ms
    [ActionTypes.UPLOAD]: 2000,        // 2 seconds
    [ActionTypes.SCREENSHOT]: 1000,    // 1 second
  };

  let time = baseTime[action.type] || 500;

  // Add wait duration
  if (action.type === ActionTypes.WAIT) {
    time = action.params.duration;
    if (action.params.randomize) {
      time *= 1.2; // Account for randomization
    }
  }

  // Add typing time
  if (action.type === ActionTypes.TYPE && action.params.text) {
    const charCount = action.params.text.length;
    time = charCount * 50; // 50ms per character
  }

  return Math.round(time);
}

/**
 * Get execution method priority order
 */
export function getExecutionMethodPriority(method) {
  const priorities = {
    [ExecutionMethods.SELECTOR_FIRST]: ['selector', 'visual', 'position'],
    [ExecutionMethods.VISUAL_FIRST]: ['visual', 'selector', 'position'],
    [ExecutionMethods.VISUAL_ONLY]: ['visual', 'position'],
  };

  return priorities[method] || priorities[ExecutionMethods.VISUAL_FIRST];
}

/**
 * Clone action (deep copy)
 */
export function cloneAction(action) {
  return JSON.parse(JSON.stringify(action));
}

/**
 * Merge multiple actions (for batch operations)
 */
export function mergeActions(actions) {
  const merged = [];
  let current = null;

  for (const action of actions) {
    // Merge consecutive typing on same element
    if (
      current &&
      current.type === ActionTypes.TYPE &&
      action.type === ActionTypes.TYPE &&
      current.params.backup_selector === action.params.backup_selector
    ) {
      // Combine text
      current.params.text += action.params.text;
      continue;
    }

    // Skip redundant waits
    if (
      current &&
      current.type === ActionTypes.WAIT &&
      action.type === ActionTypes.WAIT
    ) {
      // Combine duration
      current.params.duration += action.params.duration;
      continue;
    }

    // Add current to merged and start new
    if (current) {
      merged.push(current);
    }
    current = cloneAction(action);
  }

  // Add final action
  if (current) {
    merged.push(current);
  }

  return merged;
}

/**
 * Filter actions by type
 */
export function filterActionsByType(actions, types) {
  const typeArray = Array.isArray(types) ? types : [types];
  return actions.filter((action) => typeArray.includes(action.type));
}

/**
 * Get action summary statistics
 */
export function getActionStats(actions) {
  const stats = {
    total: actions.length,
    byType: {},
    estimatedTime: 0,
    hasVisualData: 0,
    hasBackupSelector: 0,
  };

  for (const action of actions) {
    // Count by type
    stats.byType[action.type] = (stats.byType[action.type] || 0) + 1;

    // Estimated time
    stats.estimatedTime += estimateExecutionTime(action);

    // Visual data
    if (action.params.visual) {
      stats.hasVisualData++;
    }
    if (action.params.backup_selector) {
      stats.hasBackupSelector++;
    }
  }

  return stats;
}

/**
 * Convert action to human-readable string
 */
export function actionToString(action) {
  const parts = [`[${action.type.toUpperCase()}]`, action.name];

  if (action.type === ActionTypes.NAVIGATE) {
    parts.push(`→ ${action.params.url}`);
  } else if (action.type === ActionTypes.TYPE) {
    const text = action.params.text.length > 20
      ? action.params.text.substring(0, 20) + '...'
      : action.params.text;
    parts.push(`→ "${text}"`);
  } else if (action.type === ActionTypes.WAIT) {
    parts.push(`→ ${action.params.duration}ms`);
  } else if (action.params.visual?.text) {
    parts.push(`→ "${action.params.visual.text}"`);
  }

  return parts.join(' ');
}

/**
 * Export action to JSON
 */
export function exportAction(action) {
  return JSON.stringify(action, null, 2);
}

/**
 * Import action from JSON
 */
export function importAction(json) {
  try {
    const action = JSON.parse(json);
    const validation = validateAction(action);
    
    if (!validation.valid) {
      throw new Error(`Invalid action: ${validation.errors.join(', ')}`);
    }
    
    return action;
  } catch (error) {
    throw new Error(`Failed to import action: ${error.message}`);
  }
}
