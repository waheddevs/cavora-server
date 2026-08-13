import { env } from './env';
import { BlogCommentStatus, BlogPostStatus } from '../libs/enums/blog.enum';
import { BookingStatus } from '../libs/enums/booking.enum';
import {
  ContactMessageStatus,
  NewsletterSource,
  NewsletterStatus,
} from '../libs/enums/engagement.enum';
import { MemberRole, MemberStatus } from '../libs/enums/member.enum';
import { FaqSection, FaqStatus } from '../libs/enums/faq.enum';
import { PaymentStatus } from '../libs/enums/payment.enum';
import { TourDepartureStatus, TourStatus } from '../libs/enums/tour.enum';

const blogCommentStatuses = Object.values(BlogCommentStatus);
const blogPostStatuses = Object.values(BlogPostStatus);
const bookingStatuses = Object.values(BookingStatus);
const contactMessageStatuses = Object.values(ContactMessageStatus);
const faqSections = Object.values(FaqSection);
const faqStatuses = Object.values(FaqStatus);
const newsletterSources = Object.values(NewsletterSource);
const newsletterStatuses = Object.values(NewsletterStatus);
const memberRoles = Object.values(MemberRole);
const memberStatuses = Object.values(MemberStatus);
const paymentStatuses = Object.values(PaymentStatus);
const tourDepartureStatuses = Object.values(TourDepartureStatus);
const tourStatuses = Object.values(TourStatus);
const adminBookingStatuses = [BookingStatus.CANCELLED, BookingStatus.COMPLETED];

const adminSecurity = [{ sessionCookie: [] }] as const;
const adminReadResponses = {
  '401': { $ref: '#/components/responses/AuthenticationRequired' },
  '403': { $ref: '#/components/responses/AuthorizationRequired' },
  '422': { $ref: '#/components/responses/ValidationError' },
} as const;
const adminMutationResponses = {
  ...adminReadResponses,
  '409': { $ref: '#/components/responses/AdminConflict' },
} as const;

const sectionEightPaths = {
  '/faqs': {
    get: {
      operationId: 'getFaqs',
      summary: 'List published FAQs grouped by section',
      tags: ['FAQ'],
      responses: {
        '200': {
          description: 'Published FAQ sections in display order.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/FaqResponse' } },
          },
        },
        '500': { $ref: '#/components/responses/InternalServerError' },
      },
    },
  },
  '/posts': {
    get: {
      operationId: 'getPosts',
      summary: 'List published blog posts',
      tags: ['Blog'],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 50, default: 9 },
        },
        { name: 'category', in: 'query', schema: { type: 'string', maxLength: 100 } },
      ],
      responses: {
        '200': {
          description: 'Paginated published posts.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BlogPostListResponse' } },
          },
        },
        '422': { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/posts/{slug}': {
    get: {
      operationId: 'getPost',
      summary: 'Get a published post by slug',
      tags: ['Blog'],
      parameters: [{ $ref: '#/components/parameters/BlogPostSlug' }],
      responses: {
        '200': {
          description: 'The published post.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BlogPostResponse' } },
          },
        },
        '404': { $ref: '#/components/responses/BlogPostNotFound' },
        '422': { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/posts/{id}/comments': {
    get: {
      operationId: 'getPostComments',
      summary: 'List public comments',
      tags: ['Blog'],
      parameters: [
        { $ref: '#/components/parameters/BlogPostId' },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      ],
      responses: {
        '200': {
          description: 'Paginated public comments.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BlogCommentListResponse' },
            },
          },
        },
        '404': { $ref: '#/components/responses/BlogPostNotFound' },
        '422': { $ref: '#/components/responses/ValidationError' },
      },
    },
    post: {
      operationId: 'submitPostComment',
      summary: 'Publish a comment',
      tags: ['Blog'],
      parameters: [{ $ref: '#/components/parameters/BlogPostId' }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/BlogCommentInput' } },
        },
      },
      responses: {
        '201': {
          description: 'The comment was published.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ActionDataResponse' } },
          },
        },
        '404': { $ref: '#/components/responses/BlogPostNotFound' },
        '422': { $ref: '#/components/responses/ValidationError' },
        '429': { $ref: '#/components/responses/RateLimitExceeded' },
      },
    },
  },
  '/contact-messages': {
    post: {
      operationId: 'submitContactMessage',
      summary: 'Submit a contact request',
      tags: ['Engagement'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ContactMessageInput' } },
        },
      },
      responses: {
        '201': {
          description: 'The message was stored.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ActionDataResponse' } },
          },
        },
        '422': { $ref: '#/components/responses/ValidationError' },
        '429': { $ref: '#/components/responses/RateLimitExceeded' },
      },
    },
  },
  '/newsletter-subscriptions': {
    post: {
      operationId: 'subscribeToNewsletter',
      summary: 'Subscribe an email to Cavora updates',
      tags: ['Engagement'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/NewsletterSubscriptionInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'The email was already subscribed.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NewsletterSubscriptionResponse' },
            },
          },
        },
        '201': {
          description: 'The email was subscribed.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NewsletterSubscriptionResponse' },
            },
          },
        },
        '422': { $ref: '#/components/responses/ValidationError' },
        '429': { $ref: '#/components/responses/RateLimitExceeded' },
      },
    },
  },
  '/admin/tours': {
    get: {
      operationId: 'adminGetTours',
      summary: 'List tours including unpublished records',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminListPage' },
        { $ref: '#/components/parameters/AdminListLimit' },
        { $ref: '#/components/parameters/AdminListQuery' },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: tourStatuses },
        },
        { name: 'type', in: 'query', schema: { type: 'string', maxLength: 80 } },
      ],
      responses: {
        '200': { $ref: '#/components/responses/AdminListResponse' },
        ...adminReadResponses,
      },
    },
    post: {
      operationId: 'adminCreateTour',
      summary: 'Create a tour',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AdminTourInput' } },
        },
      },
      responses: {
        '201': { $ref: '#/components/responses/AdminDataResponse' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/tours/{id}': {
    get: {
      operationId: 'adminGetTour',
      summary: 'Get a tour and its ordered images',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [{ $ref: '#/components/parameters/AdminTourId' }],
      responses: {
        '200': { $ref: '#/components/responses/AdminDataResponse' },
        '404': { $ref: '#/components/responses/TourNotFound' },
        ...adminReadResponses,
      },
    },
    patch: {
      operationId: 'adminUpdateTour',
      summary: 'Update a tour',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminTourId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } },
      },
      responses: {
        '200': { $ref: '#/components/responses/AdminDataResponse' },
        '404': { $ref: '#/components/responses/TourNotFound' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/tours/{id}/images': {
    post: {
      operationId: 'adminUploadTourImage',
      summary: 'Upload a tour image and append it at the next position',
      description: 'A tour can contain at most four images in positions 0 through 3.',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminTourId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['image', 'altText'],
              properties: {
                image: { type: 'string', format: 'binary' },
                altText: { type: 'string', minLength: 1, maxLength: 300 },
              },
            },
          },
        },
      },
      responses: {
        '201': { $ref: '#/components/responses/AdminDataResponse' },
        '404': { $ref: '#/components/responses/AdminNotFound' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/tours/{id}/images/{position}': {
    put: {
      operationId: 'adminUpsertTourImage',
      summary: 'Create or replace a positioned tour image',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminTourId' },
        { $ref: '#/components/parameters/ImagePosition' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AdminTourImageInput' } },
          'multipart/form-data': {
            schema: { $ref: '#/components/schemas/AdminTourImageMultipartInput' },
          },
        },
      },
      responses: {
        '200': { $ref: '#/components/responses/AdminDataResponse' },
        ...adminMutationResponses,
      },
    },
    delete: {
      operationId: 'adminDeleteTourImage',
      summary: 'Delete a positioned tour image',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminTourId' },
        { $ref: '#/components/parameters/ImagePosition' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      responses: {
        '204': { description: 'The image was deleted.' },
        '404': { $ref: '#/components/responses/AdminNotFound' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/tours/{id}/departures': {
    post: {
      operationId: 'adminCreateDeparture',
      summary: 'Create a tour departure',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminTourId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AdminDepartureInput' } },
        },
      },
      responses: {
        '201': { $ref: '#/components/responses/AdminDataResponse' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/departures': {
    get: {
      operationId: 'adminGetDepartures',
      summary: 'List tour departures',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminListPage' },
        { $ref: '#/components/parameters/AdminListLimit' },
        { name: 'tourId', in: 'query', schema: { type: 'integer', minimum: 1 } },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: tourDepartureStatuses,
          },
        },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
      ],
      responses: {
        '200': { $ref: '#/components/responses/AdminListResponse' },
        ...adminReadResponses,
      },
    },
  },
  '/admin/departures/{id}': {
    patch: {
      operationId: 'adminUpdateDeparture',
      summary: 'Update departure pricing, capacity, date, or status',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminObjectId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', minProperties: 1 } } },
      },
      responses: {
        '200': { $ref: '#/components/responses/AdminDataResponse' },
        '404': { $ref: '#/components/responses/AdminNotFound' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/homepage/selections': {
    get: {
      operationId: 'adminGetHomepageSelections',
      summary: 'Get current homepage tour selections',
      tags: ['Administration'],
      security: adminSecurity,
      responses: {
        '200': { $ref: '#/components/responses/AdminDataResponse' },
        ...adminReadResponses,
      },
    },
    put: {
      operationId: 'adminUpdateHomepageSelections',
      summary: 'Replace featured, popular, and spotlight tour selections',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/HomepageSelectionsInput' } },
        },
      },
      responses: {
        '200': { $ref: '#/components/responses/AdminDataResponse' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/faqs': {
    get: {
      operationId: 'adminGetFaqs',
      summary: 'List FAQ entries including drafts',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminListPage' },
        { $ref: '#/components/parameters/AdminListLimit' },
        { $ref: '#/components/parameters/AdminListQuery' },
        { name: 'section', in: 'query', schema: { type: 'string', enum: faqSections } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: faqStatuses } },
      ],
      responses: {
        '200': { $ref: '#/components/responses/AdminListResponse' },
        ...adminReadResponses,
      },
    },
    post: {
      operationId: 'adminCreateFaq',
      summary: 'Create an FAQ entry',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/FaqInput' } } },
      },
      responses: {
        '201': { $ref: '#/components/responses/AdminDataResponse' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/faqs/{id}': {
    patch: {
      operationId: 'adminUpdateFaq',
      summary: 'Update an FAQ entry',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminObjectId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { type: 'object', minProperties: 1 } },
        },
      },
      responses: {
        '200': { $ref: '#/components/responses/AdminDataResponse' },
        '404': { $ref: '#/components/responses/AdminNotFound' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/posts': {
    get: {
      operationId: 'adminGetBlogPosts',
      summary: 'List blog posts including unpublished records',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminListPage' },
        { $ref: '#/components/parameters/AdminListLimit' },
        { $ref: '#/components/parameters/AdminListQuery' },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: blogPostStatuses },
        },
      ],
      responses: {
        '200': { $ref: '#/components/responses/AdminListResponse' },
        ...adminReadResponses,
      },
    },
    post: {
      operationId: 'adminCreateBlogPost',
      summary: 'Create a blog post',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/AdminBlogPostInput' } },
          'multipart/form-data': {
            schema: { $ref: '#/components/schemas/AdminBlogPostMultipartInput' },
          },
        },
      },
      responses: {
        '201': { $ref: '#/components/responses/AdminDataResponse' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/posts/{id}': {
    patch: {
      operationId: 'adminUpdateBlogPost',
      summary: 'Update or publish a blog post',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminObjectId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { type: 'object', minProperties: 1 } },
          'multipart/form-data': {
            schema: { $ref: '#/components/schemas/AdminBlogPostMultipartUpdateInput' },
          },
        },
      },
      responses: {
        '200': { $ref: '#/components/responses/AdminDataResponse' },
        '404': { $ref: '#/components/responses/BlogPostNotFound' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/comments': {
    get: {
      operationId: 'adminGetComments',
      summary: 'List blog comments for moderation',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminListPage' },
        { $ref: '#/components/parameters/AdminListLimit' },
        { $ref: '#/components/parameters/AdminListQuery' },
        {
          name: 'postId',
          in: 'query',
          schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
        },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: blogCommentStatuses },
        },
      ],
      responses: {
        '200': { $ref: '#/components/responses/AdminListResponse' },
        ...adminReadResponses,
      },
    },
  },
  '/admin/comments/{id}/status': {
    patch: {
      operationId: 'adminModerateComment',
      summary: 'Moderate a blog comment',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminObjectId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/CommentStatusInput' } },
        },
      },
      responses: {
        '200': { $ref: '#/components/responses/AdminDataResponse' },
        '404': { $ref: '#/components/responses/AdminNotFound' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/contact-messages': {
    get: {
      operationId: 'adminGetContactMessages',
      summary: 'List contact requests',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminListPage' },
        { $ref: '#/components/parameters/AdminListLimit' },
        { $ref: '#/components/parameters/AdminListQuery' },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: contactMessageStatuses },
        },
      ],
      responses: {
        '200': { $ref: '#/components/responses/AdminListResponse' },
        ...adminReadResponses,
      },
    },
  },
  '/admin/contact-messages/{id}/status': {
    patch: {
      operationId: 'adminUpdateContactStatus',
      summary: 'Update a contact request status',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminObjectId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ContactStatusInput' } },
        },
      },
      responses: {
        '200': { $ref: '#/components/responses/AdminDataResponse' },
        '404': { $ref: '#/components/responses/AdminNotFound' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/users': {
    get: {
      operationId: 'adminGetMembers',
      summary: 'List registered members',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminListPage' },
        { $ref: '#/components/parameters/AdminListLimit' },
        { $ref: '#/components/parameters/AdminListQuery' },
        { name: 'role', in: 'query', schema: { type: 'string', enum: memberRoles } },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: memberStatuses },
        },
      ],
      responses: {
        '200': { $ref: '#/components/responses/AdminListResponse' },
        ...adminReadResponses,
      },
    },
  },
  '/admin/users/{id}/status': {
    patch: {
      operationId: 'adminUpdateMemberStatus',
      summary: 'Update a member account status and revoke sessions',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminObjectId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/MemberStatusInput' } },
        },
      },
      responses: {
        '200': { $ref: '#/components/responses/AdminDataResponse' },
        '404': { $ref: '#/components/responses/AdminNotFound' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/bookings': {
    get: {
      operationId: 'adminGetBookings',
      summary: 'List bookings for support',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminListPage' },
        { $ref: '#/components/parameters/AdminListLimit' },
        { $ref: '#/components/parameters/AdminListQuery' },
        { name: 'status', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': { $ref: '#/components/responses/AdminListResponse' },
        ...adminReadResponses,
      },
    },
  },
  '/admin/bookings/{id}/status': {
    patch: {
      operationId: 'adminUpdateBookingStatus',
      summary: 'Complete or cancel an unpaid booking',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminObjectId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/BookingStatusInput' } },
        },
      },
      responses: {
        '200': { $ref: '#/components/responses/AdminDataResponse' },
        '404': { $ref: '#/components/responses/BookingNotFound' },
        ...adminMutationResponses,
      },
    },
  },
  '/admin/payments': {
    get: {
      operationId: 'adminGetPayments',
      summary: 'List safe payment records',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminListPage' },
        { $ref: '#/components/parameters/AdminListLimit' },
        { $ref: '#/components/parameters/AdminListQuery' },
        { name: 'status', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': { $ref: '#/components/responses/AdminListResponse' },
        ...adminReadResponses,
      },
    },
  },
  '/admin/payments/{id}/refunds': {
    post: {
      operationId: 'adminRefundPayment',
      summary: 'Create an idempotent full or partial Stripe refund',
      tags: ['Administration'],
      security: adminSecurity,
      parameters: [
        { $ref: '#/components/parameters/AdminObjectId' },
        { $ref: '#/components/parameters/CsrfToken' },
        { $ref: '#/components/parameters/IdempotencyKey' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RefundInput' } },
        },
      },
      responses: {
        '202': { $ref: '#/components/responses/AdminDataResponse' },
        '404': { $ref: '#/components/responses/AdminNotFound' },
        '503': { $ref: '#/components/responses/PaymentProviderUnavailable' },
        ...adminMutationResponses,
      },
    },
  },
} as const;

const sectionEightSchemas = {
  FaqInput: {
    type: 'object',
    additionalProperties: false,
    required: ['section', 'question', 'answer', 'position', 'status'],
    properties: {
      section: { type: 'string', enum: faqSections },
      question: { type: 'string', minLength: 1, maxLength: 500 },
      answer: { type: 'string', minLength: 1, maxLength: 5000 },
      position: { type: 'integer', minimum: 1, maximum: 999 },
      status: { type: 'string', enum: faqStatuses },
    },
  },
  FaqItem: {
    type: 'object',
    required: ['id', 'question', 'answer', 'position'],
    properties: {
      id: { type: 'string' },
      question: { type: 'string' },
      answer: { type: 'string' },
      position: { type: 'integer' },
    },
  },
  FaqSection: {
    type: 'object',
    required: ['section', 'title', 'items'],
    properties: {
      section: { type: 'string', enum: faqSections },
      title: { type: 'string' },
      items: { type: 'array', items: { $ref: '#/components/schemas/FaqItem' } },
    },
  },
  FaqResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: { type: 'array', items: { $ref: '#/components/schemas/FaqSection' } },
    },
  },
  BlogPostSummary: {
    type: 'object',
    required: [
      'id',
      'slug',
      'title',
      'excerpt',
      'category',
      'imageUrl',
      'authorName',
      'publishedAt',
    ],
    properties: {
      id: { type: 'string' },
      slug: { type: 'string' },
      title: { type: 'string' },
      excerpt: { type: 'string' },
      category: { type: 'string' },
      imageUrl: { type: 'string' },
      authorName: { type: 'string' },
      authorImageUrl: { type: 'string' },
      publishedAt: { type: 'string', format: 'date-time' },
    },
  },
  BlogPost: {
    allOf: [
      { $ref: '#/components/schemas/BlogPostSummary' },
      {
        type: 'object',
        required: ['body', 'updatedAt'],
        properties: {
          body: {},
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    ],
  },
  BlogPostListResponse: {
    type: 'object',
    required: ['data', 'meta'],
    properties: {
      data: { type: 'array', items: { $ref: '#/components/schemas/BlogPostSummary' } },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
  },
  BlogPostResponse: {
    type: 'object',
    required: ['data'],
    properties: { data: { $ref: '#/components/schemas/BlogPost' } },
  },
  BlogComment: {
    type: 'object',
    required: ['id', 'name', 'body', 'createdAt'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      body: { type: 'string' },
      memberId: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  BlogCommentListResponse: {
    type: 'object',
    required: ['data', 'meta'],
    properties: {
      data: { type: 'array', items: { $ref: '#/components/schemas/BlogComment' } },
      meta: { $ref: '#/components/schemas/PaginationMeta' },
    },
  },
  BlogCommentInput: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'email', 'body'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 160 },
      email: { type: 'string', format: 'email', maxLength: 254 },
      body: { type: 'string', minLength: 2, maxLength: 5000 },
    },
  },
  ContactMessageInput: {
    type: 'object',
    additionalProperties: false,
    required: ['fullName', 'email', 'subject', 'message'],
    properties: {
      fullName: { type: 'string', minLength: 1, maxLength: 160 },
      email: { type: 'string', format: 'email', maxLength: 254 },
      phone: { type: 'string', maxLength: 30 },
      subject: { type: 'string', minLength: 2, maxLength: 240 },
      message: { type: 'string', minLength: 10, maxLength: 10000 },
    },
  },
  NewsletterSubscriptionInput: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'source'],
    properties: {
      email: { type: 'string', format: 'email', maxLength: 254 },
      source: { type: 'string', enum: newsletterSources },
    },
  },
  NewsletterSubscriptionResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['message', 'status', 'subscribed'],
        properties: {
          message: { type: 'string' },
          status: { type: 'string', enum: newsletterStatuses },
          subscribed: { type: 'boolean' },
        },
      },
    },
  },
  MessageResponse: {
    type: 'object',
    required: ['message'],
    properties: { message: { type: 'string' } },
  },
  ActionDataResponse: {
    type: 'object',
    required: ['data'],
    properties: { data: { type: 'object', additionalProperties: true } },
  },
  AdminTourInput: {
    type: 'object',
    additionalProperties: false,
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
      'durationDays',
      'maxGroupSize',
      'overview',
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
      ratingAverage: { type: 'number', minimum: 0, maximum: 5, default: 0 },
      reviewCount: { type: 'integer', minimum: 0, default: 0 },
      durationDays: { type: 'integer', minimum: 1 },
      maxGroupSize: { type: 'integer', minimum: 1 },
      overview: { type: 'string' },
      highlights: { type: 'array', items: { type: 'string' } },
      itinerary: { type: 'array', items: { type: 'object' } },
      included: { type: 'array', items: { type: 'string' } },
      notIncluded: { type: 'array', items: { type: 'string' } },
      status: { type: 'string', enum: tourStatuses },
      publishedAt: { type: 'string', format: 'date-time' },
    },
  },
  AdminTourImageInput: {
    type: 'object',
    additionalProperties: false,
    required: ['url', 'altText'],
    properties: {
      url: { type: 'string' },
      altText: { type: 'string', minLength: 1, maxLength: 300 },
    },
  },
  AdminTourImageMultipartInput: {
    type: 'object',
    additionalProperties: false,
    required: ['image', 'altText'],
    properties: {
      image: { type: 'string', format: 'binary' },
      altText: { type: 'string', minLength: 1, maxLength: 300 },
    },
  },
  AdminDepartureInput: {
    type: 'object',
    additionalProperties: false,
    required: ['startDate', 'capacity', 'priceCents', 'currency'],
    properties: {
      startDate: { type: 'string', format: 'date-time' },
      capacity: { type: 'integer', minimum: 1 },
      priceCents: { type: 'integer', minimum: 0 },
      currency: { type: 'string', pattern: '^[A-Z]{3}$' },
      status: {
        type: 'string',
        enum: tourDepartureStatuses,
      },
    },
  },
  HomepageSelectionsInput: {
    type: 'object',
    additionalProperties: false,
    required: ['featuredTourIds', 'popularTourIds', 'spotlightTourId'],
    properties: {
      featuredTourIds: { type: 'array', maxItems: 12, items: { type: 'integer' } },
      popularTourIds: { type: 'array', maxItems: 12, items: { type: 'integer' } },
      spotlightTourId: { type: 'integer', minimum: 1 },
    },
  },
  AdminBlogPostInput: {
    type: 'object',
    additionalProperties: false,
    required: ['slug', 'title', 'excerpt', 'body', 'category', 'imageUrl', 'authorName'],
    properties: {
      slug: { type: 'string' },
      title: { type: 'string' },
      excerpt: { type: 'string' },
      body: {},
      category: { type: 'string' },
      imageUrl: { type: 'string' },
      authorName: { type: 'string' },
      authorImageUrl: { type: 'string' },
      status: { type: 'string', enum: blogPostStatuses },
      publishedAt: { type: 'string', format: 'date-time' },
    },
  },
  AdminBlogPostMultipartInput: {
    type: 'object',
    additionalProperties: false,
    required: ['slug', 'title', 'excerpt', 'body', 'category', 'image', 'authorName'],
    properties: {
      slug: { type: 'string' },
      title: { type: 'string' },
      excerpt: { type: 'string' },
      body: { type: 'string', description: 'JSON-encoded blog document.' },
      category: { type: 'string' },
      image: { type: 'string', format: 'binary' },
      authorName: { type: 'string' },
      authorImageUrl: { type: 'string' },
      status: { type: 'string', enum: blogPostStatuses },
      publishedAt: { type: 'string', format: 'date-time' },
    },
  },
  AdminBlogPostMultipartUpdateInput: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      slug: { type: 'string' },
      title: { type: 'string' },
      excerpt: { type: 'string' },
      body: { type: 'string', description: 'JSON-encoded blog document.' },
      category: { type: 'string' },
      image: { type: 'string', format: 'binary' },
      imageUrl: { type: 'string' },
      authorName: { type: 'string' },
      authorImageUrl: { type: 'string' },
      status: { type: 'string', enum: blogPostStatuses },
      publishedAt: { type: 'string', format: 'date-time' },
    },
  },
  CommentStatusInput: {
    type: 'object',
    additionalProperties: false,
    required: ['status'],
    properties: {
      status: { type: 'string', enum: blogCommentStatuses },
    },
  },
  PasswordChangeInput: {
    type: 'object',
    additionalProperties: false,
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string', minLength: 1, maxLength: 128 },
      newPassword: { type: 'string', minLength: 8, maxLength: 128 },
    },
  },
  MemberStatusInput: {
    type: 'object',
    additionalProperties: false,
    required: ['status'],
    properties: {
      status: { type: 'string', enum: memberStatuses },
    },
  },
  ContactStatusInput: {
    type: 'object',
    additionalProperties: false,
    required: ['status'],
    properties: {
      status: { type: 'string', enum: contactMessageStatuses },
    },
  },
  BookingStatusInput: {
    type: 'object',
    additionalProperties: false,
    required: ['status'],
    properties: { status: { type: 'string', enum: adminBookingStatuses } },
  },
  RefundInput: {
    type: 'object',
    additionalProperties: false,
    properties: { amountCents: { type: 'integer', minimum: 1 } },
  },
} as const;

const sectionSevenPaths = {
  '/payments/intents': {
    post: {
      operationId: 'createPaymentIntent',
      summary: 'Create or reuse a Stripe PaymentIntent for an owned booking hold',
      tags: ['Payments'],
      security: [{ sessionCookie: [] }],
      parameters: [
        { $ref: '#/components/parameters/CsrfToken' },
        { $ref: '#/components/parameters/IdempotencyKey' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/PaymentIntentInput' } },
        },
      },
      responses: {
        '200': {
          description: 'A safe client secret for the booking owner.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentIntentResponse' },
            },
          },
        },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
        '403': { $ref: '#/components/responses/CsrfInvalid' },
        '404': { $ref: '#/components/responses/BookingNotFound' },
        '409': { $ref: '#/components/responses/PaymentConflict' },
        '422': { $ref: '#/components/responses/ValidationError' },
        '503': { $ref: '#/components/responses/PaymentProviderUnavailable' },
      },
    },
  },
  '/payments/webhooks/stripe': {
    post: {
      operationId: 'receiveStripeWebhook',
      summary: 'Verify and process a Stripe webhook event',
      description:
        'Called by Stripe. The exact raw request bytes are verified before the event is processed.',
      tags: ['Payments'],
      parameters: [
        {
          name: 'stripe-signature',
          in: 'header',
          required: true,
          schema: { type: 'string' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { type: 'object', additionalProperties: true } },
        },
      },
      responses: {
        '200': {
          description: 'The verified event was accepted or safely ignored.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StripeWebhookResponse' },
            },
          },
        },
        '400': { $ref: '#/components/responses/InvalidStripeWebhook' },
        '409': { $ref: '#/components/responses/PaymentConflict' },
        '503': { $ref: '#/components/responses/PaymentProviderUnavailable' },
      },
    },
  },
} as const;

const sectionSevenSchemas = {
  PaymentIntentInput: {
    type: 'object',
    additionalProperties: false,
    required: ['bookingId'],
    properties: {
      bookingId: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
    },
  },
  PaymentIntent: {
    type: 'object',
    required: [
      'id',
      'bookingId',
      'providerIntentId',
      'status',
      'amountCents',
      'currency',
      'clientSecret',
    ],
    properties: {
      id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
      bookingId: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
      providerIntentId: { type: 'string' },
      status: {
        type: 'string',
        enum: paymentStatuses,
      },
      amountCents: { type: 'integer', minimum: 0 },
      currency: { type: 'string', pattern: '^[A-Z]{3}$' },
      clientSecret: {
        type: 'string',
        description: 'Use only with Stripe.js for this authenticated checkout.',
      },
    },
  },
  PaymentIntentResponse: {
    type: 'object',
    required: ['data'],
    properties: { data: { $ref: '#/components/schemas/PaymentIntent' } },
  },
  StripeWebhookResponse: {
    type: 'object',
    required: ['received'],
    properties: { received: { type: 'boolean', const: true } },
  },
} as const;

const sectionSixPaths = {
  '/booking-holds': {
    post: {
      operationId: 'createBookingHold',
      summary: 'Reserve departure capacity and create a booking',
      tags: ['Bookings'],
      security: [{ sessionCookie: [] }],
      parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/BookingHoldInput' } },
        },
      },
      responses: {
        '201': {
          description: 'The authoritative booking hold and price calculation.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BookingResponse' } },
          },
        },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
        '403': { $ref: '#/components/responses/CsrfInvalid' },
        '409': { $ref: '#/components/responses/BookingConflict' },
        '422': { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/bookings/{id}': {
    get: {
      operationId: 'getBooking',
      summary: 'Get a booking owned by the current member',
      tags: ['Bookings'],
      security: [{ sessionCookie: [] }],
      parameters: [{ $ref: '#/components/parameters/BookingId' }],
      responses: {
        '200': {
          description: 'The owned booking.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BookingResponse' } },
          },
        },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
        '404': { $ref: '#/components/responses/BookingNotFound' },
        '422': { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/bookings/{id}/cancel': {
    post: {
      operationId: 'cancelBooking',
      summary: 'Cancel a pending hold or request cancellation for a confirmed booking',
      tags: ['Bookings'],
      security: [{ sessionCookie: [] }],
      parameters: [
        { $ref: '#/components/parameters/BookingId' },
        { $ref: '#/components/parameters/CsrfToken' },
      ],
      responses: {
        '200': {
          description: 'The updated booking state.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BookingResponse' } },
          },
        },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
        '403': { $ref: '#/components/responses/CsrfInvalid' },
        '404': { $ref: '#/components/responses/BookingNotFound' },
        '409': { $ref: '#/components/responses/BookingConflict' },
        '422': { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
} as const;

const sectionSixSchemas = {
  BookingHoldInput: {
    type: 'object',
    additionalProperties: false,
    required: ['tourId', 'departureId', 'travelers'],
    properties: {
      tourId: { type: 'integer', minimum: 1 },
      departureId: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
      travelers: { type: 'integer', minimum: 1, maximum: 50 },
    },
  },
  Booking: {
    type: 'object',
    required: [
      'id',
      'reference',
      'tourId',
      'departureId',
      'status',
      'travelers',
      'unitPriceCents',
      'subtotalCents',
      'serviceFeeCents',
      'totalCents',
      'currency',
      'createdAt',
    ],
    properties: {
      id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
      reference: { type: 'string' },
      tourId: { type: 'integer' },
      departureId: { type: 'string' },
      status: { type: 'string' },
      travelers: { type: 'integer' },
      unitPriceCents: { type: 'integer' },
      subtotalCents: { type: 'integer' },
      serviceFeeCents: { type: 'integer' },
      totalCents: { type: 'integer' },
      currency: { type: 'string' },
      confirmedAt: { type: 'string', format: 'date-time' },
      cancelledAt: { type: 'string', format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  BookingResponse: {
    type: 'object',
    required: ['data'],
    properties: { data: { $ref: '#/components/schemas/Booking' } },
  },
} as const;

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
  '/auth/admin-register': {
    post: {
      operationId: 'registerAdmin',
      summary: 'Create the first and only administrator account',
      description: 'This bootstrap operation succeeds only while no administrator account exists.',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } },
        },
      },
      responses: {
        '201': {
          description: 'The administrator and opaque cookie session were created.',
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
  '/users/me/password': {
    post: {
      operationId: 'changePassword',
      summary: 'Change the authenticated member password',
      tags: ['Members'],
      security: [{ sessionCookie: [] }],
      parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/PasswordChangeInput' } },
        },
      },
      responses: {
        '200': {
          description: 'The password was replaced and other sessions were revoked.',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' } },
          },
        },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
        '422': { $ref: '#/components/responses/ValidationError' },
      },
    },
  },
  '/users/me/avatar': {
    post: {
      operationId: 'uploadAvatar',
      summary: 'Upload a profile photo',
      tags: ['Members'],
      security: [{ sessionCookie: [] }],
      parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['image'],
              properties: { image: { type: 'string', format: 'binary' } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'The stored profile including the new avatar URL.' },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
        '422': { $ref: '#/components/responses/ValidationError' },
      },
    },
    delete: {
      operationId: 'removeAvatar',
      summary: 'Remove the profile photo',
      tags: ['Members'],
      security: [{ sessionCookie: [] }],
      parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
      responses: {
        '200': { description: 'The stored profile without an avatar URL.' },
        '401': { $ref: '#/components/responses/AuthenticationRequired' },
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
            enum: bookingStatuses,
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
  '/users/me/bookings/archive': {
    patch: {
      operationId: 'archiveCurrentMemberBookings',
      summary: 'Hide a completed booking group from member history',
      tags: ['Members'],
      security: [{ sessionCookie: [] }],
      parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['group'],
              properties: {
                group: { type: 'string', enum: ['past', 'cancelled'] },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'The number of booking records hidden from member history.',
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
    delete: {
      operationId: 'clearCurrentMemberWishlist',
      summary: 'Remove all saved tours',
      tags: ['Wishlists'],
      security: [{ sessionCookie: [] }],
      parameters: [{ $ref: '#/components/parameters/CsrfToken' }],
      responses: {
        '200': { description: 'The number of saved tours removed.' },
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
      'status',
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
      role: { type: 'string', enum: memberRoles },
      status: { type: 'string', enum: memberStatuses },
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
          lastSignInAt: { type: 'string', format: 'date-time' },
          stats: {
            type: 'object',
            required: ['activeSessions', 'bookings', 'wishlist'],
            properties: {
              activeSessions: { type: 'integer', minimum: 0 },
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
    { name: 'Bookings', description: 'Owned booking holds and cancellation.' },
    { name: 'Payments', description: 'Stripe PaymentIntents and verified webhooks.' },
    { name: 'Blog', description: 'Published posts and moderated comments.' },
    { name: 'FAQ', description: 'Published customer questions and answers.' },
    { name: 'Engagement', description: 'Customer contact workflows.' },
    { name: 'Administration', description: 'Protected operational management APIs.' },
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
    '/tours/{id}/comments': {
      get: {
        operationId: 'getTourComments',
        summary: 'List public tour comments',
        tags: ['Tours'],
        parameters: [
          { $ref: '#/components/parameters/TourId' },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated public tour comments.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BlogCommentListResponse' },
              },
            },
          },
          '404': { $ref: '#/components/responses/TourNotFound' },
          '422': { $ref: '#/components/responses/ValidationError' },
        },
      },
      post: {
        operationId: 'submitTourComment',
        summary: 'Publish a tour comment',
        tags: ['Tours'],
        parameters: [{ $ref: '#/components/parameters/TourId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BlogCommentInput' } },
          },
        },
        responses: {
          '201': {
            description: 'The tour comment was published.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ActionDataResponse' },
              },
            },
          },
          '404': { $ref: '#/components/responses/TourNotFound' },
          '422': { $ref: '#/components/responses/ValidationError' },
          '429': { $ref: '#/components/responses/RateLimitExceeded' },
        },
      },
    },
    '/tours/{id}/views': {
      post: {
        operationId: 'recordTourView',
        summary: 'Count a unique tour view',
        description:
          'Counts at most one view per authenticated member or anonymous browser visitor.',
        tags: ['Tours'],
        parameters: [{ $ref: '#/components/parameters/TourId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['visitorId'],
                additionalProperties: false,
                properties: { visitorId: { type: 'string', format: 'uuid' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'The current view count and whether this request added a view.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TourViewResponse' },
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
    ...sectionSixPaths,
    ...sectionSevenPaths,
    ...sectionEightPaths,
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
      BookingId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
      },
      IdempotencyKey: {
        name: 'idempotency-key',
        in: 'header',
        required: true,
        description: 'A unique retry key, normally a UUID, between 16 and 255 characters.',
        schema: {
          type: 'string',
          minLength: 16,
          maxLength: 255,
          pattern: '^[A-Za-z0-9._:-]+$',
        },
      },
      BlogPostSlug: {
        name: 'slug',
        in: 'path',
        required: true,
        schema: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
      },
      BlogPostId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
      },
      AdminObjectId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
      },
      AdminTourId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 1 },
      },
      ImagePosition: {
        name: 'position',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 0, maximum: 3 },
      },
      AdminListPage: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      AdminListLimit: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
      AdminListQuery: {
        name: 'query',
        in: 'query',
        schema: { type: 'string', minLength: 1, maxLength: 200 },
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
      BookingNotFound: {
        description: 'The booking does not exist or is not owned by the current member.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      BookingConflict: {
        description: 'Capacity is unavailable or the booking state transition is invalid.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      PaymentConflict: {
        description: 'The booking, amount, or idempotency state prevents this payment operation.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      InvalidStripeWebhook: {
        description: 'The Stripe signature or raw request format is invalid.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      PaymentProviderUnavailable: {
        description: 'Stripe is temporarily unavailable.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      AuthorizationRequired: {
        description: 'An administrator role is required.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      BlogPostNotFound: {
        description: 'The published blog post does not exist.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      AdminNotFound: {
        description: 'The requested administrative resource does not exist.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      AdminConflict: {
        description: 'The administrative state transition or uniqueness constraint failed.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      AdminDataResponse: {
        description: 'The protected administrative result.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ActionDataResponse' },
          },
        },
      },
      AdminListResponse: {
        description: 'A protected paginated administrative list.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['data', 'meta'],
              properties: {
                data: { type: 'array', items: { type: 'object' } },
                meta: { $ref: '#/components/schemas/PaginationMeta' },
              },
            },
          },
        },
      },
    },
    schemas: {
      ...sectionFiveSchemas,
      ...sectionSixSchemas,
      ...sectionSevenSchemas,
      ...sectionEightSchemas,
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
          position: { type: 'integer', minimum: 0, maximum: 3 },
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
          'viewCount',
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
          viewCount: { type: 'integer', minimum: 0 },
          durationDays: { type: 'integer', minimum: 1 },
          maxGroupSize: { type: 'integer', minimum: 1 },
          images: {
            type: 'array',
            maxItems: 4,
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
      TourViewResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            required: ['counted', 'tourId', 'viewCount'],
            properties: {
              counted: { type: 'boolean' },
              tourId: { type: 'integer', minimum: 1 },
              viewCount: { type: 'integer', minimum: 0 },
            },
          },
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
        required: ['altText', 'category', 'imageUrl', 'location', 'tall', 'title', 'tourId'],
        properties: {
          altText: { type: 'string' },
          category: { type: 'string' },
          imageUrl: { type: 'string' },
          location: { type: 'string' },
          tall: { type: 'boolean' },
          title: { type: 'string' },
          tourId: { type: 'integer', minimum: 1 },
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
