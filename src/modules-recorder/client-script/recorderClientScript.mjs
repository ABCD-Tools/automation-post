import { RecorderCore } from './RecorderCore.mjs';
import { VisualCapture } from './VisualCapture.mjs';
import { SelectorGenerator } from './SelectorGenerator.mjs';
import { EventHandlers } from './EventHandlers.mjs';
import { StorageManager } from './StorageManager.mjs';
import { UIOverlay } from './UIOverlay.mjs';
import { EdgeCaseHandlers } from './EdgeCaseHandlers.mjs';

export const RecorderClientScript = `
  (function() {
${RecorderCore}
${VisualCapture}
${SelectorGenerator}
${EventHandlers}
${StorageManager}
${UIOverlay}
${EdgeCaseHandlers}
  })();
`;

