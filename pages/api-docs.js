import dynamic from 'next/dynamic';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

const spec = {
  openapi: '3.0.0',
  info: {
    title: 'Post Automation Platform API',
    version: '1.0.0',
    description: 'MVP auth endpoints for registration and login.',
  },
  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Registration successful',
          },
          400: {
            description: 'Validation or Supabase error',
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
          },
          400: {
            description: 'Invalid credentials or Supabase error',
          },
        },
      },
    },
  },
};

export default function ApiDocsPage() {
  return <SwaggerUI spec={spec} />;
}


