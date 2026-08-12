import { FaqSection, FaqStatus, faqSectionTitles } from '../libs/enums/faq.enum';
import type { Faq, PublicFaqSection } from '../libs/types/faq';
import FaqModel from '../schema/Faq.model';

const sectionOrder = Object.values(FaqSection);

class FaqService {
  public async getFaqs(): Promise<PublicFaqSection[]> {
    const faqs = await FaqModel.find({ status: FaqStatus.PUBLISHED })
      .sort({ section: 1, position: 1, createdAt: 1 })
      .lean<Faq[]>()
      .exec();

    return sectionOrder.flatMap((section) => {
      const items = faqs
        .filter((faq) => faq.section === section)
        .map((faq) => ({
          id: faq._id.toString(),
          question: faq.question,
          answer: faq.answer,
          position: faq.position,
        }));
      return items.length > 0 ? [{ section, title: faqSectionTitles[section], items }] : [];
    });
  }
}

export default FaqService;
