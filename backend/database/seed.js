import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import logger from '../helpers/logger.js';

async function seed() {
  const client = await pool.connect();

  try {
    logger.info('Starting database seed...');

    // ── 1. Admin User ─────────────────────────────────────
    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = 'admin@studentmanagement.com'"
    );

    if (existingUser.rows.length > 0) {
      logger.info('Admin user already exists, skipping...');
    } else {
      const password = 'Admin@123';
      const passwordHash = await bcrypt.hash(password, 12);
      await client.query(
        `INSERT INTO users (username, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        ['admin', 'admin@studentmanagement.com', passwordHash, 'System Admin', 'superadmin']
      );
      logger.info('✅ Admin user created');
    }

    // ── 2. Departments ────────────────────────────────────
    const departments = [
      { name: 'Computer Science', code: 'CS', description: 'Department of Computer Science and Information Technology' },
      { name: 'Mathematics', code: 'MATH', description: 'Department of Mathematics and Statistics' },
      { name: 'Business Administration', code: 'BUS', description: 'Department of Business and Management Studies' },
      { name: 'Electrical Engineering', code: 'EE', description: 'Department of Electrical and Electronic Engineering' },
      { name: 'English Literature', code: 'ENG', description: 'Department of English Language and Literature' },
    ];

    const deptMap = {}; // name -> id
    for (const dept of departments) {
      const existing = await client.query(
        "SELECT id FROM departments WHERE code = $1", [dept.code]
      );
      if (existing.rows.length > 0) {
        deptMap[dept.name] = existing.rows[0].id;
        logger.info(`  ⏩ Department ${dept.code} already exists`);
      } else {
        const result = await client.query(
          `INSERT INTO departments (name, code, description)
           VALUES ($1, $2, $3) RETURNING id`,
          [dept.name, dept.code, dept.description]
        );
        deptMap[dept.name] = result.rows[0].id;
        logger.info(`  ✅ Department ${dept.code} created`);
      }
    }

    // ── 3. Courses (linked to departments) ─────────────────
    const courses = [
      { name: 'Data Structures & Algorithms', code: 'CS201', credits: 4, dept: 'Computer Science' },
      { name: 'Database Management Systems', code: 'CS301', credits: 3, dept: 'Computer Science' },
      { name: 'Web Development', code: 'CS401', credits: 3, dept: 'Computer Science' },
      { name: 'Artificial Intelligence', code: 'CS501', credits: 4, dept: 'Computer Science' },
      { name: 'Calculus I', code: 'MATH101', credits: 4, dept: 'Mathematics' },
      { name: 'Linear Algebra', code: 'MATH201', credits: 3, dept: 'Mathematics' },
      { name: 'Probability & Statistics', code: 'MATH301', credits: 3, dept: 'Mathematics' },
      { name: 'Principles of Management', code: 'BUS101', credits: 3, dept: 'Business Administration' },
      { name: 'Financial Accounting', code: 'BUS201', credits: 3, dept: 'Business Administration' },
      { name: 'Marketing Fundamentals', code: 'BUS301', credits: 3, dept: 'Business Administration' },
      { name: 'Circuit Analysis', code: 'EE201', credits: 4, dept: 'Electrical Engineering' },
      { name: 'Digital Logic Design', code: 'EE301', credits: 3, dept: 'Electrical Engineering' },
      { name: 'English Composition', code: 'ENG101', credits: 3, dept: 'English Literature' },
      { name: 'Shakespeare Studies', code: 'ENG301', credits: 3, dept: 'English Literature' },
    ];

    const courseMap = {}; // name -> id
    for (const course of courses) {
      const existing = await client.query(
        "SELECT id FROM courses WHERE code = $1", [course.code]
      );
      if (existing.rows.length > 0) {
        courseMap[course.name] = existing.rows[0].id;
        logger.info(`  ⏩ Course ${course.code} already exists`);
      } else {
        const result = await client.query(
          `INSERT INTO courses (name, code, description, credits, department_id)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [course.name, course.code, `Introduction to ${course.name}`, course.credits, deptMap[course.dept]]
        );
        courseMap[course.name] = result.rows[0].id;
        logger.info(`  ✅ Course ${course.code} created`);
      }
    }

    // ── 4. Students (linked to departments & courses) ─────
    const students = [
      { sid: 'STU2024001', first: 'Ali', last: 'Khan', email: 'ali.khan@example.com', phone: '+92-300-1112233', gender: 'Male', dept: 'Computer Science', course: 'Data Structures & Algorithms', city: 'Lahore', state: 'Punjab', status: 'active' },
      { sid: 'STU2024002', first: 'Fatima', last: 'Ahmed', email: 'fatima.ahmed@example.com', phone: '+92-321-2223344', gender: 'Female', dept: 'Computer Science', course: 'Database Management Systems', city: 'Karachi', state: 'Sindh', status: 'active' },
      { sid: 'STU2024003', first: 'Ahmed', last: 'Hassan', email: 'ahmed.hassan@example.com', phone: '+92-333-3334455', gender: 'Male', dept: 'Mathematics', course: 'Calculus I', city: 'Islamabad', state: 'Capital', status: 'active' },
      { sid: 'STU2024004', first: 'Sana', last: 'Malik', email: 'sana.malik@example.com', phone: '+92-345-4445566', gender: 'Female', dept: 'Business Administration', course: 'Principles of Management', city: 'Lahore', state: 'Punjab', status: 'active' },
      { sid: 'STU2024005', first: 'Usman', last: 'Butt', email: 'usman.butt@example.com', phone: '+92-300-5556677', gender: 'Male', dept: 'Electrical Engineering', course: 'Circuit Analysis', city: 'Rawalpindi', state: 'Punjab', status: 'active' },
      { sid: 'STU2024006', first: 'Ayesha', last: 'Iqbal', email: 'ayesha.iqbal@example.com', phone: '+92-321-6667788', gender: 'Female', dept: 'Computer Science', course: 'Web Development', city: 'Karachi', state: 'Sindh', status: 'active' },
      { sid: 'STU2024007', first: 'Bilal', last: 'Sheikh', email: 'bilal.sheikh@example.com', phone: '+92-333-7778899', gender: 'Male', dept: 'Mathematics', course: 'Linear Algebra', city: 'Faisalabad', state: 'Punjab', status: 'active' },
      { sid: 'STU2024008', first: 'Zainab', last: 'Raza', email: 'zainab.raza@example.com', phone: '+92-345-8889900', gender: 'Female', dept: 'Business Administration', course: 'Financial Accounting', city: 'Lahore', state: 'Punjab', status: 'active' },
      { sid: 'STU2024009', first: 'Hamza', last: 'Ali', email: 'hamza.ali@example.com', phone: '+92-300-9990011', gender: 'Male', dept: 'Electrical Engineering', course: 'Digital Logic Design', city: 'Multan', state: 'Punjab', status: 'active' },
      { sid: 'STU2024010', first: 'Mahnoor', last: 'Tariq', email: 'mahnoor.tariq@example.com', phone: '+92-321-0001122', gender: 'Female', dept: 'English Literature', course: 'English Composition', city: 'Islamabad', state: 'Capital', status: 'active' },
      { sid: 'STU2024011', first: 'Omar', last: 'Farooq', email: 'omar.farooq@example.com', phone: '+92-333-1112233', gender: 'Male', dept: 'Computer Science', course: 'Artificial Intelligence', city: 'Lahore', state: 'Punjab', status: 'active' },
      { sid: 'STU2024012', first: 'Hira', last: 'Akram', email: 'hira.akram@example.com', phone: '+92-345-2223344', gender: 'Female', dept: 'Mathematics', course: 'Probability & Statistics', city: 'Karachi', state: 'Sindh', status: 'inactive' },
      { sid: 'STU2024013', first: 'Talal', last: 'Chaudhry', email: 'talal.chaudhry@example.com', phone: '+92-300-3334455', gender: 'Male', dept: 'Business Administration', course: 'Marketing Fundamentals', city: 'Rawalpindi', state: 'Punjab', status: 'active' },
      { sid: 'STU2024014', first: 'Iqra', last: 'Nawaz', email: 'iqra.nawaz@example.com', phone: '+92-321-4445566', gender: 'Female', dept: 'English Literature', course: 'Shakespeare Studies', city: 'Faisalabad', state: 'Punjab', status: 'active' },
      { sid: 'STU2024015', first: 'Rehan', last: 'Qureshi', email: 'rehan.qureshi@example.com', phone: '+92-333-5556677', gender: 'Male', dept: 'Computer Science', course: 'Data Structures & Algorithms', city: 'Multan', state: 'Punjab', status: 'graduated' },
    ];

    const STUDENT_DEFAULT_PASSWORD = 'Student@123';
    let studentCount = 0;
    let studentUserCount = 0;
    // Pre-hash the common default password once (avoids 15 sequential bcrypt calls)
    const studentPasswordHash = await bcrypt.hash(STUDENT_DEFAULT_PASSWORD, 12);
    for (const s of students) {
      const existing = await client.query(
        "SELECT id FROM students WHERE student_id = $1", [s.sid]
      );
      if (existing.rows.length > 0) {
        logger.info(`  ⏩ Student ${s.sid} already exists`);
      } else {
        await client.query(
          `INSERT INTO students (
            student_id, first_name, last_name, email, phone, gender,
            department_id, course_id, city, state, country, status,
            emergency_contact_name, emergency_contact_phone
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            s.sid, s.first, s.last, s.email, s.phone, s.gender,
            deptMap[s.dept], courseMap[s.course],
            s.city, s.state, 'Pakistan', s.status,
            `${s.first} ${s.last} - Emergency`, '+92-300-0000000'
          ]
        );
        studentCount++;
        logger.info(`  ✅ Student ${s.sid} (${s.first} ${s.last}) created`);
      }

      // ── 4a. Student User Accounts ────────────────────────
      // Create or fix corresponding login accounts in the users table so
      // students can log in through the Student portal.
      const existingUserAccount = await client.query(
        "SELECT id, password_hash FROM users WHERE email = $1", [s.email]
      );
      if (existingUserAccount.rows.length > 0) {
        const existing = existingUserAccount.rows[0];
        // If the password_hash is missing/broken (from a previous buggy seed),
        // update it with the correct hash
        if (!existing.password_hash || existing.password_hash.length < 10) {
          await client.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [studentPasswordHash, existing.id]
          );
          logger.info(`  🔧 Fixed password hash for ${s.email}`);
        } else {
          logger.info(`  ⏩ Student user account for ${s.email} already exists`);
        }
      } else {
        const username = s.email.split('@')[0].slice(0, 50);
        await client.query(
          `INSERT INTO users (username, email, password_hash, full_name, role)
           VALUES ($1, $2, $3, $4, $5)`,
          [username, s.email, studentPasswordHash, `${s.first} ${s.last}`, 'student']
        );
        studentUserCount++;
        logger.info(`  ✅ Student user account created for ${s.email}`);
      }
    }

    // ── Summary ───────────────────────────────────────────
    logger.info('');
    logger.info('========================================');
    logger.info('   🌟 SEED DATA ADDED SUCCESSFULLY!');
    logger.info('========================================');
    logger.info(`   Departments  : ${departments.length}`);
    logger.info(`   Courses      : ${courses.length}`);
    logger.info(`   Students     : ${studentCount > 0 ? `${studentCount} new` : 'Already exists'}`);
    logger.info(`   Student Accts: ${studentUserCount > 0 ? `${studentUserCount} new` : 'Already exists'}`);
    logger.info('========================================');
    logger.info('');
    logger.info('📋 Admin Login:');
    logger.info(`   Email    : admin@studentmanagement.com`);
    logger.info(`   Password : Admin@123`);
    logger.info('');
    logger.info('📋 Student Login (for all student accounts):');
    logger.info(`   Password : ${STUDENT_DEFAULT_PASSWORD}`);
    logger.info('');
    logger.info('📋 Sample Student Accounts:');
    logger.info(`   ali.khan@example.com       (Ali Khan)`);
    logger.info(`   fatima.ahmed@example.com   (Fatima Ahmed)`);
    logger.info(`   ahmed.hassan@example.com   (Ahmed Hassan)`);
    logger.info('========================================');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Database seed failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();
