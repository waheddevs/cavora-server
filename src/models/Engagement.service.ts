import { ContactMessageStatus, NewsletterStatus } from '../libs/enums/engagement.enum';
import type {
  ContactMessageInput,
  NewsletterSubscriptionInput,
  NewsletterSubscriptionResult,
} from '../libs/types/engagement';
import ContactMessageModel from '../schema/ContactMessage.model';
import NewsletterSubscriberModel from '../schema/NewsletterSubscriber.model';

class EngagementService {
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

  public async subscribeToNewsletter(
    input: NewsletterSubscriptionInput,
  ): Promise<NewsletterSubscriptionResult> {
    const writeResult = await NewsletterSubscriberModel.updateOne(
      { email: input.email },
      {
        $setOnInsert: {
          ...input,
          status: NewsletterStatus.ACTIVE,
          subscribedAt: new Date(),
        },
      },
      { upsert: true },
    ).exec();
    const subscribed = writeResult.upsertedCount === 1;

    return {
      subscribed,
      status: NewsletterStatus.ACTIVE,
      message: subscribed
        ? 'Welcome aboard! Travel inspiration is headed your way.'
        : 'This email is already subscribed to Cavora updates.',
    };
  }
}

export default EngagementService;
