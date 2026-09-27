import { UserRepository } from '../repositories/user.repository';
import { SignupSchema, UserDetailsQuerySchema, hasValidAttribution, ATTRIBUTION_KEYS } from '../validators/user.validator';
import { z } from 'zod';
import UtmCampaign from '../models/UtmCampaign';
import { getDateRangeBounds } from '../utils/timezone';
import { logger } from '../utils/logger';

export class UserService {
  private repository: UserRepository;

  constructor(repository: UserRepository) {
    this.repository = repository;
  }

  async registerUser(data: z.infer<typeof SignupSchema>, clientIp?: string, userAgent?: string) {
    const userByEmail = await this.repository.findByEmail(data.email);
    const userByPhone = await this.repository.findByPhone(data.phone);

    // Rule: HTTP 409 with no changes for conflicting email/phone identities
    if (userByEmail && userByPhone && userByEmail._id.toString() !== userByPhone._id.toString()) {
      logger.warn(
        { email: data.email, phone: data.phone },
        'Conflicting email and phone identities point to different existing accounts'
      );
      const conflictError: any = new Error('IDENTITY_CONFLICT');
      conflictError.code = 'IDENTITY_CONFLICT';
      throw conflictError;
    }

    if (userByEmail && userByEmail.phone !== data.phone) {
      logger.warn(
        { email: data.email, submittedPhone: data.phone, existingPhone: userByEmail.phone },
        'Conflicting identity: email belongs to a user with a different phone number'
      );
      const conflictError: any = new Error('IDENTITY_CONFLICT');
      conflictError.code = 'IDENTITY_CONFLICT';
      throw conflictError;
    }

    if (userByPhone && userByPhone.email.toLowerCase() !== data.email.toLowerCase()) {
      logger.warn(
        { phone: data.phone, submittedEmail: data.email, existingEmail: userByPhone.email },
        'Conflicting identity: phone belongs to a user with a different email address'
      );
      const conflictError: any = new Error('IDENTITY_CONFLICT');
      conflictError.code = 'IDENTITY_CONFLICT';
      throw conflictError;
    }

    const existingUser = userByEmail || userByPhone;

    // Rule: No updates or reactivation for ONHOLD/DELETED users
    if (existingUser && (existingUser.status === 'ONHOLD' || existingUser.status === 'DELETED')) {
      logger.warn(
        { userId: existingUser._id, status: existingUser.status },
        'Enquiry rejected: account status is ONHOLD or DELETED'
      );
      const inactiveError: any = new Error('USER_INACTIVE');
      inactiveError.code = 'USER_INACTIVE';
      inactiveError.userStatus = existingUser.status;
      throw inactiveError;
    }

    // Rule: No campaign record for enquiries without valid attribution
    let campaignData: Record<string, any> | null = null;
    if (hasValidAttribution(data)) {
      campaignData = {
        route: data.route,
        clientIp,
        userAgent,
      };
      for (const key of ATTRIBUTION_KEYS) {
        if (data[key] && typeof data[key] === 'string' && data[key].trim().length > 0) {
          campaignData[key] = data[key].trim();
        }
      }
    }

    const courseEnquiryData = {
      pythonStartingPoint: data.pythonStartingPoint,
      ...(data.message ? { message: data.message } : {}),
    };

    const userData = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      countryCode: data.countryCode || '+91',
      timezone: data.timezone || 'Asia/Kolkata',
      status: 'ACTIVE' as const,
    };

    if (existingUser) {
      logger.info(
        { userId: existingUser._id },
        'Active existing user detected, updating demographics and recording enquiry'
      );
      await this.repository.updateExistingUser(
        existingUser._id as any,
        userData,
        campaignData,
        courseEnquiryData
      );

      const updatedUser = {
        ...existingUser.toObject(),
        name: userData.name,
        countryCode: userData.countryCode,
        timezone: userData.timezone,
      };
      return { user: updatedUser, status: 'existing' };
    }

    logger.info({ email: data.email, phone: data.phone }, 'Creating new user and recording enquiry');
    const newUser = await this.repository.createUser(userData, campaignData, courseEnquiryData);
    return { user: newUser, status: 'new' };
  }

  async getUserDetails(query: z.infer<typeof UserDetailsQuerySchema>) {
    const { startDate, endDate, page, limit, range } = query;
    const skip = (page - 1) * limit;

    const { start, end } = getDateRangeBounds(range, startDate, endDate);

    const filter: any = {};
    if (start && end) {
      filter.createdAt = {
        $gte: start,
        $lt: end,
      };
    }

    logger.info(`Fetching user details for range: ${range}`);

    const [total, campaigns] = await Promise.all([
      UtmCampaign.countDocuments(filter),
      UtmCampaign.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1, _id: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'course_enquiry_infos',
            let: { searchUserId: '$userId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$userId', '$$searchUserId'] } } },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: 'courseEnquiry',
          },
        },
        { $unwind: { path: '$courseEnquiry', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            userCreatedAt: '$user.createdAt',
            utmCreatedAt: '$createdAt',
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ['$user', '$courseEnquiry', '$$ROOT'],
            },
          },
        },
        {
          $project: {
            __v: 0,
            updatedAt: 0,
            createdAt: 0,
            userId: 0,
            user: 0,
            courseEnquiry: 0,
          },
        },
      ]),
    ]);

    return {
      data: campaigns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
