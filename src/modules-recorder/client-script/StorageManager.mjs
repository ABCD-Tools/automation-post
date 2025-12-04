export const StorageManager = `
    // Storage for recorded actions
    if (!window.__recordedActions) {
      // Try to restore from sessionStorage first
      try {
        const stored = sessionStorage.getItem('__recordedActions');
        if (stored) {
          window.__recordedActions = JSON.parse(stored);
          console.log('✅ Restored ' + window.__recordedActions.length + ' actions from sessionStorage');
        } else {
          window.__recordedActions = [];
          console.log('✅ Recorder initialized');
        }
      } catch (e) {
        window.__recordedActions = [];
        console.log('✅ Recorder initialized (sessionStorage restore failed)');
      }
    } else {
      console.log('⚠️ Recorder already initialized');
    }

    // Sync to sessionStorage function
    function syncToStorage() {
      try {
        if (window.__recordedActions) {
          sessionStorage.setItem('__recordedActions', JSON.stringify(window.__recordedActions));
        }
      } catch (e) {
        console.warn('Failed to sync to sessionStorage:', e);
      }
    }
`;

