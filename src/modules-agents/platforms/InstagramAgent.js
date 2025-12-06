// Instagram agent

import { BaseAgent } from '../base/BaseAgent.js';

/**
 * Instagram Agent - Instagram workflow executor
 * 
 * Executes workflows for Instagram platform:
 * - auth: Login workflow
 * - post: Post photo workflow
 * - story: Post story workflow
 * - like: Like post workflow
 * - comment: Comment on post workflow
 * - follow: Follow user workflow
 * - unfollow: Unfollow user workflow
 * 
 * All functionality is workflow-based, not hardcoded.
 */
export class InstagramAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      platform: 'instagram',
      // Instagram-specific defaults
      viewport: options.viewport || { width: 1920, height: 1080 },
    });
    
    this.baseUrl = 'https://www.instagram.com';
  }
  
  /**
   * Run authentication workflow
   * @param {string} username - Instagram username
   * @param {string} password - Instagram password
   * @param {Object} options - Additional options (handle2FA, etc.)
   * @returns {Promise<Object>} Execution result
   */
  async runAuth(username, password, options = {}) {
    return await this.runWorkflow('auth', {
      username,
      password,
      ...options,
    });
  }
  
  /**
   * Run post photo workflow
   * @param {string} imagePath - Path to image file
   * @param {string} caption - Post caption
   * @returns {Promise<Object>} Execution result
   */
  async runPost(imagePath, caption = '') {
    return await this.runWorkflow('post', {
      imagePath,
      caption,
    });
  }
  
  /**
   * Run post story workflow
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} Execution result
   */
  async runStory(imagePath) {
    return await this.runWorkflow('story', {
      imagePath,
    });
  }
  
  /**
   * Run like post workflow
   * @param {string} postUrl - Post URL
   * @returns {Promise<Object>} Execution result
   */
  async runLike(postUrl) {
    return await this.runWorkflow('like', {
      postUrl,
    });
  }
  
  /**
   * Run comment workflow
   * @param {string} postUrl - Post URL
   * @param {string} text - Comment text
   * @returns {Promise<Object>} Execution result
   */
  async runComment(postUrl, text) {
    return await this.runWorkflow('comment', {
      postUrl,
      text,
    });
  }
  
  /**
   * Run follow user workflow
   * @param {string} username - Instagram username
   * @returns {Promise<Object>} Execution result
   */
  async runFollow(username) {
    return await this.runWorkflow('follow', {
      username,
    });
  }
  
  /**
   * Run unfollow user workflow
   * @param {string} username - Instagram username
   * @returns {Promise<Object>} Execution result
   */
  async runUnfollow(username) {
    return await this.runWorkflow('unfollow', {
      username,
    });
  }
}
