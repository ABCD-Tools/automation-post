export const RecorderCore = `
  try {
    // Prevent double injection
    if (window.__actionRecorderInjected) {
      console.log('⚠️ Recorder already initialized');
      return;
    }
    window.__actionRecorderInjected = true;

    // Basic storage bootstrap (detailed restore in StorageManager)
    if (!window.__recordedActions) {
      window.__recordedActions = [];
      console.log('✅ Recorder storage initialized');
    }

    // Helper: Get element info
    function getElementInfo(element) {
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        name: element.name || null,
        type: element.type || null,
        placeholder: element.placeholder || null,
        text: element.textContent?.trim().substring(0, 100) || null,
        value: element.value || null,
        className: element.className || null,
        href: element.href || null,
      };
    }

    // Helper: Check if element is password field
    function isPasswordField(element) {
      return element.type === 'password' || 
             (element.name && /password/i.test(element.name)) ||
             (element.id && /password/i.test(element.id));
    }

    // Helper: Check if element is username field
    function isUsernameField(element) {
      return (element.name && /username|user|login/i.test(element.name)) ||
             (element.id && /username|user|login/i.test(element.id)) ||
             (element.placeholder && /username|user|login/i.test(element.placeholder));
    }

    // Helper: Check if element is email field
    function isEmailField(element) {
      return element.type === 'email' ||
             (element.name && /email|e-mail/i.test(element.name)) ||
             (element.id && /email|e-mail/i.test(element.id)) ||
             (element.placeholder && /email|e-mail/i.test(element.placeholder));
    }

    // Record action with emoji indicators
    function recordAction(type, data) {
      const action = {
        type,
        timestamp: Date.now(),
        url: window.location.href,
        ...data,
      };
      if (!window.__recordedActions) {
        window.__recordedActions = [];
      }
      window.__recordedActions.push(action);
      
      // Sync to sessionStorage after each action
      if (typeof syncToStorage === 'function') {
        syncToStorage();
      }
      
      // Update overlay with new action count
      if (typeof updateOverlay === 'function') {
        updateOverlay();
      }
      
      // Emoji indicators for each action type
      const emojiMap = {
        'click': '🎯',
        'type': '⌨️',
        'submit': '📤',
        'upload': '📁',
        'navigate': '🧭',
        'scroll': '📜'
      };
      
      const emoji = emojiMap[type] || '📹';
      const selector = data.backup_selector || data.selector || 'unknown';
      console.log(emoji + ' Recorded ' + type + ': ' + selector);
    }
`;

