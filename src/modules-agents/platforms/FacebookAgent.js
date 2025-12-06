// Facebook agent

import { BaseAgent } from '../base/BaseAgent.js';

/**
 * Facebook Agent - Facebook workflow executor
 * 
 * Executes workflows for Facebook platform:
 * - auth: Login workflow
 * - post_timeline: Post to timeline workflow
 * - post_page: Post to page workflow
 * - post_group: Post to group workflow
 * - react: React to post workflow
 * 
 * All functionality is workflow-based, not hardcoded.
 */
export class FacebookAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      platform: 'facebook',
      viewport: options.viewport || { width: 1920, height: 1080 },
    });
    
    this.baseUrl = 'https://www.facebook.com';
  }
  
  /**
   * Run authentication workflow
   * @param {string} email - Facebook email
   * @param {string} password - Facebook password
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Execution result
   */
  async runAuth(email, password, options = {}) {
    return await this.runWorkflow('auth', {
      email,
      password,
      ...options,
    });
  }
  
  /**
   * Run post to timeline workflow
   * @param {string} content - Post content
   * @param {string} imagePath - Optional image path
   * @returns {Promise<Object>} Execution result
   */
  async runPostToTimeline(content, imagePath = null) {
    return await this.runWorkflow('post_timeline', {
      content,
      imagePath,
    });
  }
  
  /**
   * Run post to page workflow
   * @param {string} pageId - Page ID or username
   * @param {string} content - Post content
   * @param {string} imagePath - Optional image path
   * @returns {Promise<Object>} Execution result
   */
  async runPostToPage(pageId, content, imagePath = null) {
    return await this.runWorkflow('post_page', {
      pageId,
      content,
      imagePath,
    });
  }
  
  /**
   * Run post to group workflow
   * @param {string} groupId - Group ID
   * @param {string} content - Post content
   * @param {string} imagePath - Optional image path
   * @returns {Promise<Object>} Execution result
   */
  async runPostToGroup(groupId, content, imagePath = null) {
    return await this.runWorkflow('post_group', {
      groupId,
      content,
      imagePath,
    });
  }
  
  /**
   * Run react to post workflow
   * @param {string} postUrl - Post URL
   * @param {string} reaction - Reaction type (like, love, haha, wow, sad, angry)
   * @returns {Promise<Object>} Execution result
   */
  async runReact(postUrl, reaction = 'like') {
    return await this.runWorkflow('react', {
      postUrl,
      reaction,
    });
  }
}
