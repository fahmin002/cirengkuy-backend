import prisma from "../config/db.js";

import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  endOfDay,
  format,
} from "date-fns";
import { id } from "date-fns/locale";

export const getRevenueSummary = async (req, res) => {
  try {
    const today = startOfDay(new Date());

    const week = startOfWeek(new Date(), {
      weekStartsOn: 1,
    });

    const month = startOfMonth(new Date());
    const revenueStatuses = ["paid", "cooking", "ready", "completed"];

    const [todayRevenue, weekRevenue, monthRevenue] = await Promise.all([
      prisma.order.aggregate({
        _sum: {
          total: true,
        },
        where: {
          status: {
            in: revenueStatuses,
          },
          createdAt: {
            gte: today,
          },
        },
      }),

      prisma.order.aggregate({
        _sum: {
          total: true,
        },
        where: {
          status: {
            in: revenueStatuses,
          },

          createdAt: {
            gte: week,
          },
        },
      }),

      prisma.order.aggregate({
        _sum: {
          total: true,
        },
        where: {
          status: {
            in: revenueStatuses,
          },

          createdAt: {
            gte: month,
          },
        },
      }),
    ]);

    res.json({
      success: true,

      data: {
        today: todayRevenue?._sum?.total ?? 0,
        week: weekRevenue?._sum?.total ?? 0,
        month: monthRevenue?._sum?.total ?? 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTopProducts = async (req, res) => {
  try {
    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        Order: {
          status: {
            in: ["paid", "ready", "completed"],
          },
        },
      },
      _sum: {
        qty: true,
      },

      orderBy: {
        _sum: {
          qty: "desc",
        },
      },

      take: 5,
    });

    const products = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: {
            id: item.productId,
          },
        });

        return {
          id: product.id,

          name: product.name,

          image: product.imageUrl,

          sold: item._sum.qty,
        };
      }),
    );

    res.json({
      success: true,

      data: products,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const getRevenueChart = async (req, res) => {
  try {
    const revenueStatuses = ["paid", "ready", "completed"];

    const chart = [];

    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);

      const start = startOfDay(date);

      const end = endOfDay(date);

      const revenue = await prisma.order.aggregate({
        _sum: {
          total: true,
        },

        where: {
          status: {
            in: revenueStatuses,
          },

          createdAt: {
            gte: start,
            lte: end,
          },
        },
      });

      chart.push({
        date: format(date, "EEE", { locale: id }),

        revenue: revenue._sum.total || 0,
      });
    }
    res.json({
      success: true,
      data: chart,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
