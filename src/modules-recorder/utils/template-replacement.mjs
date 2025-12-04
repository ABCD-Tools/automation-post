/**
 * Replace actual values with template variables
 * @param {string} value - Actual value
 * @param {Object} elementInfo - Element information
 * @returns {string} Template variable or original value
 */
export function replaceWithTemplate(value, elementInfo) {
  if (!value) return '';

  // Password fields
  if (
    elementInfo.type === 'password' ||
    (elementInfo.name && /password/i.test(elementInfo.name)) ||
    (elementInfo.id && /password/i.test(elementInfo.id))
  ) {
    return '{{password}}';
  }

  // Username fields
  if (
    (elementInfo.name && /username|user|login/i.test(elementInfo.name)) ||
    (elementInfo.id && /username|user|login/i.test(elementInfo.id)) ||
    (elementInfo.placeholder && /username|user|login/i.test(elementInfo.placeholder))
  ) {
    return '{{username}}';
  }

  // Email fields
  if (
    elementInfo.type === 'email' ||
    (elementInfo.name && /email|e-mail/i.test(elementInfo.name)) ||
    (elementInfo.id && /email|e-mail/i.test(elementInfo.id)) ||
    (elementInfo.placeholder && /email|e-mail/i.test(elementInfo.placeholder))
  ) {
    return '{{email}}';
  }

  // Text areas and content inputs (likely captions/posts)
  if (elementInfo.tag === 'textarea' || (elementInfo.name && /caption|post|content|message|text/i.test(elementInfo.name))) {
    return '{{caption}}';
  }

  // Return original value if no template match
  return value;
}

