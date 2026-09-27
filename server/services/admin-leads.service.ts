import mongoose from 'mongoose';
import CourseEnquiryInfo from '@/server/models/CourseEnquiryInfo';
import User from '@/server/models/User';
import UtmCampaign from '@/server/models/UtmCampaign';
import { getDateRangeBounds, getNowInIST, getStartOfDayIST } from '@/server/utils/timezone';
import { AdminLeadsQuerySchema, escapeRegex } from '@/server/validators/admin.validator';
import { z } from 'zod';
import { logger } from '@/server/utils/logger';

export interface LeadTableRow {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  userStatus: 'ACTIVE' | 'DELETED' | 'ONHOLD';
  pythonStartingPoint: string;
  message?: string;
  createdAt: Date;
  userTotalEnquiries: number;
  userCampaignTouchpointCount: number;
  attributionStatus: string;
}

export interface AdminLeadsResult {
  metrics: {
    totalEnquiriesFiltered: number;
    uniqueLeadsFiltered: number;
    todayEnquiriesIST: number;
    totalCampaignTouchpointsAllTime: number;
    activeRangeLabel: string;
  };
  leads: LeadTableRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class AdminLeadsService {
  /**
   * Fetches paginated lead enquiries with server-side filters and metrics
   */
  async getLeads(query: z.infer<typeof AdminLeadsQuerySchema>): Promise<AdminLeadsResult> {
    const { range, startDate, endDate, pythonStartingPoint, attributionStatus, search, page, limit } = query;
    const skip = (page - 1) * limit;

    const { start, end, label: activeRangeLabel } = getDateRangeBounds(range, startDate, endDate);

    // 1. Base filter on CourseEnquiryInfo
    const matchFilter: any = {};
    if (start && end) {
      matchFilter.createdAt = { $gte: start, $lt: end };
    }
    if (pythonStartingPoint !== 'all') {
      matchFilter.pythonStartingPoint = pythonStartingPoint;
    }

    // 2. Build aggregation pipeline
    const pipeline: any[] = [
      { $match: matchFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ];

    // 3. Search query across name, email, and phone
    if (search && search.trim().length > 0) {
      const sanitized = escapeRegex(search.trim());
      const searchRegex = new RegExp(sanitized, 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': searchRegex },
            { 'user.email': searchRegex },
            { 'user.phone': searchRegex },
          ],
        },
      });
    }

    // 4. Lookup user's full enquiry count and campaign count
    pipeline.push(
      {
        $lookup: {
          from: 'course_enquiry_infos',
          localField: 'userId',
          foreignField: 'userId',
          as: 'userEnquiries',
        },
      },
      {
        $lookup: {
          from: 'utm_campaigns',
          localField: 'userId',
          foreignField: 'userId',
          as: 'userCampaigns',
        },
      }
    );

    // 5. Attribution filter
    if (attributionStatus === 'linked') {
      pipeline.push({
        $match: {
          $expr: { $gt: [{ $size: '$userCampaigns' }, 0] },
        },
      });
    } else if (attributionStatus === 'unlinked') {
      pipeline.push({
        $match: {
          $expr: { $eq: [{ $size: '$userCampaigns' }, 0] },
        },
      });
    }

    // 6. Facet for pagination and metadata (distinct unique leads)
    pipeline.push({
      $facet: {
        metadata: [
          {
            $group: {
              _id: null,
              totalEnquiries: { $sum: 1 },
              uniqueUserIds: { $addToSet: '$userId' },
            },
          },
        ],
        rows: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              userId: 1,
              name: '$user.name',
              email: '$user.email',
              phone: '$user.phone',
              countryCode: '$user.countryCode',
              userStatus: '$user.status',
              pythonStartingPoint: 1,
              message: 1,
              createdAt: 1,
              userTotalEnquiries: { $size: '$userEnquiries' },
              userCampaignTouchpointCount: { $size: '$userCampaigns' },
              attributionStatus: { $literal: 'Unknown / not linked' },
            },
          },
        ],
      },
    });

    // 7. Calculate today's enquiries in Asia/Kolkata [todayStart, tomorrowStart)
    const { year, month, day } = getNowInIST(new Date());
    const todayStart = getStartOfDayIST(year, month, day);
    const tomorrowStart = getStartOfDayIST(year, month, day + 1);

    const [facetResults, todayCount, totalCampaignsCount] = await Promise.all([
      CourseEnquiryInfo.aggregate(pipeline),
      CourseEnquiryInfo.countDocuments({
        createdAt: { $gte: todayStart, $lt: tomorrowStart },
      }),
      UtmCampaign.countDocuments({}),
    ]);

    const facet = facetResults[0] || { metadata: [], rows: [] };
    const meta = facet.metadata[0] || { totalEnquiries: 0, uniqueUserIds: [] };

    const total = meta.totalEnquiries || 0;
    const uniqueLeadsFiltered = Array.isArray(meta.uniqueUserIds) ? meta.uniqueUserIds.length : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      metrics: {
        totalEnquiriesFiltered: total,
        uniqueLeadsFiltered,
        todayEnquiriesIST: todayCount,
        totalCampaignTouchpointsAllTime: totalCampaignsCount,
        activeRangeLabel,
      },
      leads: facet.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Fetches single lead full profile, all chronological enquiries, and user-level UTM touchpoints
   */
  async getLeadDetail(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    let objectId = new mongoose.Types.ObjectId(id);

    let user = await User.findById(objectId)
      .select('name email phone countryCode timezone status createdAt updatedAt')
      .lean();

    // If not found directly as User ID, check if it is a CourseEnquiryInfo ID
    if (!user) {
      const enquiry = await CourseEnquiryInfo.findById(objectId).select('userId').lean();
      if (enquiry && (enquiry as any).userId) {
        objectId = (enquiry as any).userId;
        user = await User.findById(objectId)
          .select('name email phone countryCode timezone status createdAt updatedAt')
          .lean();
      }
    }

    if (!user) {
      return null;
    }

    const [enquiries, campaigns] = await Promise.all([
      CourseEnquiryInfo.find({ userId: objectId })
        .sort({ createdAt: -1, _id: -1 })
        .limit(100)
        .select('pythonStartingPoint message createdAt')
        .lean(),
      UtmCampaign.find({ userId: objectId })
        .sort({ createdAt: -1, _id: -1 })
        .limit(100)
        .select(
          'utm_source utm_medium utm_campaign utm_content utm_term gclid fbclid fbp fbc platform matchtype network device keyword placement campaignid adgroupid route clientIp userAgent createdAt'
        )
        .lean(),
    ]);

    return {
      user: {
        _id: (user as any)._id.toString(),
        name: (user as any).name,
        email: (user as any).email,
        phone: (user as any).phone,
        countryCode: (user as any).countryCode,
        timezone: (user as any).timezone,
        status: (user as any).status,
        createdAt: (user as any).createdAt,
      },
      enquiryHistory: enquiries.map((e: any) => ({
        _id: e._id.toString(),
        pythonStartingPoint: e.pythonStartingPoint,
        message: e.message || '',
        createdAt: e.createdAt,
        attributionStatus: 'Unknown / not linked',
      })),
      campaignTouchpoints: campaigns.map((c: any) => ({
        _id: c._id.toString(),
        utm_source: c.utm_source || '',
        utm_medium: c.utm_medium || '',
        utm_campaign: c.utm_campaign || '',
        utm_content: c.utm_content || '',
        utm_term: c.utm_term || '',
        gclid: c.gclid || '',
        fbclid: c.fbclid || '',
        platform: c.platform || '',
        device: c.device || '',
        route: c.route || '',
        createdAt: c.createdAt,
      })),
      relationshipNotice:
        'Attribution touchpoints are captured at the user level during signups. Individual course enquiries do not have a foreign key to campaigns, so enquiry attribution is displayed as not directly linked.',
    };
  }
}
