import { env } from './env';

const sectionFivePaths = {
  '/auth/register': {
    post: {
      operationId: 'register',
      summary: 'Create a member account and session',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } },
        },
      },
      responses: {
        '201': {
          description: 'The member and opaque cookie session were created.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
          },
        },
        '409': { $ref: '#/components/responses/IdentityConflict' },
        '422': { $ref: '#/components/responses/ValidationError' },
        '429': { $ref: '#/components/responses/RateLimitExceeded' },
      },
    },
  },
  '/auth/login': {
    post: {
      operationId: 'login',
      summary: 'Authenticate and create a session',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } },
        },
      },
      responses: {
        '200': {
          description: 'Authentication succeeded and session cookies were set.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
          },
        },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
        '422': { $ref: '#/components/responses/ValidationError' },
        '429': { $ref: '#/components/responses/RateLimitExceeded' },
      },
    },
  },
  '/auth/logout': {
    post: {
      operationId: 'logout',
      summary: 'Revoke the current session',
      tags: ['Authentication'],
      security: [{ sessionCookie: [] }],
      parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
      responses: {
        '204': { description: 'The session was revoked and cookies were cleared.' },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
        '403': { $ref: '#/components/responses/CsrfInvalid' },
      },
    },
  },
  '/auth/forgot-password': {
    post: {
      operationId: 'forgotPassword',
      summary: 'Prepare a password-reset email',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/EmailInput' } },
        },
      },
      responses: {
        '200': {
          description: 'A non-enumerating acknowledgement.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AccountMessage' } },
          },
        },
        '422': { $ref: '#/components/responses/ValidationError' },
        '429': { $ref: '#/components/responses/RateLimitExceeded' },
      },
    },
  },
  '/auth/reset-password': {
    post: {
      operationId: 'resetPassword',
      summary: 'Reset a password with a one-time token',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordInput' } },
        },
      },
      responses: {
        '200': {
          description: 'The password was replaced and existing sessions were revoked.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AccountMessage' } },
          },
        },
        '422': { $ref: '#/components/responses/ValidationError' },
        '429': { $ref: '#/components/responses/RateLimitExceeded' },
      },
    },
  },
  '/auth/verify-email': {
    post: {
      operationId: 'verifyEmail',
      summary: 'Verify an email with a one-time token',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/VerifyEmailInput' } },
        },
      },
      responses: {
        '200': {
          description: 'The member email was verified.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AccountMessage' } },
          },
        },
        '422': { $ref: '#/components/responses/ValidationError' },
        '429': { $ref: '#/components/responses/RateLimitExceeded' },
      },
    },
  },
  '/users/me': {
    get: {
      operationId: 'getCurrentMember',
      summary: 'Get the authenticated member profile',
      tags: ['Members'],
      security: [{ sessionCookie: [] }],
      responses: {
        '200': {
          description: 'The current member profile and account statistics.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/MemberProfileResponse' } },
          },
        },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
      },
    },
    patch: {
      operationId: 'updateCurrentMember',
      summary: 'Update the authenticated member profile',
      tags: ['Members'],
      security: [{ sessionCookie: [] }],
      parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ProfileUpdateInput' } },
        },
      },
      responses: {
        '200': {
          description: 'The updated profile.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/MemberProfileResponse' } },
          },
        },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
        '403': { $ref: '#/components/responses/CsrfInvalid' },
        '409': { $ref: '#/components/responses/IdentityConflict' },
        '422': { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/users/me/bookings': {
    get: {
      operationId: 'getCurrentMemberBookings',
      summary: 'Get booking history',
      tags: ['Members'],
      security: [{ sessionCookie: [] }],
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: [
              'PENDING_PAYMENT',
              'CONFIRMED',
              'COMPLETED',
              'CANCELLATION_REQUESTED',
              'CANCELLED',
              'REFUNDED',
              'EXPIRED',
            ],
          },
        },
      ],
      responses: {
        '200': {
          description: 'Paginated booking history owned by the current member.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BookingHistoryResponse' } },
          },
        },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
        '422': { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/users/me/wishlist': {
    get: {
      operationId: 'getCurrentMemberWishlist',
      summary: 'Get saved tours',
      tags: ['Wishlists'],
      security: [{ sessionCookie: [] }],
      responses: {
        '200': {
          description: 'Published tours saved by the current member.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/WishlistResponse' } },
          },
        },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
      },
    },
  },
  '/users/me/wishlist/{tourId}': {
    put: {
      operationId: 'addCurrentMemberWishlistTour',
      summary: 'Save a tour idempotently',
      tags: ['Wishlists'],
      security: [{ sessionCookie: [] }],
      parameters: [
        { $ref: '#/components/parameters/WishlistTourId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      responses: {
        '200': {
          description: 'The saved tour.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data'],
                properties: { data: { $ref: '#/components/schemas/TourSummary' } },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
        '403': { $ref: '#/components/responses/CsrfInvalid' },
        '404': { $ref: '#/components/responses/TourNotFound' },
        '422': { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      operationId: 'removeCurrentMemberWishlistTour',
      summary: 'Remove a saved tour idempotently',
      tags: ['Wishlists'],
      security: [{ sessionCookie: [] }],
      parameters: [
        { $ref: '#/components/parameters/WishlistTourId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      responses: {
        '204': { description: 'The tour is no longer in the wishlist.' },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
        '403': { $ref: '#/components/responses/CsrfInvalid' },
        '422': { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
} as const;

const sectionFiveSchemas = {
  Member: {
    type: 'object',
    required: [
      'id',
      'email',
      'username',
      'firstName',
      'lastName',
      'role',
      'emailVerified',
      'createdAt',
    ],
    properties: {
      id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
      email: { type: 'string', format: 'email' },
      username: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      phone: { type: 'string' },
      location: { type: 'string' },
      avatarUrl: { type: 'string', format: 'uri' },
      role: { type: 'string', enum: ['USER', 'ADMIN'] },
      emailVerified: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  AuthResponse: {
    type: 'object',
    required: ['data'],
    properties: { data: { $ref: '#/components/schemas/Member' } },
  },
  MemberProfile: {
    allOf: [
      { $ref: '#/components/schemas/Member' },
      {
        type: 'object',
        required: ['stats'],
        properties: {
          stats: {
            type: 'object',
            required: ['bookings', 'wishlist'],
            properties: {
              bookings: { type: 'integer', minimum: 0 },
              wishlist: { type: 'integer', minimum: 0 },
            },
          },
        },
      },
    ],
  },
  MemberProfileResponse: {
    type: 'object',
    required: ['data'],
    properties: { data: { $ref: '#/components/schemas/MemberProfile' } },
  },
  RegisterInput: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'username', 'password', 'firstName', 'lastName'],
    properties: {
      email: { type: 'string', format: 'email', maxLength: 254 },
      username: {
        type: 'string',
        minLength: 3,
        maxLength: 40,
        pattern: '^[A-Za-z0-9_]+$',
      },
      password: { type: 'string', minLength: 8, maxLength: 128, writeOnly: true },
      firstName: { type: 'string', minLength: 1, maxLength: 80 },
      lastName: { type: 'string', minLength: 1, maxLength: 80 },
    },
  },
  LoginInput: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 1, maxLength: 128, writeOnly: true },
    },
  },
  EmailInput: {
    type: 'object',
    additionalProperties: false,
    required: ['email'],
    properties: { email: { type: 'string', format: 'email' } },
  },
  ResetPasswordInput: {
    type: 'object',
    additionalProperties: false,
    required: ['token', 'password'],
    properties: {
      token: { type: 'string', minLength: 40, writeOnly: true },
      password: { type: 'string', minLength: 8, maxLength: 128, writeOnly: true },
    },
  },
  VerifyEmailInput: {
    type: 'object',
    additionalProperties: false,
    required: ['token'],
    properties: { token: { type: 'string', minLength: 40, writeOnly: true } },
  },
  ProfileUpdateInput: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      email: { type: 'string', format: 'email', maxLength: 254 },
      username: { type: 'string', minLength: 3, maxLength: 40 },
      firstName: { type: 'string', minLength: 1, maxLength: 80 },
      lastName: { type: 'string', minLength: 1, maxLength: 80 },
      phone: { type: 'string', maxLength: 30 },
      location: { type: 'string', maxLength: 160 },
      avatarUrl: { type: 'string', maxLength: 2048 },
    },
  },
  AccountMessage: {
    type: 'object',
    required: ['message'],
    properties: { message: { type: 'string' } },
  },
  MemberBooking: {
    type: 'object',
    required: [
      'id',
      'reference',
      'status',
      'tourId',
      'departureId',
      'travelers',
      'totalCents',
      'currency',
      'holdExpiresAt',
      'createdAt',
      'tour',
    ],
    properties: {
      id: { type: 'string' },
      reference: { type: 'string' },
      status: { type: 'string' },
      tourId: { type: 'integer' },
      departureId: { type: 'string' },
      travelers: { type: 'integer', minimum: 1 },
      totalCents: { type: 'integer', minimum: 0 },
      currency: { type: 'string', pattern: '^[A-Z]{3}$' },
      holdExpiresAt: { type: 'string', format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
      tour: {
        oneOf: [{ $ref: '#/components/schemas/TourSummary' }, { type: 'null' }],
      },
    },
  },
  BookingHistoryResponse: {
    type: 'object',
    required: ['data', 'meta'],
    properties: {
      data: { type: 'array', items: { $ref: '#/components/schemas/MemberBooking' } },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
  },
  WishlistResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: { type: 'array', items: { $ref: '#/components/schemas/TourSummary' } },
    },
  },
} as const;

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Cavora API',
    version: '1.0.0',
    description:
      'REST API for Cavora travel discovery, tour availability, accounts, bookings, and payments.',
  },
  servers: [{ url: '/cavora', description: 'Cavora API' }],
  tags: [
    { name: 'System', description: 'Service health and API documentation.' },
    { name: 'Home', description: 'Homepage content and curated tours.' },
    { name: 'Tours', description: 'Tour discovery, details, and availability.' },
    { name: 'Authentication', description: 'Member identity and opaque sessions.' },
    { name: 'Members', description: 'Authenticated member account operations.' },
    { name: 'Wishlists', description: 'Authenticated saved-tour operations.' },
  ],
  paths: {
    '/health': {
      get: {
        operationId: 'getHealth',
        summary: 'Get service health',
        tags: ['System'],
        responses: {
          '200': {
            description: 'The application and database are available.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
          '503': {
            description: 'The application is available but a dependency is degraded.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/docs': {
      get: {
        operationId: 'getApiDocs',
        summary: 'Open Swagger UI',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Interactive Swagger UI.',
            content: {
              'text/html': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
    },
    '/openapi.json': {
      get: {
        operationId: 'getOpenApiDocument',
        summary: 'Get the OpenAPI document',
        tags: ['System'],
        responses: {
          '200': {
            description: 'The machine-readable OpenAPI document.',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/home': {
      get: {
        operationId: 'getHome',
        summary: 'Get homepage content',
        tags: ['Home'],
        responses: {
          '200': {
            description: 'Homepage content and curated tour collections.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HomeResponse' },
              },
            },
          },
          '429': { $ref: '#/components/responses/RateLimitExceeded' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/tours': {
      get: {
        operationId: 'getTours',
        summary: 'Search and filter tours',
        tags: ['Tours'],
        parameters: [
          {
            name: 'query',
            in: 'query',
            description: 'Search tour title, location, country, or place.',
            schema: { type: 'string', minLength: 1, maxLength: 120 },
          },
          {
            name: 'destination',
            in: 'query',
            schema: { type: 'string', minLength: 1, maxLength: 120 },
          },
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', minLength: 1, maxLength: 80 },
          },
          {
            name: 'minPrice',
            in: 'query',
            description: 'Minimum price in integer minor units.',
            schema: { type: 'integer', minimum: 0 },
          },
          {
            name: 'maxPrice',
            in: 'query',
            description: 'Maximum price in integer minor units.',
            schema: { type: 'integer', minimum: 0 },
          },
          {
            name: 'duration',
            in: 'query',
            schema: { type: 'string', enum: ['short', 'medium', 'long'] },
          },
          {
            name: 'minRating',
            in: 'query',
            schema: { type: 'number', minimum: 0, maximum: 5 },
          },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['price-asc', 'price-desc', 'rating', 'duration', 'popularity'],
              default: 'popularity',
            },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 9 },
          },
        ],
        responses: {
          '200': {
            description: 'A paginated list of matching tours.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TourListResponse' },
              },
            },
          },
          '422': { $ref: '#/components/responses/ValidationError' },
          '429': { $ref: '#/components/responses/RateLimitExceeded' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/tours/{id}': {
      get: {
        operationId: 'getTour',
        summary: 'Get complete tour details',
        tags: ['Tours'],
        parameters: [{ $ref: '#/components/parameters/TourId' }],
        responses: {
          '200': {
            description: 'Complete details for the requested tour.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TourDetailResponse' },
              },
            },
          },
          '404': { $ref: '#/components/responses/TourNotFound' },
          '422': { $ref: '#/components/responses/ValidationError' },
          '429': { $ref: '#/components/responses/RateLimitExceeded' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/tours/{id}/related': {
      get: {
        operationId: 'getRelatedTours',
        summary: 'Get related tours',
        tags: ['Tours'],
        parameters: [{ $ref: '#/components/parameters/TourId' }],
        responses: {
          '200': {
            description: 'Up to three related tours.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/TourSummary' },
                    },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/TourNotFound' },
          '422': { $ref: '#/components/responses/ValidationError' },
          '429': { $ref: '#/components/responses/RateLimitExceeded' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/tours/{id}/availability': {
      get: {
        operationId: 'getTourAvailability',
        summary: 'Get available tour departures',
        tags: ['Tours'],
        parameters: [
          { $ref: '#/components/parameters/TourId' },
          {
            name: 'travelers',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 1 },
          },
          {
            name: 'from',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'to',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
        ],
        responses: {
          '200': {
            description: 'Departures that can accept the requested number of travelers.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AvailabilityResponse' },
              },
            },
          },
          '404': { $ref: '#/components/responses/TourNotFound' },
          '422': { $ref: '#/components/responses/ValidationError' },
          '429': { $ref: '#/components/responses/RateLimitExceeded' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    ...sectionFivePaths,
  },
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: env.SESSION_COOKIE_NAME,
        description: 'Opaque session token. The server stores only its hash.',
      },
    },
    parameters: {
      TourId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Stable integer tour ID.',
        schema: { type: 'integer', minimum: 1 },
      },
      WishlistTourId: {
        name: 'tourId',
        in: 'path',
        required: true,
        description: 'Stable integer tour ID.',
        schema: { type: 'integer', minimum: 1 },
      },
      CsrfToken: {
        name: 'x-csrf-token',
        in: 'header',
        required: true,
        description: 'Must match the readable CSRF cookie issued with the session.',
        schema: { type: 'string' },
      },
    },
    responses: {
      ValidationError: {
        description: 'The request contains invalid fields.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      TourNotFound: {
        description: 'The requested tour does not exist.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      RateLimitExceeded: {
        description: 'Too many requests.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      InternalServerError: {
        description: 'An unexpected server error occurred.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      AuthenticationRequired: {
        description: 'A valid, unexpired session is required.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      CsrfInvalid: {
        description: 'The CSRF token is missing or invalid.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      IdentityConflict: {
        description: 'The email or username is already registered.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
    schemas: {
      ...sectionFiveSchemas,
      ErrorResponse: {
        type: 'object',
        required: ['status', 'code', 'message', 'requestId'],
        properties: {
          status: { type: 'integer' },
          code: { type: 'string' },
          message: { type: 'string' },
          fieldErrors: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          requestId: { type: 'string' },
        },
      },
      HealthResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { $ref: '#/components/schemas/HealthResult' },
        },
      },
      HealthResult: {
        type: 'object',
        required: ['status', 'service', 'environment', 'timestamp', 'checks'],
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded'] },
          service: { type: 'string', const: 'cavora-server' },
          environment: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          checks: {
            type: 'object',
            required: ['application', 'database'],
            properties: {
              application: { type: 'string', const: 'up' },
              database: {
                type: 'string',
                enum: ['connected', 'connecting', 'disconnecting', 'disconnected'],
              },
            },
          },
        },
      },
      TourImage: {
        type: 'object',
        required: ['url', 'altText', 'position'],
        properties: {
          url: { type: 'string' },
          altText: { type: 'string' },
          position: { type: 'integer', minimum: 0 },
        },
      },
      TourSummary: {
        type: 'object',
        required: [
          'id',
          'slug',
          'country',
          'place',
          'title',
          'location',
          'type',
          'priceCents',
          'currency',
          'ratingAverage',
          'reviewCount',
          'durationDays',
          'maxGroupSize',
          'images',
        ],
        properties: {
          id: { type: 'integer', minimum: 1 },
          slug: { type: 'string' },
          country: { type: 'string' },
          place: { type: 'string' },
          title: { type: 'string' },
          location: { type: 'string' },
          type: { type: 'string' },
          priceCents: { type: 'integer', minimum: 0 },
          oldPriceCents: { type: 'integer', minimum: 0 },
          currency: { type: 'string', pattern: '^[A-Z]{3}$' },
          ratingAverage: { type: 'number', minimum: 0, maximum: 5 },
          reviewCount: { type: 'integer', minimum: 0 },
          durationDays: { type: 'integer', minimum: 1 },
          maxGroupSize: { type: 'integer', minimum: 1 },
          images: {
            type: 'array',
            items: { $ref: '#/components/schemas/TourImage' },
          },
        },
      },
      TourDetail: {
        allOf: [
          { $ref: '#/components/schemas/TourSummary' },
          {
            type: 'object',
            required: ['overview', 'highlights', 'itinerary', 'included', 'notIncluded'],
            properties: {
              overview: { type: 'string' },
              highlights: { type: 'array', items: { type: 'string' } },
              itinerary: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['day', 'title', 'description'],
                  properties: {
                    day: { type: 'integer', minimum: 1 },
                    title: { type: 'string' },
                    description: { type: 'string' },
                  },
                },
              },
              included: { type: 'array', items: { type: 'string' } },
              notIncluded: { type: 'array', items: { type: 'string' } },
            },
          },
        ],
      },
      TourDetailResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { $ref: '#/components/schemas/TourDetail' },
        },
      },
      PaginationMeta: {
        type: 'object',
        required: ['page', 'limit', 'total', 'totalPages'],
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1 },
          total: { type: 'integer', minimum: 0 },
          totalPages: { type: 'integer', minimum: 0 },
        },
      },
      TourListResponse: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/TourSummary' },
          },
          meta: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
      AvailableDeparture: {
        type: 'object',
        required: ['id', 'startDate', 'availableSeats', 'priceCents', 'currency'],
        properties: {
          id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
          startDate: { type: 'string', format: 'date-time' },
          availableSeats: { type: 'integer', minimum: 0 },
          priceCents: { type: 'integer', minimum: 0 },
          currency: { type: 'string', pattern: '^[A-Z]{3}$' },
        },
      },
      AvailabilityResult: {
        type: 'object',
        required: ['tourId', 'travelers', 'departures'],
        properties: {
          tourId: { type: 'integer', minimum: 1 },
          travelers: { type: 'integer', minimum: 1 },
          departures: {
            type: 'array',
            items: { $ref: '#/components/schemas/AvailableDeparture' },
          },
        },
      },
      AvailabilityResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { $ref: '#/components/schemas/AvailabilityResult' },
        },
      },
      HeroSlide: {
        type: 'object',
        required: ['imageUrl', 'location', 'subtitle', 'title'],
        properties: {
          imageUrl: { type: 'string' },
          location: { type: 'string' },
          subtitle: { type: 'string' },
          title: { type: 'string' },
        },
      },
      GalleryImage: {
        type: 'object',
        required: ['altText', 'imageUrl', 'tall'],
        properties: {
          altText: { type: 'string' },
          imageUrl: { type: 'string' },
          tall: { type: 'boolean' },
        },
      },
      HomeSpotlight: {
        type: 'object',
        required: ['imageUrl', 'subtitle', 'tagline', 'title', 'tour'],
        properties: {
          imageUrl: { type: 'string' },
          subtitle: { type: 'string' },
          tagline: { type: 'string' },
          title: { type: 'string' },
          tour: {
            oneOf: [{ $ref: '#/components/schemas/TourSummary' }, { type: 'null' }],
          },
        },
      },
      HomeResult: {
        type: 'object',
        required: ['slides', 'featuredTours', 'popularTours', 'spotlight', 'gallery'],
        properties: {
          slides: {
            type: 'array',
            items: { $ref: '#/components/schemas/HeroSlide' },
          },
          featuredTours: {
            type: 'array',
            items: { $ref: '#/components/schemas/TourSummary' },
          },
          popularTours: {
            type: 'array',
            items: { $ref: '#/components/schemas/TourSummary' },
          },
          spotlight: { $ref: '#/components/schemas/HomeSpotlight' },
          gallery: {
            type: 'array',
            items: { $ref: '#/components/schemas/GalleryImage' },
          },
        },
      },
      HomeResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { $ref: '#/components/schemas/HomeResult' },
        },
      },
    },
  },
} as const;
