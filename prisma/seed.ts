import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Price Levels (1 - 5)
  const priceLevels = [
    { price_level_id: 1, price_level_code: 'PRICE_1', price_level_name: 'Harga 1' },
    { price_level_id: 2, price_level_code: 'PRICE_2', price_level_name: 'Harga 2' },
    { price_level_id: 3, price_level_code: 'PRICE_3', price_level_name: 'Harga 3' },
    { price_level_id: 4, price_level_code: 'PRICE_4', price_level_name: 'Harga 4' },
    { price_level_id: 5, price_level_code: 'PRICE_5', price_level_name: 'Harga 5' },
  ];

  for (const pl of priceLevels) {
    await prisma.m_price_level.upsert({
      where: { price_level_id: pl.price_level_id },
      update: {
        price_level_code: pl.price_level_code,
        price_level_name: pl.price_level_name,
      },
      create: pl,
    });
  }
  console.log('Seeded price levels.');

  // 2. Seed Roles
  const adminRole = await prisma.m_role.upsert({
    where: { role_code: 'ADMIN' },
    update: {},
    create: {
      role_code: 'ADMIN',
      role_name: 'Administrator',
    },
  });

  const cashierRole = await prisma.m_role.upsert({
    where: { role_code: 'CASHIER' },
    update: {},
    create: {
      role_code: 'CASHIER',
      role_name: 'Kasir',
    },
  });
  console.log('Seeded roles.');

  // 3. Seed Default Admin User
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.m_user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      full_name: 'Super Administrator',
      password_hash: adminPasswordHash,
      role_id: adminRole.role_id,
    },
  });

  const cashierPasswordHash = await bcrypt.hash('kasir123', 10);
  await prisma.m_user.upsert({
    where: { username: 'kasir' },
    update: {},
    create: {
      username: 'kasir',
      full_name: 'Kasir Utama',
      password_hash: cashierPasswordHash,
      role_id: cashierRole.role_id,
    },
  });
  console.log('Seeded users (admin/admin123, kasir/kasir123).');

  // 4. Seed Menus
  const menusData = [
    { menu_code: 'DASHBOARD', menu_name: 'Dashboard', route_path: '/', sort_order: 1 },
    { menu_code: 'MASTER', menu_name: 'Master Data', route_path: null, sort_order: 2 },
    { menu_code: 'MASTER_UNIT', menu_name: 'Satuan', route_path: '/master/unit', sort_order: 3, parent_code: 'MASTER' },
    { menu_code: 'MASTER_BRAND', menu_name: 'Merek', route_path: '/master/brand', sort_order: 4, parent_code: 'MASTER' },
    { menu_code: 'MASTER_SUPPLIER', menu_name: 'Supplier', route_path: '/master/supplier', sort_order: 5, parent_code: 'MASTER' },
    { menu_code: 'MASTER_CUSTOMER', menu_name: 'Pelanggan', route_path: '/master/customer', sort_order: 6, parent_code: 'MASTER' },
    { menu_code: 'MASTER_PRODUCT', menu_name: 'Produk', route_path: '/master/product', sort_order: 7, parent_code: 'MASTER' },
    { menu_code: 'MASTER_USER_ROLE', menu_name: 'User & Role', route_path: '/master/user-role', sort_order: 8, parent_code: 'MASTER' },
    { menu_code: 'PURCHASE', menu_name: 'Pembelian', route_path: '/purchase', sort_order: 9 },
    { menu_code: 'SALES', menu_name: 'Penjualan', route_path: '/sales', sort_order: 10 },
    { menu_code: 'RETURN', menu_name: 'Retur Penjualan', route_path: '/returns', sort_order: 11 },
    { menu_code: 'REPORT', menu_name: 'Report', route_path: null, sort_order: 12 },
    { menu_code: 'REPORT_PURCHASE', menu_name: 'Report Purchase', route_path: '/laporan/purchase', sort_order: 13 },
    { menu_code: 'REPORT_SALE', menu_name: 'Report Sale', route_path: '/laporan/sales', sort_order: 14 },
    { menu_code: 'REPORT_RETUR_SALE', menu_name: 'Report Retur', route_path: '/laporan/retur', sort_order: 15 },
  ];

  // Insert parents first
  const menuMap: { [key: string]: number } = {};
  for (const m of menusData.filter(x => !x.parent_code)) {
    const dbMenu = await prisma.m_menu.upsert({
      where: { menu_code: m.menu_code },
      update: {
        menu_name: m.menu_name,
        route_path: m.route_path,
        sort_order: m.sort_order,
      },
      create: {
        menu_code: m.menu_code,
        menu_name: m.menu_name,
        route_path: m.route_path,
        sort_order: m.sort_order,
      },
    });
    menuMap[m.menu_code] = dbMenu.menu_id;
  }

  // Insert children
  for (const m of menusData.filter(x => x.parent_code)) {
    const parentId = menuMap[m.parent_code!];
    const dbMenu = await prisma.m_menu.upsert({
      where: { menu_code: m.menu_code },
      update: {
        menu_name: m.menu_name,
        route_path: m.route_path,
        sort_order: m.sort_order,
        parent_menu_id: parentId,
      },
      create: {
        menu_code: m.menu_code,
        menu_name: m.menu_name,
        route_path: m.route_path,
        sort_order: m.sort_order,
        parent_menu_id: parentId,
      },
    });
    menuMap[m.menu_code] = dbMenu.menu_id;
  }
  console.log('Seeded menus.');

  // 5. Seed Role Menus (Permissions)
  // Clear existing role menus first
  await prisma.m_role_menu.deleteMany({});

  const allMenus = await prisma.m_menu.findMany({});

  // ADMIN role gets all menus
  for (const menu of allMenus) {
    await prisma.m_role_menu.create({
      data: {
        role_id: adminRole.role_id,
        menu_id: menu.menu_id,
      },
    });
  }

  // CASHIER role gets DASHBOARD, SALES, and RETURN
  const cashierAllowedCodes = ['DASHBOARD', 'SALES', 'RETURN'];
  const cashierMenus = allMenus.filter(m => cashierAllowedCodes.includes(m.menu_code));
  for (const menu of cashierMenus) {
    await prisma.m_role_menu.create({
      data: {
        role_id: cashierRole.role_id,
        menu_id: menu.menu_id,
      },
    });
  }

  console.log('Seeded role menu permissions.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
