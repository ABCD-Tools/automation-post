import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedVisualExecutor } from './enhanced-visual-executor.js';
import fs from 'fs';
import path from 'path';

describe('EnhancedVisualExecutor', () => {
  let mockPage;
  let executor;
  const screenshotDir = './test-screenshots';

  beforeEach(() => {
    // Create mock page object
    mockPage = {
      $: vi.fn(),
      $$: vi.fn(),
      evaluate: vi.fn(),
      evaluateHandle: vi.fn(),
      waitForSelector: vi.fn(),
      waitForTimeout: vi.fn(),
      screenshot: vi.fn(),
      mouse: {
        move: vi.fn(),
        click: vi.fn(),
      },
      goto: vi.fn(),
    };

    // Create executor with test configuration
    executor = new EnhancedVisualExecutor(mockPage, {
      screenshotDir,
      maxRetries: 2,
      retryDelay: 100,
      initialPositionTolerance: 15,
      relaxedPositionTolerance: 30,
      initialSimilarityThreshold: 0.7,
      relaxedSimilarityThreshold: 0.5,
    });

    // Ensure screenshot directory exists
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test screenshots
    if (fs.existsSync(screenshotDir)) {
      const files = fs.readdirSync(screenshotDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(screenshotDir, file));
      });
      fs.rmdirSync(screenshotDir);
    }
  });

  describe('Enhanced Features', () => {
    it('should initialize with enhanced statistics', () => {
      const stats = executor.getEnhancedStats();
      
      expect(stats.enhanced).toBeDefined();
      expect(stats.enhanced.totalActions).toBe(0);
      expect(stats.enhanced.successfulActions).toBe(0);
      expect(stats.enhanced.failedActions).toBe(0);
      expect(stats.enhanced.retriedActions).toBe(0);
    });

    it('should initialize with default options', () => {
      expect(executor.options.screenshotOnError).toBe(true);
      expect(executor.options.enableRetry).toBe(true);
      expect(executor.options.maxRetries).toBe(2);
      expect(executor.options.initialPositionTolerance).toBe(15);
      expect(executor.options.relaxedPositionTolerance).toBe(30);
    });
  });

  describe('Retry Logic with Relaxed Thresholds', () => {
    it('should calculate relaxed position tolerance based on retry attempt', () => {
      // First attempt (no retry)
      expect(executor.getPositionTolerance(0)).toBe(15);
      
      // First retry
      const tolerance1 = executor.getPositionTolerance(1);
      expect(tolerance1).toBeGreaterThan(15);
      expect(tolerance1).toBeLessThanOrEqual(30);
      
      // Second retry
      const tolerance2 = executor.getPositionTolerance(2);
      expect(tolerance2).toBeGreaterThan(tolerance1);
      expect(tolerance2).toBeLessThanOrEqual(30);
    });

    it('should calculate relaxed similarity threshold based on retry attempt', () => {
      // First attempt (no retry)
      expect(executor.getSimilarityThreshold(0)).toBe(0.7);
      
      // First retry
      const threshold1 = executor.getSimilarityThreshold(1);
      expect(threshold1).toBeLessThan(0.7);
      expect(threshold1).toBeGreaterThanOrEqual(0.5);
      
      // Second retry
      const threshold2 = executor.getSimilarityThreshold(2);
      expect(threshold2).toBeLessThan(threshold1);
      expect(threshold2).toBeGreaterThanOrEqual(0.5);
    });

    it('should retry failed actions with relaxed thresholds', async () => {
      const action = {
        type: 'click',
        name: 'Click Button',
        params: {
          backup_selector: '.test-button',
          visual: {
            text: 'Click Me',
            position: {
              absolute: { x: 100, y: 200 },
              relative: { x: 50, y: 50 },
            },
          },
        },
      };

      // Mock selector to fail first time, succeed second time
      let attempts = 0;
      mockPage.waitForSelector.mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Element not found');
        }
        return Promise.resolve();
      });
      
      mockPage.$.mockImplementation(() => {
        if (attempts === 1) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          click: vi.fn(),
        });
      });

      mockPage.evaluate.mockResolvedValue('Click Me');

      const result = await executor.executeAction(action);

      expect(result.retryCount).toBeGreaterThan(0);
      expect(result.success).toBe(true);
      expect(executor.enhancedStats.retriedActions).toBeGreaterThan(0);
    });
  });

  describe('Detailed Error Logging', () => {
    it('should capture screenshot on error', async () => {
      const action = {
        type: 'click',
        name: 'Click Button',
        params: {
          backup_selector: '.nonexistent-button',
        },
      };

      mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));
      mockPage.$.mockResolvedValue(null);
      mockPage.screenshot.mockResolvedValue(undefined);
      mockPage.evaluate.mockResolvedValue({
        url: 'http://test.com',
        title: 'Test Page',
        viewport: { width: 1920, height: 1080 },
        elementCount: 100,
        visibleText: 'Test content',
      });

      const result = await executor.executeAction(action);

      expect(result.success).toBe(false);
      expect(result.errorDetails).toBeDefined();
      expect(result.errorDetails.screenshotPath).toBeTruthy();
      expect(mockPage.screenshot).toHaveBeenCalled();
    });

    it('should capture page state on error', async () => {
      const action = {
        type: 'click',
        name: 'Click Button',
        params: {
          backup_selector: '.nonexistent-button',
        },
      };

      const mockPageState = {
        url: 'http://test.com',
        title: 'Test Page',
        viewport: { width: 1920, height: 1080 },
        elementCount: 100,
        visibleText: 'Test content',
      };

      mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));
      mockPage.$.mockResolvedValue(null);
      mockPage.screenshot.mockResolvedValue(undefined);
      mockPage.evaluate.mockResolvedValue(mockPageState);

      const result = await executor.executeAction(action);

      expect(result.success).toBe(false);
      expect(result.errorDetails.pageState).toEqual(mockPageState);
    });

    it('should categorize errors correctly', () => {
      expect(executor.categorizeError('Timeout exceeded')).toBe('timeout');
      expect(executor.categorizeError('Element not found')).toBe('element_not_found');
      expect(executor.categorizeError('Text mismatch detected')).toBe('text_mismatch');
      expect(executor.categorizeError('Position does not match')).toBe('position_mismatch');
      expect(executor.categorizeError('Visual comparison failed')).toBe('visual_mismatch');
      expect(executor.categorizeError('Selector failed')).toBe('selector_failed');
      expect(executor.categorizeError('Unknown error')).toBe('unknown');
    });

    it('should maintain error log', async () => {
      const action = {
        type: 'click',
        name: 'Click Button',
        params: {
          backup_selector: '.nonexistent-button',
        },
      };

      mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));
      mockPage.$.mockResolvedValue(null);
      mockPage.screenshot.mockResolvedValue(undefined);
      mockPage.evaluate.mockResolvedValue({
        url: 'http://test.com',
        title: 'Test Page',
        viewport: { width: 1920, height: 1080 },
        elementCount: 100,
        visibleText: 'Test content',
      });

      await executor.executeAction(action);

      const errorLog = executor.getErrorLog();
      expect(errorLog.length).toBe(1);
      expect(errorLog[0].actionName).toBe('Click Button');
      expect(errorLog[0].errorType).toBeDefined();
    });
  });

  describe('Method Tracking and Statistics', () => {
    it('should track successful action by method', async () => {
      const action = {
        type: 'click',
        name: 'Click Button',
        params: {
          backup_selector: '.test-button',
          visual: {
            text: 'Click Me',
          },
        },
      };

      mockPage.waitForSelector.mockResolvedValue(undefined);
      mockPage.$.mockResolvedValue({
        click: vi.fn(),
      });
      mockPage.evaluate.mockResolvedValue('Click Me');

      const result = await executor.executeAction(action);

      expect(result.success).toBe(true);
      
      const stats = executor.getEnhancedStats();
      expect(stats.enhanced.totalActions).toBe(1);
      expect(stats.enhanced.successfulActions).toBe(1);
      expect(stats.enhanced.failedActions).toBe(0);
      expect(stats.enhanced.methodBreakdown.selector).toBe(1);
    });

    it('should track performance metrics', async () => {
      const action = {
        type: 'click',
        name: 'Click Button',
        params: {
          backup_selector: '.test-button',
        },
      };

      mockPage.waitForSelector.mockResolvedValue(undefined);
      mockPage.$.mockResolvedValue({
        click: vi.fn(),
      });
      mockPage.evaluate.mockResolvedValue('Click Me');

      await executor.executeAction(action);

      const stats = executor.getEnhancedStats();
      expect(stats.enhanced.performance.average).toBeDefined();
      expect(stats.enhanced.performance.min).toBeDefined();
      expect(stats.enhanced.performance.max).toBeDefined();
    });

    it('should track retry statistics', async () => {
      const action = {
        type: 'click',
        name: 'Click Button',
        params: {
          backup_selector: '.test-button',
        },
      };

      let attempts = 0;
      mockPage.waitForSelector.mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Not found');
        }
        return Promise.resolve();
      });

      mockPage.$.mockImplementation(() => {
        if (attempts < 2) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          click: vi.fn(),
        });
      });

      mockPage.evaluate.mockResolvedValue('Click Me');

      await executor.executeAction(action);

      const stats = executor.getEnhancedStats();
      expect(stats.enhanced.retriedActions).toBeGreaterThan(0);
      expect(stats.enhanced.retriesByAttempt[1]).toBeGreaterThan(0);
    });

    it('should calculate success rate correctly', async () => {
      const action1 = {
        type: 'click',
        name: 'Action 1',
        params: { backup_selector: '.button1' },
      };

      const action2 = {
        type: 'click',
        name: 'Action 2',
        params: { backup_selector: '.button2' },
      };

      // First action succeeds
      mockPage.waitForSelector.mockResolvedValueOnce(undefined);
      mockPage.$.mockResolvedValueOnce({
        click: vi.fn(),
      });
      mockPage.evaluate.mockResolvedValueOnce('Button 1');

      await executor.executeAction(action1);

      // Second action fails
      mockPage.waitForSelector.mockRejectedValue(new Error('Not found'));
      mockPage.$.mockResolvedValue(null);
      mockPage.screenshot.mockResolvedValue(undefined);
      mockPage.evaluate.mockResolvedValue({
        url: 'http://test.com',
        title: 'Test',
        viewport: { width: 1920, height: 1080 },
        elementCount: 50,
        visibleText: 'Test',
      });

      await executor.executeAction(action2);

      const stats = executor.getEnhancedStats();
      expect(stats.enhanced.totalActions).toBe(2);
      expect(stats.enhanced.successfulActions).toBe(1);
      expect(stats.enhanced.failedActions).toBe(1);
      expect(stats.enhanced.successRate).toBe('50.0%');
    });
  });

  describe('Statistics Export and Reporting', () => {
    it('should export statistics to JSON file', async () => {
      const exportPath = path.join(screenshotDir, 'stats.json');

      const action = {
        type: 'click',
        name: 'Click Button',
        params: { backup_selector: '.test-button' },
      };

      mockPage.waitForSelector.mockResolvedValue(undefined);
      mockPage.$.mockResolvedValue({ click: vi.fn() });
      mockPage.evaluate.mockResolvedValue('Click Me');

      await executor.executeAction(action);
      await executor.exportStats(exportPath);

      expect(fs.existsSync(exportPath)).toBe(true);

      const exportedData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      expect(exportedData.enhanced).toBeDefined();
      expect(exportedData.enhanced.totalActions).toBe(1);
    });

    it('should print statistics report without errors', async () => {
      const action = {
        type: 'click',
        name: 'Click Button',
        params: { backup_selector: '.test-button' },
      };

      mockPage.waitForSelector.mockResolvedValue(undefined);
      mockPage.$.mockResolvedValue({ click: vi.fn() });
      mockPage.evaluate.mockResolvedValue('Click Me');

      await executor.executeAction(action);

      // Should not throw
      expect(() => executor.printStatsReport()).not.toThrow();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all statistics and error logs', async () => {
      const action = {
        type: 'click',
        name: 'Click Button',
        params: { backup_selector: '.test-button' },
      };

      mockPage.waitForSelector.mockResolvedValue(undefined);
      mockPage.$.mockResolvedValue({ click: vi.fn() });
      mockPage.evaluate.mockResolvedValue('Click Me');

      await executor.executeAction(action);

      let stats = executor.getEnhancedStats();
      expect(stats.enhanced.totalActions).toBe(1);

      executor.resetStats();

      stats = executor.getEnhancedStats();
      expect(stats.enhanced.totalActions).toBe(0);
      expect(stats.enhanced.successfulActions).toBe(0);
      expect(stats.enhanced.failedActions).toBe(0);
      expect(executor.getErrorLog().length).toBe(0);
    });
  });

  describe('Debug Mode', () => {
    it('should save debug screenshots when enabled', async () => {
      executor.options.saveDebugScreenshots = true;

      const action = {
        type: 'click',
        name: 'Click Button',
        params: { backup_selector: '.test-button' },
      };

      mockPage.waitForSelector.mockResolvedValue(undefined);
      mockPage.$.mockResolvedValue({ click: vi.fn() });
      mockPage.evaluate.mockResolvedValue('Click Me');
      mockPage.screenshot.mockResolvedValue(undefined);

      await executor.executeAction(action);

      // Should have called screenshot for before and after
      expect(mockPage.screenshot).toHaveBeenCalledTimes(2);
    });
  });
});
