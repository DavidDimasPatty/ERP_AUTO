import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start') || searchParams.get('date_from');
    const end = searchParams.get('end') || searchParams.get('date_to');
    const productIdParam = searchParams.get('product_id');
    const search = searchParams.get('search')?.trim() || '';
    const salesType = searchParams.get('sales_type') || searchParams.get('type');
    
    // Pagination parameters (Default limit = 5)
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const page = Math.max(1, parseInt(pageParam || '1', 10));
    const isLimitAll = limitParam && (limitParam.toUpperCase() === 'ALL' || limitParam.toUpperCase() === 'SEMUA');
    const limit = isLimitAll ? 0 : Math.max(1, parseInt(limitParam || '5', 10));

    // Build Prisma query condition
    const salesWhere: Prisma.t_salesWhereInput = {
      transaction_status: 'COMPLETED',
    };

    // Filter Sales DateTime Range
    if (start || end) {
      salesWhere.sales_datetime = {
        ...(start ? { gte: new Date(`${start}T00:00:00.000Z`) } : {}),
        ...(end ? { lte: new Date(`${end}T23:59:59.999Z`) } : {}),
      };
    }

    // Filter Sales Type (ECERAN, BENGKEL)
    if (salesType && salesType.toUpperCase() !== 'ALL' && salesType.toUpperCase() !== 'SEMUA') {
      salesWhere.sales_type = salesType.toUpperCase();
    }

    const whereDetail: Prisma.t_sales_detailWhereInput = {
      sales: salesWhere,
    };

    // Filter Product ID
    if (productIdParam && productIdParam !== '0' && productIdParam !== '') {
      const pId = parseInt(productIdParam, 10);
      if (!isNaN(pId)) {
        whereDetail.product_id = pId;
      }
    }

    // Filter Search Keyword (Product Code, Product Name, Brand Name, Description)
    if (search) {
      whereDetail.OR = [
        { product_code_snapshot: { contains: search } },
        { product_name_snapshot: { contains: search } },
        { product: { product_name: { contains: search } } },
        { product: { product_code: { contains: search } } },
        { product: { product_description: { contains: search } } },
        { product: { brand: { brand_name: { contains: search } } } },
      ];
    }

    const details = await prisma.t_sales_detail.findMany({
      where: whereDetail,
      include: {
        sales: {
          include: {
            cashier: {
              select: { full_name: true, username: true },
            },
          },
        },
        product: {
          include: {
            brand: true,
          },
        },
      },
      orderBy: [
        { product_name_snapshot: 'asc' },
        { sales: { sales_datetime: 'desc' } },
      ],
    });

    // Grouping by product_id
    const groupedMap = new Map<number, {
      product_id: number;
      product_code: string;
      product_name: string;
      unit_name: string;
      total_transaction: number;
      total_quantity: number;
      total_product_sales: number;
      sales_set: Set<number>;
      transactions: Array<{
        sales_id: number;
        sales_number: string;
        sales_datetime: string;
        raw_datetime: Date;
        sales_type: string;
        customer_name: string;
        cashier_name: string;
        quantity: number;
        unit_price: number;
        product_total: number;
        payment_status: string;
      }>;
    }>();

    for (const d of details) {
      const pId = d.product_id;
      const salesObj = d.sales;

      if (!groupedMap.has(pId)) {
        groupedMap.set(pId, {
          product_id: pId,
          product_code: d.product_code_snapshot || d.product?.product_code || '-',
          product_name: d.product_name_snapshot || d.product?.product_name || '-',
          unit_name: d.unit_name_snapshot || 'PCS',
          total_transaction: 0,
          total_quantity: 0,
          total_product_sales: 0,
          sales_set: new Set<number>(),
          transactions: [],
        });
      }

      const group = groupedMap.get(pId)!;
      const qty = d.quantity || 0;
      const price = Number(d.unit_price) || 0;
      const lineTotal = Number(d.line_total) || (qty * price);

      group.total_quantity += qty;
      group.total_product_sales += lineTotal;
      group.sales_set.add(d.sales_id);

      const customerName = salesObj.customer_name_snapshot || 'Pelanggan Umum';
      const cashierName = salesObj.cashier_name_snapshot || salesObj.cashier?.full_name || '-';

      group.transactions.push({
        sales_id: d.sales_id,
        sales_number: salesObj.sales_number,
        sales_datetime: salesObj.sales_datetime
          ? format(new Date(salesObj.sales_datetime), 'dd/MM/yyyy HH:mm')
          : '-',
        raw_datetime: salesObj.sales_datetime,
        sales_type: salesObj.sales_type || 'BENGKEL',
        customer_name: customerName,
        cashier_name: cashierName,
        quantity: qty,
        unit_price: price,
        product_total: lineTotal,
        payment_status: salesObj.payment_status || 'PAID',
      });
    }

    // Convert map to all product groups
    const allGroups = Array.from(groupedMap.values()).map((g) => ({
      product_id: g.product_id,
      product_code: g.product_code,
      product_name: g.product_name,
      unit_name: g.unit_name,
      total_transaction: g.sales_set.size,
      total_quantity: g.total_quantity,
      total_product_sales: g.total_product_sales,
      transactions: g.transactions,
    }));

    // Calculate grand totals across all matching products
    const totalProducts = allGroups.length;
    const grandTotalQuantity = allGroups.reduce((acc, g) => acc + g.total_quantity, 0);
    const grandTotalSales = allGroups.reduce((acc, g) => acc + g.total_product_sales, 0);
    const totalTransactionsCount = allGroups.reduce((acc, g) => acc + g.total_transaction, 0);

    // Apply pagination (Default limit = 5)
    let paginatedGroups = allGroups;
    let totalPages = 1;

    if (limit > 0) {
      totalPages = Math.ceil(totalProducts / limit) || 1;
      const skip = (page - 1) * limit;
      paginatedGroups = allGroups.slice(skip, skip + limit);
    }

    return NextResponse.json({
      data: paginatedGroups,
      pagination: {
        total: totalProducts,
        page,
        limit: limit === 0 ? totalProducts : limit,
        totalPages,
      },
      grandTotals: {
        totalProducts,
        totalQuantity: grandTotalQuantity,
        totalSales: grandTotalSales,
        totalTransactions: totalTransactionsCount,
      },
      allDataForExport: isLimitAll ? undefined : allGroups,
    });
  } catch (error: any) {
    console.error('GET Laporan Sales Product Error:', error);
    return NextResponse.json({ message: 'Kesalahan server internal' }, { status: 500 });
  }
}
