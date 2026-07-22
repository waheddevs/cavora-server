import bcrypt from 'bcryptjs';
import Member from '../schema/Member.model';
import { Errors, HttpCode, Message } from '../libs/Errors';
import { shapeIntoMongooseObjectId } from '../libs/config';
import { MemberStatus, MemberType } from '../libs/enums/member.enum';
import {
  LoginInput,
  Member as MemberType_,
  MemberInput,
  MemberInquiry,
  MemberUpdateInput,
} from '../libs/types/member';

class MemberService {
  /* SPA */
  public async signup(input: MemberInput): Promise<MemberType_> {
    const salt = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);

    try {
      const newMember = await Member.create({ ...input, memberType: MemberType.USER });
      newMember.memberPassword = '';
      return newMember.toObject();
    } catch (err) {
      console.log('ERROR on signup: ', err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.USED_MEMBER_NICK_OR_PHONE);
    }
  }

  public async login(input: LoginInput): Promise<MemberType_> {
    const member = await Member.findOne({ memberNick: input.memberNick })
      .select('+memberPassword')
      .exec();
    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_MEMBER_NICK);
    if (member.memberStatus === MemberStatus.BLOCK) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED);
    }

    const isMatch = await bcrypt.compare(input.memberPassword, member.memberPassword);
    if (!isMatch) throw new Errors(HttpCode.BAD_REQUEST, Message.WRONG_PASSWORD);

    member.memberPassword = '';
    return member.toObject();
  }

  public async getMemberDetail(memberId: any): Promise<MemberType_> {
    const result = await Member.findById(shapeIntoMongooseObjectId(memberId)).exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result.toObject();
  }

  public async updateMember(input: MemberUpdateInput): Promise<MemberType_> {
    const result = await Member.findByIdAndUpdate(
      shapeIntoMongooseObjectId(input._id),
      { $set: input },
      { new: true },
    ).exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    return result.toObject();
  }

  /* SSR */
  public async processSignup(input: MemberInput): Promise<MemberType_> {
    const salt = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);

    try {
      const newMember = await Member.create({ ...input, memberType: MemberType.RESTAURANT });
      newMember.memberPassword = '';
      return newMember.toObject();
    } catch (err) {
      console.log('ERROR on processSignup: ', err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.USED_MEMBER_NICK_OR_PHONE);
    }
  }

  public async processLogin(input: LoginInput): Promise<MemberType_> {
    const member = await Member.findOne({ memberNick: input.memberNick })
      .select('+memberPassword')
      .exec();
    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_MEMBER_NICK);

    const isMatch = await bcrypt.compare(input.memberPassword, member.memberPassword);
    if (!isMatch) throw new Errors(HttpCode.BAD_REQUEST, Message.WRONG_PASSWORD);

    member.memberPassword = '';
    return member.toObject();
  }

  public async getAllMembersByAdmin(inquiry: MemberInquiry): Promise<MemberType_[]> {
    const { page, limit, memberStatus, search } = inquiry;
    const match: Record<string, any> = {};
    if (memberStatus) match.memberStatus = memberStatus;
    if (search) match.memberNick = { $regex: search, $options: 'i' };

    const result = await Member.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).exec();
    return result;
  }

  public async updateMemberByAdmin(input: MemberUpdateInput): Promise<MemberType_> {
    const result = await Member.findByIdAndUpdate(
      shapeIntoMongooseObjectId(input._id),
      { $set: input },
      { new: true },
    ).exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.UPDATE_FAILED);
    return result.toObject();
  }
}

export default MemberService;
