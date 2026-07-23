import { createOpaqueToken, hashOpaqueToken } from '../common/security/tokens';
import { ContactMessageStatus, NewsletterSubscriptionStatus } from '../libs/enums/engagement.enum';
import type { ContactMessageInput, NewsletterSubscription } from '../libs/types/engagement';
import ContactMessageModel from '../schema/ContactMessage.model';
import NewsletterSubscriptionModel from '../schema/NewsletterSubscription.model';

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11_000
  );
}

class EngagementService {
  public constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly tokenFactory: () => string = createOpaqueToken,
  ) {}

  public async submitContactMessage(
    input: ContactMessageInput,
  ): Promise<{ id: string; message: string; status: ContactMessageStatus }> {
    const contact = await ContactMessageModel.create({
      ...input,
      status: ContactMessageStatus.NEW,
    });
    return {
      id: contact._id.toString(),
      status: ContactMessageStatus.NEW,
      message: 'Your message has been received.',
    };
  }

  public async subscribeNewsletter(email: string, source: string): Promise<{ message: string }> {
    const response = { message: 'Your newsletter subscription has been recorded.' };
    const existing = await NewsletterSubscriptionModel.findOne({ email })
      .lean<NewsletterSubscription>()
      .exec();
    if (existing?.status === NewsletterSubscriptionStatus.ACTIVE) return response;

    const now = this.now();
    const unsubscribeTokenHash = hashOpaqueToken(this.tokenFactory(), 'newsletter-unsubscribe');
    try {
      await NewsletterSubscriptionModel.findOneAndUpdate(
        { email },
        {
          $set: {
            status: NewsletterSubscriptionStatus.ACTIVE,
            source,
            consentedAt: now,
            confirmedAt: now,
            unsubscribeTokenHash,
          },
        },
        { new: true, setDefaultsOnInsert: true, upsert: true },
      ).exec();
      return response;
    } catch (err) {
      if (isDuplicateKeyError(err)) return response;
      throw err;
    }
  }

  public async unsubscribeNewsletter(token: string): Promise<void> {
    const unsubscribeTokenHash = hashOpaqueToken(token, 'newsletter-unsubscribe');
    await NewsletterSubscriptionModel.updateOne(
      {
        unsubscribeTokenHash,
        status: { $ne: NewsletterSubscriptionStatus.UNSUBSCRIBED },
      },
      {
        $set: { status: NewsletterSubscriptionStatus.UNSUBSCRIBED },
        $unset: { confirmedAt: 1 },
      },
    ).exec();
  }
}

export default EngagementService;
