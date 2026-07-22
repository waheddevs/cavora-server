import View from '../schema/View.model';
import Product from '../schema/Product.model';
import { shapeIntoMongooseObjectId } from '../libs/config';
import { ViewGroup } from '../libs/enums/view.enum';
import { ViewInput } from '../libs/types/view';

class ViewService {
  public async recordView(input: ViewInput): Promise<boolean> {
    try {
      await View.create({
        viewGroup: input.viewGroup,
        viewRefId: shapeIntoMongooseObjectId(input.viewRefId),
        memberId: shapeIntoMongooseObjectId(input.memberId),
      });

      if (input.viewGroup === ViewGroup.PRODUCT) {
        await Product.findByIdAndUpdate(input.viewRefId, { $inc: { productViews: 1 } }).exec();
      }
      return true;
    } catch (err) {
      // duplicate key error means this member already viewed this target
      return false;
    }
  }
}

export default ViewService;
