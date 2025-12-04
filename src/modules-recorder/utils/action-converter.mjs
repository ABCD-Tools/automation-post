import { validateVisualData } from './validation.mjs';

/**
 * Convert raw recorded actions to micro-action format with VISUAL DATA
 * @param {Array} recordedActions - Raw actions from recorder
 * @returns {Array} Array of micro-action objects with visual field
 */
export function convertToMicroActions(recordedActions) {
  const microActions = [];
  let lastTypingAction = null;

  for (let i = 0; i < recordedActions.length; i++) {
    const action = recordedActions[i];
    const prevAction = i > 0 ? recordedActions[i - 1] : null;
    const timeSincePrev = prevAction ? action.timestamp - prevAction.timestamp : 0;
    const lastMicroAction = microActions.length > 0 ? microActions[microActions.length - 1] : null;

    // Add automatic wait between actions (1-2 seconds, randomized)
    if (
      prevAction &&
      timeSincePrev < 2000 &&
      (!lastMicroAction || lastMicroAction.type !== 'wait')
    ) {
      const waitDuration = 1000 + Math.random() * 1000; // 1-2 seconds
      microActions.push({
        name: 'Wait between actions',
        type: 'wait',
        params: {
          duration: Math.round(waitDuration),
          randomize: true,
        },
      });
    }

    switch (action.type) {
      case 'click': {
        // Validate visual data is present
        if (!action.visual || !validateVisualData(action.visual)) {
          console.warn('⚠️ Click action missing visual data, skipping:', action);
          break;
        }

        // Structure visual data according to requirements
        const visualData = {
          screenshot: action.visual.screenshot || null,
          contextScreenshot: action.visual.contextScreenshot || null,
          text: action.visual.text || '',
          position: {
            absolute: action.visual.position?.absolute || { x: 0, y: 0 },
            relative: action.visual.position?.relative || { x: 0, y: 0 },
          },
          boundingBox: action.visual.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
          surroundingText: action.visual.surroundingText || [],
          timestamp: action.visual.timestamp || action.timestamp,
        };

        microActions.push({
          name: `Click "${visualData.text.substring(0, 30) || 'element'}"`,
          type: 'click',
          visual: visualData,
          backup_selector: action.backup_selector || null,
          execution_method: action.execution_method || 'visual_first',
        });
        break;
      }

      case 'type': {
        // Validate visual data is present
        if (!action.visual || !validateVisualData(action.visual)) {
          console.warn('⚠️ Type action missing visual data, skipping:', action);
          break;
        }

        // Merge consecutive typing on same element
        if (
          lastTypingAction &&
          lastTypingAction.backup_selector === action.backup_selector
        ) {
          // Update the last typing action with new value
          lastTypingAction.visual.text = action.value || action.visual.text;
          lastTypingAction.name = `Type in "${action.visual.placeholder || action.element?.name || 'field'}"`;
        } else {
          // Structure visual data according to requirements
          const visualData = {
            screenshot: action.visual.screenshot || null,
            contextScreenshot: action.visual.contextScreenshot || null,
            text: action.visual.text || '',
            placeholder: action.visual.placeholder || '',
            inputType: action.visual.inputType || 'text',
            position: {
              absolute: action.visual.position?.absolute || { x: 0, y: 0 },
              relative: action.visual.position?.relative || { x: 0, y: 0 },
            },
            boundingBox: action.visual.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
            surroundingText: action.visual.surroundingText || [],
            timestamp: action.visual.timestamp || action.timestamp,
          };

          const microAction = {
            name: `Type in "${visualData.placeholder || action.element?.name || 'field'}"`,
            type: 'type',
            visual: visualData,
            backup_selector: action.backup_selector || null,
            text: action.value || '', // Already templated in capture
            execution_method: action.execution_method || 'visual_first',
          };
          microActions.push(microAction);
          lastTypingAction = microAction;
        }
        break;
      }

      case 'navigate': {
        microActions.push({
          name: `Navigate to ${action.url}`,
          type: 'navigate',
          params: {
            url: action.url,
            waitUntil: 'networkidle2',
          },
        });
        break;
      }

      case 'upload': {
        // Structure visual data if available
        const visualData = action.visual ? {
          screenshot: action.visual.screenshot || null,
          contextScreenshot: action.visual.contextScreenshot || null,
          text: action.visual.text || '',
          position: {
            absolute: action.visual.position?.absolute || { x: 0, y: 0 },
            relative: action.visual.position?.relative || { x: 0, y: 0 },
          },
          boundingBox: action.visual.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
          surroundingText: action.visual.surroundingText || [],
          timestamp: action.visual.timestamp || action.timestamp,
        } : null;

        microActions.push({
          name: 'Upload file',
          type: 'upload',
          visual: visualData,
          backup_selector: action.backup_selector || null,
          filePath: '{{imagePath}}',
          execution_method: 'visual_first',
        });
        break;
      }

      case 'scroll': {
        microActions.push({
          name: `Scroll ${action.direction}`,
          type: 'scroll',
          params: {
            direction: action.direction,
            amount: action.amount,
          },
        });
        break;
      }

      case 'submit': {
        // Submit is usually handled by clicking submit button
        break;
      }
    }
  }

  // Validate all required visual fields are present
  const validatedActions = microActions.map(action => {
    if (action.visual && !validateVisualData(action.visual)) {
      console.warn('⚠️ Action missing required visual fields:', action);
      // Remove visual data if invalid, keep backup_selector
      return {
        ...action,
        visual: null,
        execution_method: 'selector_first', // Fallback to selector
      };
    }
    return action;
  });

  console.log(`✅ Converted ${recordedActions.length} raw actions to ${validatedActions.length} micro-actions with visual data`);
  return validatedActions;
}

