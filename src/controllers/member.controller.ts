import { NextFunction, Request, Response } from 'express';
import MemberService from '../models/Member.service';
import AuthService from '../models/Auth.service';
import { Errors, HttpCode, Message } from '../libs/Errors';
import { AUTH_TIMER } from '../libs/config';

const memberService = new MemberService();
const authService = new AuthService();

const memberController: any = {};

memberController.signup = async (req: Request, res: Response) => {
  try {
    console.log('signup');
    const newMember = await memberService.signup(req.body);
    const token = authService.createToken(newMember as any);
    res.cookie('accessToken', token, { maxAge: AUTH_TIMER * 60 * 60 * 1000, httpOnly: false });
    res.status(HttpCode.CREATED).json(newMember);
  } catch (err) {
    console.log('ERROR on signup: ', err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.login = async (req: Request, res: Response) => {
  try {
    console.log('login');
    const member = await memberService.login(req.body);
    const token = authService.createToken(member as any);
    res.cookie('accessToken', token, { maxAge: AUTH_TIMER * 60 * 60 * 1000, httpOnly: false });
    res.status(HttpCode.OK).json(member);
  } catch (err) {
    console.log('ERROR on login: ', err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.getMemberDetail = async (req: Request, res: Response) => {
  try {
    console.log('getMemberDetail');
    const result = await memberService.getMemberDetail(req.member?._id);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log('ERROR on getMemberDetail: ', err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.updateMember = async (req: Request, res: Response) => {
  try {
    console.log('updateMember');
    const result = await memberService.updateMember({ ...req.body, _id: req.member?._id });
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log('ERROR on updateMember: ', err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.verifyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken;
    if (!token) throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    req.member = authService.checkAuth(token);
    next();
  } catch (err) {
    console.log('ERROR on verifyAuth: ', err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(HttpCode.UNAUTHORIZED).json(new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED));
  }
};

memberController.retrieveAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken;
    if (token) req.member = authService.checkAuth(token);
  } catch (err) {
    console.log('ERROR on retrieveAuth (ignored): ', err);
  } finally {
    next();
  }
};

export default memberController;
