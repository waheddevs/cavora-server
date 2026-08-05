import { ContactMessageStatus } from '../libs/enums/engagement.enum';
import type { ContactMessageInput } from '../libs/types/engagement';
import ContactMessageModel from '../schema/ContactMessage.model';

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
}

export default EngagementService;
