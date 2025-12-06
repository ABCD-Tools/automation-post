// Twitter agent

import { BaseAgent } from '../base/BaseAgent.js';

/**
 * Twitter Agent - Twitter/X workflow executor
 * 
 * Executes workflows for Twitter/X platform:
 * - auth: Login workflow
 * - tweet: Post tweet workflow
 * - retweet: Retweet workflow
 * - like: Like tweet workflow
 * - reply: Reply to tweet workflow
 * - follow: Follow user workflow
 * 
 * All functionality is workflow-based, not hardcoded.
 */
export class TwitterAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      platform: 'twitter',
      viewport: options.viewport || { width: 1920, height: 1080 },
    });
    
    this.baseUrl = 'https://twitter.com';
  }
  
  /**
   * Run authentication workflow
   * @param {string} username - Twitter username or email
   * @param {string} password - Twitter password
   * @param {Object} options - Additional options
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
   * Run tweet workflow
   * @param {string} text - Tweet text (max 280 characters)
   * @param {string} imagePath - Optional image path
   * @returns {Promise<Object>} Execution result
   */
  async runTweet(text, imagePath = null) {
    if (text.length > 280) {
      throw new Error('Tweet text exceeds 280 character limit');
    }
    
    return await this.runWorkflow('tweet', {
      text,
      imagePath,
    });
  }
  
  /**
   * Run retweet workflow
   * @param {string} tweetUrl - Tweet URL
   * @returns {Promise<Object>} Execution result
   */
  async runRetweet(tweetUrl) {
    return await this.runWorkflow('retweet', {
      tweetUrl,
    });
  }
  
  /**
   * Run like tweet workflow
   * @param {string} tweetUrl - Tweet URL
   * @returns {Promise<Object>} Execution result
   */
  async runLike(tweetUrl) {
    return await this.runWorkflow('like', {
      tweetUrl,
    });
  }
  
  /**
   * Run reply to tweet workflow
   * @param {string} tweetUrl - Tweet URL
   * @param {string} text - Reply text
   * @returns {Promise<Object>} Execution result
   */
  async runReply(tweetUrl, text) {
    return await this.runWorkflow('reply', {
      tweetUrl,
      text,
    });
  }
  
  /**
   * Run follow user workflow
   * @param {string} username - Twitter username
   * @returns {Promise<Object>} Execution result
   */
  async runFollow(username) {
    return await this.runWorkflow('follow', {
      username,
    });
  }
}
