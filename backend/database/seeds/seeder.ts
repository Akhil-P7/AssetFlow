import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import * as path from 'path';

/**
 * Database seeder — creates demo data for development.
 * Run via: npm run seed
 *
 * Creates:
 * - 5 employees (admin, asset manager, dept head, 2 employees)
 * - 3 departments (Engineering, Operations, HR)
 * - 3 asset categories (Electronics, Furniture, Vehicles)
 * - 8 assets (mix of bookable and non-bookable)
 * - 2 sample allocations
 */
async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5433', 10),
    username: process.env.DATABASE_USER || 'assetflow',
    password: process.env.DATABASE_PASSWORD || 'assetflow_dev',
    database: process.env.DATABASE_NAME || 'assetflow_dev',
    entities: [path.join(__dirname, '..', 'src', 'modules', '**', '*.entity.{ts,js}')],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  console.log('🌱 Connected to database, starting seed...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // ─── Check if already seeded ───
    const existingAdmin = await queryRunner.query(
      `SELECT id FROM employee WHERE email = 'admin@assetflow.local'`
    );
    if (existingAdmin.length > 0) {
      console.log('⚠️  Database already seeded (admin user exists). Skipping.');
      await queryRunner.rollbackTransaction();
      await dataSource.destroy();
      return;
    }

    // ─── 1. Hash passwords ───
    const adminHash = await argon2.hash('Admin@123');
    const userHash = await argon2.hash('User@123');

    // ─── 2. Create Departments ───
    const departments = await queryRunner.query(`
      INSERT INTO department (id, name, status) VALUES
        (gen_random_uuid(), 'Engineering', 'ACTIVE'),
        (gen_random_uuid(), 'Operations', 'ACTIVE'),
        (gen_random_uuid(), 'Human Resources', 'ACTIVE')
      RETURNING id, name
    `);
    console.log(`  ✅ Created ${departments.length} departments`);

    const engDeptId = departments.find((d: any) => d.name === 'Engineering').id;
    const opsDeptId = departments.find((d: any) => d.name === 'Operations').id;
    const hrDeptId = departments.find((d: any) => d.name === 'Human Resources').id;

    // ─── 3. Create Employees ───
    const employees = await queryRunner.query(`
      INSERT INTO employee (id, name, email, password_hash, department_id, role, status) VALUES
        (gen_random_uuid(), 'System Admin',    'admin@assetflow.local',    $1, $3, 'ADMIN',            'ACTIVE'),
        (gen_random_uuid(), 'Asset Manager',   'manager@assetflow.local',  $2, $4, 'ASSET_MANAGER',    'ACTIVE'),
        (gen_random_uuid(), 'Dept Head Eng',   'depthead@assetflow.local', $2, $3, 'DEPARTMENT_HEAD',  'ACTIVE'),
        (gen_random_uuid(), 'Priya Shah',      'priya@assetflow.local',    $2, $3, 'EMPLOYEE',         'ACTIVE'),
        (gen_random_uuid(), 'Rahul Mehta',     'rahul@assetflow.local',    $2, $5, 'EMPLOYEE',         'ACTIVE')
      RETURNING id, name, email, role
    `, [adminHash, userHash, engDeptId, opsDeptId, hrDeptId]);
    console.log(`  ✅ Created ${employees.length} employees`);

    const adminId = employees.find((e: any) => e.role === 'ADMIN').id;
    const managerId = employees.find((e: any) => e.role === 'ASSET_MANAGER').id;
    const deptHeadId = employees.find((e: any) => e.role === 'DEPARTMENT_HEAD').id;
    const priyaId = employees.find((e: any) => e.email === 'priya@assetflow.local').id;
    const rahulId = employees.find((e: any) => e.email === 'rahul@assetflow.local').id;

    // Set department heads
    await queryRunner.query(
      `UPDATE department SET department_head_id = $1 WHERE id = $2`,
      [deptHeadId, engDeptId]
    );

    // ─── 4. Create Asset Categories ───
    const categories = await queryRunner.query(`
      INSERT INTO asset_category (id, name, custom_fields, status) VALUES
        (gen_random_uuid(), 'Electronics', '[{"key":"warranty_months","label":"Warranty Period (months)","type":"number"}]', 'ACTIVE'),
        (gen_random_uuid(), 'Furniture',   '[{"key":"material","label":"Material","type":"text"}]', 'ACTIVE'),
        (gen_random_uuid(), 'Vehicles',    '[{"key":"registration_no","label":"Registration Number","type":"text"},{"key":"fuel_type","label":"Fuel Type","type":"text"}]', 'ACTIVE')
      RETURNING id, name
    `);
    console.log(`  ✅ Created ${categories.length} asset categories`);

    const electronicsId = categories.find((c: any) => c.name === 'Electronics').id;
    const furnitureId = categories.find((c: any) => c.name === 'Furniture').id;
    const vehiclesId = categories.find((c: any) => c.name === 'Vehicles').id;

    // ─── 5. Create Assets ───
    const assets = await queryRunner.query(`
      INSERT INTO asset (id, asset_tag, name, category_id, serial_number, acquisition_date, acquisition_cost, condition, location, department_id, is_bookable, status, qr_code_url) VALUES
        (gen_random_uuid(), 'AF-0001', 'MacBook Pro 16"',       $1, 'SN-MBP-001',  '2025-01-15', 249999.00, 'Excellent', 'Floor 3, Desk 12',   $4,   false, 'AVAILABLE',  'https://api.assetflow.io/qr/AF-0001'),
        (gen_random_uuid(), 'AF-0002', 'Dell Monitor 27"',      $1, 'SN-MON-001',  '2025-02-10', 34999.00,  'Good',      'Floor 3, Desk 12',   $4,   false, 'AVAILABLE',  'https://api.assetflow.io/qr/AF-0002'),
        (gen_random_uuid(), 'AF-0003', 'iPhone 15 Pro',         $1, 'SN-IPH-001',  '2025-03-05', 134999.00, 'Good',      'Floor 2, Desk 5',    $5,   false, 'AVAILABLE',  'https://api.assetflow.io/qr/AF-0003'),
        (gen_random_uuid(), 'AF-0004', 'Standing Desk',         $2, 'SN-DSK-001',  '2024-11-20', 45000.00,  'Good',      'Floor 3, Desk 15',   $4,   false, 'AVAILABLE',  'https://api.assetflow.io/qr/AF-0004'),
        (gen_random_uuid(), 'AF-0005', 'Ergonomic Chair',       $2, 'SN-CHR-001',  '2024-12-01', 28000.00,  'Fair',      'Floor 2, Desk 8',    $5,   false, 'AVAILABLE',  'https://api.assetflow.io/qr/AF-0005'),
        (gen_random_uuid(), 'AF-0006', 'Conference Room Alpha', $2, NULL,           '2023-06-01', 150000.00, 'Excellent', 'Floor 1, Room 101',  $4,   true,  'AVAILABLE',  'https://api.assetflow.io/qr/AF-0006'),
        (gen_random_uuid(), 'AF-0007', 'Toyota Innova',         $3, 'REG-MH12-AB', '2024-06-15', 1800000.00,'Good',      'Parking Lot B',      $5,   true,  'AVAILABLE',  'https://api.assetflow.io/qr/AF-0007'),
        (gen_random_uuid(), 'AF-0008', 'Projector Epson EB',    $1, 'SN-PRJ-001',  '2025-04-10', 89999.00,  'Good',      'Floor 1, AV Cabinet',$4,   true,  'AVAILABLE',  'https://api.assetflow.io/qr/AF-0008')
      RETURNING id, asset_tag, name
    `, [electronicsId, furnitureId, vehiclesId, engDeptId, opsDeptId]);
    console.log(`  ✅ Created ${assets.length} assets`);

    // Update the asset_tag_seq to start after our manual inserts
    await queryRunner.query(`SELECT setval('asset_tag_seq', 8, true)`);

    // ─── 6. Create sample allocations ───
    const macbookId = assets.find((a: any) => a.asset_tag === 'AF-0001').id;
    const iphoneId = assets.find((a: any) => a.asset_tag === 'AF-0003').id;

    await queryRunner.query(`
      INSERT INTO allocation (asset_id, employee_id, department_id, expected_return_date, created_by, status) VALUES
        ($1, $3, $5, '2026-12-31', $4, 'ACTIVE'),
        ($2, $6, $7, '2026-09-30', $4, 'ACTIVE')
    `, [macbookId, iphoneId, priyaId, managerId, engDeptId, rahulId, opsDeptId]);

    // Update asset status to ALLOCATED
    await queryRunner.query(`UPDATE asset SET status = 'ALLOCATED' WHERE id IN ($1, $2)`, [macbookId, iphoneId]);
    console.log(`  ✅ Created 2 sample allocations`);

    // ─── 7. Create a sample booking (Conference Room Alpha, tomorrow 10-11am) ───
    const confRoomId = assets.find((a: any) => a.asset_tag === 'AF-0006').id;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startTime = new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString();
    const endTime = new Date(tomorrow.setHours(11, 0, 0, 0)).toISOString();

    await queryRunner.query(`
      INSERT INTO booking (resource_id, booked_by, time_range, status) VALUES
        ($1, $2, tstzrange($3::timestamptz, $4::timestamptz, '[)'), 'UPCOMING')
    `, [confRoomId, priyaId, startTime, endTime]);
    console.log(`  ✅ Created 1 sample booking`);

    await queryRunner.commitTransaction();

    console.log('\n🎉 Seed complete! Demo accounts:');
    console.log('   Admin:        admin@assetflow.local    / Admin@123');
    console.log('   Manager:      manager@assetflow.local  / User@123');
    console.log('   Dept Head:    depthead@assetflow.local / User@123');
    console.log('   Employee 1:   priya@assetflow.local    / User@123');
    console.log('   Employee 2:   rahul@assetflow.local    / User@123');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
