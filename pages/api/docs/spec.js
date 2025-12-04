import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Post Automation Platform API',
      version: '1.0.0',
      description: 'API documentation for the Post Automation Platform - A web-based platform for automating social media posts',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login',
        },
        apiToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Token',
          description: 'API token for client agent authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
        MicroAction: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Micro-action UUID',
            },
            name: {
              type: 'string',
              example: 'Click Login Button',
            },
            description: {
              type: 'string',
              example: 'Clicks the login button on Instagram',
            },
            type: {
              type: 'string',
              enum: ['click', 'type', 'wait', 'navigate', 'upload', 'extract', 'scroll', 'screenshot'],
            },
            platform: {
              type: 'string',
              enum: ['instagram', 'facebook', 'twitter', 'all'],
            },
            params: {
              type: 'object',
              description: 'Action parameters (JSONB). For visual actions, includes visual data and execution_method.',
              properties: {
                visual: {
                  type: 'object',
                  description: 'Visual recording data for robust element finding',
                  properties: {
                    screenshot: {
                      type: 'string',
                      format: 'base64',
                      description: 'Base64 encoded screenshot (optimized: 80% quality, max 400x400px). Recommended size: <100KB per action.',
                      example: 'data:image/png;base64,iVBORw0KGgo...',
                    },
                    contextScreenshot: {
                      type: 'string',
                      format: 'base64',
                      description: 'Screenshot of surrounding area (optional)',
                    },
                    text: {
                      type: 'string',
                      description: 'Visible text content of element',
                      example: 'Log In',
                    },
                    position: {
                      type: 'object',
                      properties: {
                        absolute: {
                          type: 'object',
                          properties: {
                            x: { type: 'number', example: 640 },
                            y: { type: 'number', example: 450 },
                          },
                        },
                        relative: {
                          type: 'object',
                          properties: {
                            x: { type: 'number', example: 50 },
                            y: { type: 'number', example: 62.5 },
                          },
                          description: 'Position as percentage of viewport',
                        },
                      },
                    },
                    boundingBox: {
                      type: 'object',
                      properties: {
                        x: { type: 'number' },
                        y: { type: 'number' },
                        width: { type: 'number' },
                        height: { type: 'number' },
                      },
                    },
                    surroundingText: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Text from nearby elements for context',
                      example: ['Instagram', 'Sign up'],
                    },
                    timestamp: {
                      type: 'number',
                      description: 'Recording timestamp',
                    },
                  },
                },
                backup_selector: {
                  type: 'string',
                  description: 'CSS selector as fallback (optional, for fast execution)',
                  example: "button[type='submit']",
                },
                execution_method: {
                  type: 'string',
                  enum: ['selector_first', 'visual_first', 'visual_only'],
                  description: 'Execution strategy: selector_first (fast), visual_first (robust), visual_only (most robust)',
                  default: 'visual_first',
                },
              },
            },
            created_by: {
              type: 'string',
              format: 'uuid',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
            version: {
              type: 'string',
              example: '1.0.0',
            },
            is_active: {
              type: 'boolean',
            },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Accounts', description: 'Social media account management' },
      { name: 'Posts', description: 'Post creation and management' },
      { name: 'Jobs', description: 'Job queue and status tracking' },
      { name: 'Client', description: 'Client agent endpoints' },
      { name: 'Clients', description: 'Client management (admin)' },
      { name: 'Admin', description: 'Administrative endpoints' },
      { name: 'Installer', description: 'Client installer endpoints' },
    ],
  },
  apis: [
    path.join(process.cwd(), 'pages/api/**/*.js'),
    './pages/api/**/*.js', // Fallback relative path
  ],
};

let swaggerSpec;

try {
  swaggerSpec = swaggerJsdoc(options);
} catch (error) {
  console.error('Swagger spec generation error:', error);
  // Fallback to basic spec if generation fails
  swaggerSpec = {
    openapi: '3.0.0',
    info: options.definition.info,
    servers: options.definition.servers,
    components: options.definition.components,
    tags: options.definition.tags,
    paths: {},
  };
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(swaggerSpec);
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: 'Method not allowed' });
  }
}

