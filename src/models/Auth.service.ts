import jwt from 'jsonwebtoken';
import { AUTH_TIMER } from '../libs/config';
import { Member } from '../libs/types/member';

class AuthService {
  private readonly secret: string = process.env.SECRET_TOKEN ?? '';

  public createToken(member: Member): string {
    const payload = {
      _id: member._id,
      memberType: member.memberType,
      memberNick: member.memberNick,
    };
    return jwt.sign(payload, this.secret, { expiresIn: `${AUTH_TIMER}h` });
  }

  public checkAuth(token: string): any {
    return jwt.verify(token, this.secret);
  }
}

export default AuthService;
