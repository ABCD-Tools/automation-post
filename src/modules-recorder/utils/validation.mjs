/**
 * Validate that visual data contains required fields
 * @param {Object} visual - Visual data object
 * @returns {boolean} True if valid
 */
export function validateVisualData(visual) {
  if (!visual) return false;

  const hasPosition = visual.position && 
                     visual.position.absolute && 
                     typeof visual.position.absolute.x === 'number' &&
                     typeof visual.position.absolute.y === 'number';

  const hasBoundingBox = visual.boundingBox &&
                        typeof visual.boundingBox.x === 'number' &&
                        typeof visual.boundingBox.y === 'number' &&
                        typeof visual.boundingBox.width === 'number' &&
                        typeof visual.boundingBox.height === 'number';

  const hasTimestamp = typeof visual.timestamp === 'number';

  // Screenshot is optional but recommended
  const hasScreenshot = typeof visual.screenshot === 'string' && visual.screenshot.length > 0;

  // Must have position, bounding box, and timestamp
  // Screenshot is nice to have but not required
  return hasPosition && hasBoundingBox && hasTimestamp;
}

