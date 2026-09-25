import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Coding World API',
      version: '1.0.0',
      description:
        'Production-ready backend API for Coding World platform — LMS, coding practice, social networking, and real-time collaboration.',
      contact: {
        name: 'Coding World Team',
        email: 'api@codingworld.in',
        url: 'https://www.codingworld.in',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `${env.APP_URL}/api/v1`,
        description: 'Current server',
      },
      {
        url: 'https://api.codingworld.in/api/v1',
        description: 'Production',
      },
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Local development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Something went wrong' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & authorization' },
      { name: 'Users', description: 'User management & profiles' },
      { name: 'Courses', description: 'LMS course management' },
      { name: 'Sections', description: 'Course sections' },
      { name: 'Lectures', description: 'Course lectures' },
      { name: 'Enrollments', description: 'Course enrollments' },
      { name: 'Payments', description: 'Orders & payment processing' },
      { name: 'Bootcamps', description: 'Bootcamp management' },
      { name: 'Problems', description: 'Coding problems' },
      { name: 'Submissions', description: 'Code submissions' },
      { name: 'Rankings', description: 'Leaderboards & rankings' },
      { name: 'Posts', description: 'Social feed & posts' },
      { name: 'Comments', description: 'Comments & replies' },
      { name: 'Reactions', description: 'Post & comment reactions' },
      { name: 'Connections', description: 'Developer connections' },
      { name: 'Notifications', description: 'User notifications' },
      { name: 'Chat', description: 'Messaging & chat' },
      { name: 'Live', description: 'Live developers' },
      { name: 'Collaboration', description: 'Collaboration sessions' },
      { name: 'Notes', description: 'Lecture notes' },
      { name: 'Search', description: 'Global search' },
      { name: 'Admin', description: 'Admin panel APIs' },
      { name: 'Health', description: 'Health check' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
