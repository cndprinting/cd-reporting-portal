import "dotenv/config";
import { PrismaClient, Role, CampaignStatus, ChannelType } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hash } from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create companies
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: "C&D Printing Demo Account",
        slug: "cd-printing-demo",
        website: "https://cndprinting.com",
        industry: "Printing & Direct Mail",
        address: "123 Print Ave, West Palm Beach, FL 33401",
        phone: "(561) 555-0100",
      },
    }),
    prisma.company.create({
      data: {
        name: "Sunshine Realty Group",
        slug: "sunshine-realty",
        website: "https://sunshinerealty.com",
        industry: "Real Estate",
        address: "456 Ocean Blvd, Boca Raton, FL 33432",
        phone: "(561) 555-0200",
      },
    }),
    prisma.company.create({
      data: {
        name: "Palm Coast Insurance",
        slug: "palm-coast-insurance",
        website: "https://palmcoastins.com",
        industry: "Insurance",
        address: "789 Palm Dr, Fort Lauderdale, FL 33301",
        phone: "(954) 555-0300",
      },
    }),
  ]);

  console.log(`Created ${companies.length} companies`);

  // Create users
  const passwordHash = await hash("demo123", 12);
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@cndprinting.com",
        name: "Sarah Johnson",
        passwordHash,
        role: Role.ADMIN,
        companyId: companies[0].id,
      },
    }),
    prisma.user.create({
      data: {
        email: "manager@cndprinting.com",
        name: "Mike Chen",
        passwordHash,
        role: Role.ACCOUNT_MANAGER,
        companyId: companies[0].id,
      },
    }),
    prisma.user.create({
      data: {
        email: "john@sunshinerealty.com",
        name: "John Rivera",
        passwordHash,
        role: Role.CUSTOMER,
        companyId: companies[1].id,
      },
    }),
    prisma.user.create({
      data: {
        email: "lisa@palmcoastins.com",
        name: "Lisa Martinez",
        passwordHash,
        role: Role.CUSTOMER,
        companyId: companies[2].id,
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Assign manager to customer companies
  await prisma.companyManager.createMany({
    data: [
      { userId: users[1].id, companyId: companies[1].id },
      { userId: users[1].id, companyId: companies[2].id },
    ],
  });

  // Create campaigns
  const campaignDefs = [
    {
      name: "Spring Homeowner Mailer",
      campaignCode: "CD-2026-001",
      status: CampaignStatus.LIVE,
      companyId: companies[0].id,
      description: "Targeted spring mailer campaign for homeowners in the 33401-33499 zip code range.",
      destinationUrl: "https://cndprinting.com/spring-offer",
      setupDate: new Date("2026-02-15"),
      startDate: new Date("2026-03-01"),
      channels: [ChannelType.MAIL_TRACKING, ChannelType.CALL_TRACKING, ChannelType.GOOGLE_ADS, ChannelType.FACEBOOK_ADS, ChannelType.QR_CODES],
    },
    {
      name: "South Florida Prospecting",
      campaignCode: "CD-2026-002",
      status: CampaignStatus.LIVE,
      companyId: companies[0].id,
      description: "Multi-channel prospecting campaign targeting South Florida businesses.",
      destinationUrl: "https://cndprinting.com/south-florida",
      setupDate: new Date("2026-01-20"),
      startDate: new Date("2026-02-01"),
      channels: [ChannelType.MAIL_TRACKING, ChannelType.GOOGLE_ADS, ChannelType.FACEBOOK_ADS, ChannelType.BEHAVIORAL_ADS, ChannelType.GMAIL_ADS],
    },
    {
      name: "Investor Lead Gen Q2",
      campaignCode: "CD-2026-003",
      status: CampaignStatus.PAUSED,
      companyId: companies[1].id,
      description: "Lead generation campaign targeting real estate investors for Q2.",
      destinationUrl: "https://sunshinerealty.com/investors",
      setupDate: new Date("2026-03-01"),
      startDate: new Date("2026-03-15"),
      channels: [ChannelType.MAIL_TRACKING, ChannelType.CALL_TRACKING, ChannelType.GOOGLE_ADS, ChannelType.YOUTUBE_ADS],
    },
    {
      name: "Geo-Targeted Retargeting Push",
      campaignCode: "CD-2026-004",
      status: CampaignStatus.COMPLETED,
      companyId: companies[1].id,
      description: "Retargeting campaign for website visitors in specific geographic areas.",
      destinationUrl: "https://sunshinerealty.com/retarget",
      setupDate: new Date("2025-12-01"),
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-02-28"),
      channels: [ChannelType.BEHAVIORAL_ADS, ChannelType.FACEBOOK_ADS, ChannelType.GMAIL_ADS, ChannelType.YOUTUBE_ADS],
    },
    {
      name: "Luxury Home Seller Campaign",
      campaignCode: "CD-2026-005",
      status: CampaignStatus.LIVE,
      companyId: companies[2].id,
      description: "Premium direct mail and digital campaign targeting luxury home sellers.",
      destinationUrl: "https://palmcoastins.com/luxury",
      setupDate: new Date("2026-03-10"),
      startDate: new Date("2026-03-20"),
      channels: [ChannelType.MAIL_TRACKING, ChannelType.CALL_TRACKING, ChannelType.GOOGLE_ADS, ChannelType.FACEBOOK_ADS, ChannelType.BEHAVIORAL_ADS, ChannelType.QR_CODES],
    },
  ];

  for (const def of campaignDefs) {
    const { channels, ...campaignData } = def;
    const campaign = await prisma.campaign.create({
      data: {
        ...campaignData,
        channels: {
          create: channels.map((ch) => ({ channel: ch })),
        },
      },
    });

    // Generate daily metrics for each channel
    const days = campaign.status === CampaignStatus.COMPLETED ? 60 : 35;
    const channelConfigs: Record<string, { baseImpressions: number; baseCtr: number }> = {
      MAIL_TRACKING: { baseImpressions: 0, baseCtr: 0 },
      CALL_TRACKING: { baseImpressions: 0, baseCtr: 0 },
      GOOGLE_ADS: { baseImpressions: 8500, baseCtr: 0.035 },
      FACEBOOK_ADS: { baseImpressions: 12000, baseCtr: 0.025 },
      BEHAVIORAL_ADS: { baseImpressions: 15000, baseCtr: 0.008 },
      GMAIL_ADS: { baseImpressions: 6000, baseCtr: 0.02 },
      YOUTUBE_ADS: { baseImpressions: 20000, baseCtr: 0.005 },
      QR_CODES: { baseImpressions: 0, baseCtr: 0 },
    };

    const metricsData = [];
    for (const ch of channels) {
      const config = channelConfigs[ch] || { baseImpressions: 5000, baseCtr: 0.02 };
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const variance = 0.7 + Math.random() * 0.6;
        const impressions = ch === "MAIL_TRACKING" || ch === "CALL_TRACKING" || ch === "QR_CODES"
          ? 0
          : Math.round(config.baseImpressions * variance);
        const clicks = Math.round(impressions * config.baseCtr * (0.8 + Math.random() * 0.4));
        const leads = Math.round(clicks * 0.08 * (0.5 + Math.random()));
        const calls = ch === "CALL_TRACKING" ? Math.round(3 + Math.random() * 12) : Math.round(leads * 0.3);

        metricsData.push({
          campaignId: campaign.id,
          channel: ch,
          date,
          impressions,
          clicks,
          leads,
          calls,
          qualifiedCalls: Math.round(calls * 0.6),
          conversions: Math.round(leads * 0.15),
          spend: Math.round(impressions * 0.012 * 100) / 100,
          piecesDelivered: ch === "MAIL_TRACKING" ? Math.round(80 + Math.random() * 300) : 0,
          qrScans: ch === "QR_CODES" ? Math.round(5 + Math.random() * 25) : 0,
        });
      }
    }

    await prisma.campaignMetricDaily.createMany({ data: metricsData });

    // Create mail batches for mail campaigns
    if ((channels as ChannelType[]).includes(ChannelType.MAIL_TRACKING)) {
      await prisma.mailBatch.createMany({
        data: [
          {
            campaignId: campaign.id,
            batchName: `${campaign.name} - Batch 1`,
            quantity: 5000,
            dropDate: campaign.startDate || new Date(),
            deliveredCount: 4750,
            returnedCount: 125,
            inTransitCount: 125,
            status: "delivered",
          },
          {
            campaignId: campaign.id,
            batchName: `${campaign.name} - Batch 2`,
            quantity: 5000,
            dropDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            deliveredCount: 3200,
            returnedCount: 50,
            inTransitCount: 1750,
            status: "in_transit",
          },
        ],
      });
    }

    console.log(`Created campaign: ${campaign.name} with ${metricsData.length} metric rows`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
