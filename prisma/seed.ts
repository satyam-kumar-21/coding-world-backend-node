import { PrismaClient, Role, CourseLevel, CourseStatus, ProblemDifficulty, ProblemCategory, ProblemType } from '@prisma/client';
import argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ─── Roles / Admin ────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@codingworld.in';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@CodingWorld2024!';
  const adminHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      username: 'admin_cw',
      passwordHash: adminHash,
      role: Role.SUPER_ADMIN,
      isEmailVerified: true,
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'CodingWorld',
          displayName: 'Admin',
          bio: 'Platform administrator',
          privacySettings: { create: {} },
        },
      },
      gamification: { create: {} },
      streaks: { create: {} },
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ─── Instructor ────────────────────────────────────────────────
  const instrEmail = 'instructor@codingworld.in';
  const instrHash = await argon2.hash('Instructor@CW2024!', { type: argon2.argon2id });

  const instructor = await prisma.user.upsert({
    where: { email: instrEmail },
    update: {},
    create: {
      email: instrEmail,
      username: 'instructor_cw',
      passwordHash: instrHash,
      role: Role.INSTRUCTOR,
      isEmailVerified: true,
      profile: {
        create: {
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'John Doe',
          bio: 'Senior Software Engineer & Instructor',
          currentRole: 'Software Engineer',
          skills: ['JavaScript', 'TypeScript', 'Node.js', 'React'],
          privacySettings: { create: {} },
        },
      },
      gamification: { create: {} },
      streaks: { create: {} },
    },
  });
  console.log(`✅ Instructor: ${instructor.email}`);

  // ─── Student ──────────────────────────────────────────────────
  const studentEmail = 'student@codingworld.in';
  const studentHash = await argon2.hash('Student@CW2024!', { type: argon2.argon2id });

  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    update: {},
    create: {
      email: studentEmail,
      username: 'student_cw',
      passwordHash: studentHash,
      role: Role.STUDENT,
      isEmailVerified: true,
      profile: {
        create: {
          firstName: 'Jane',
          lastName: 'Smith',
          displayName: 'Jane Smith',
          bio: 'Aspiring full-stack developer',
          skills: ['HTML', 'CSS', 'JavaScript'],
          privacySettings: { create: {} },
        },
      },
      gamification: { create: {} },
      streaks: { create: {} },
    },
  });
  console.log(`✅ Student: ${student.email}`);

  // ─── Course Categories ────────────────────────────────────────
  const categories = [
    { name: 'Web Development', slug: 'web-development', icon: '🌐' },
    { name: 'Data Structures & Algorithms', slug: 'dsa', icon: '🧮' },
    { name: 'Python', slug: 'python', icon: '🐍' },
    { name: 'JavaScript', slug: 'javascript', icon: '📜' },
    { name: 'React', slug: 'react', icon: '⚛️' },
    { name: 'Node.js', slug: 'nodejs', icon: '🟢' },
    { name: 'Database', slug: 'database', icon: '🗄️' },
    { name: 'DevOps', slug: 'devops', icon: '⚙️' },
    { name: 'System Design', slug: 'system-design', icon: '🏗️' },
    { name: 'Machine Learning', slug: 'machine-learning', icon: '🤖' },
  ];

  for (const cat of categories) {
    await prisma.courseCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, isActive: true },
    });
  }
  console.log(`✅ ${categories.length} course categories seeded`);

  // ─── Course Tags ──────────────────────────────────────────────
  const tags = ['beginner', 'intermediate', 'advanced', 'javascript', 'typescript', 'react', 'node', 'express', 'mongodb', 'postgresql', 'docker', 'aws', 'git', 'api', 'rest'];
  for (const name of tags) {
    await prisma.courseTag.upsert({
      where: { slug: name },
      update: {},
      create: { name, slug: name },
    });
  }
  console.log(`✅ ${tags.length} course tags seeded`);

  // ─── Sample Course ────────────────────────────────────────────
  const webCat = await prisma.courseCategory.findUnique({ where: { slug: 'web-development' } });

  const course = await prisma.course.upsert({
    where: { slug: 'complete-nodejs-backend-development' },
    update: {},
    create: {
      title: 'Complete Node.js Backend Development',
      slug: 'complete-nodejs-backend-development',
      description: 'Master Node.js backend development from basics to advanced production-ready applications. Learn Express, TypeScript, PostgreSQL, Redis, and more.',
      shortDescription: 'Build production-ready Node.js backends with TypeScript, PostgreSQL, and Redis.',
      price: 1999,
      isFree: false,
      status: CourseStatus.PUBLISHED,
      level: CourseLevel.INTERMEDIATE,
      language: 'English',
      instructorId: instructor.id,
      categoryId: webCat?.id,
      publishedAt: new Date(),
      requirements: {
        create: [
          { description: 'Basic JavaScript knowledge', sortOrder: 0 },
          { description: 'Understanding of web concepts', sortOrder: 1 },
        ],
      },
      learningOutcomes: {
        create: [
          { description: 'Build REST APIs with Node.js and Express', sortOrder: 0 },
          { description: 'Work with PostgreSQL using Prisma ORM', sortOrder: 1 },
          { description: 'Implement JWT authentication', sortOrder: 2 },
          { description: 'Deploy to production with Docker', sortOrder: 3 },
        ],
      },
    },
  });

  // Add sections and lectures
  const section = await prisma.courseSection.upsert({
    where: { id: 'seed-section-1' },
    update: {},
    create: {
      id: 'seed-section-1',
      courseId: course.id,
      title: 'Getting Started',
      sortOrder: 0,
      isPublished: true,
    },
  });

  await prisma.lecture.upsert({
    where: { id: 'seed-lecture-1' },
    update: {},
    create: {
      id: 'seed-lecture-1',
      sectionId: section.id,
      title: 'Introduction to Node.js',
      description: 'Overview of Node.js runtime and event loop',
      videoDuration: 1200,
      isPreview: true,
      isPublished: true,
      sortOrder: 0,
    },
  });

  await prisma.course.update({
    where: { id: course.id },
    data: { totalSections: 1, totalLectures: 1 },
  });

  console.log(`✅ Sample course: ${course.title}`);

  // ─── Problem Tags ──────────────────────────────────────────────
  const problemTags = ['array', 'string', 'hashmap', 'two-pointers', 'sliding-window', 'dp', 'tree', 'graph', 'sorting', 'binary-search', 'recursion', 'stack', 'queue'];
  for (const name of problemTags) {
    await prisma.problemTag.upsert({
      where: { slug: name },
      update: {},
      create: { name, slug: name },
    });
  }
  console.log(`✅ ${problemTags.length} problem tags seeded`);

  // ─── Sample Problems ──────────────────────────────────────────
  const twoSumTag = await prisma.problemTag.findUnique({ where: { slug: 'hashmap' } });

  const problems = [
    {
      id: 'seed-problem-1',
      title: 'Two Sum',
      slug: 'two-sum',
      description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
      difficulty: ProblemDifficulty.EASY,
      type: ProblemType.CODING,
      category: ProblemCategory.DSA,
      constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists.',
      examples: JSON.stringify([{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] == 9' }]),
      starterCode: JSON.stringify({ javascript: 'function twoSum(nums, target) {\n  // your code here\n};', python: 'def twoSum(nums, target):\n    # your code here\n    pass' }),
      supportedLanguages: ['javascript', 'typescript', 'python', 'java', 'cpp'],
      xpReward: 10,
      isPublished: true,
      createdById: admin.id,
    },
    {
      id: 'seed-problem-2',
      title: 'Reverse a String',
      slug: 'reverse-a-string',
      description: 'Write a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.',
      difficulty: ProblemDifficulty.EASY,
      type: ProblemType.CODING,
      category: ProblemCategory.DSA,
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      xpReward: 10,
      isPublished: true,
      createdById: admin.id,
    },
    {
      id: 'seed-problem-3',
      title: 'Fibonacci Number',
      slug: 'fibonacci-number',
      description: 'The Fibonacci numbers, commonly denoted F(n), form a sequence such that each number is the sum of the two preceding ones, starting from 0 and 1.\n\nGiven n, calculate F(n).',
      difficulty: ProblemDifficulty.EASY,
      type: ProblemType.CODING,
      category: ProblemCategory.DSA,
      supportedLanguages: ['javascript', 'python', 'java'],
      xpReward: 10,
      isPublished: true,
      createdById: admin.id,
    },
    {
      id: 'seed-problem-4',
      title: 'Valid Parentheses',
      slug: 'valid-parentheses',
      description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
      difficulty: ProblemDifficulty.EASY,
      type: ProblemType.CODING,
      category: ProblemCategory.DSA,
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      xpReward: 10,
      isPublished: true,
      createdById: admin.id,
    },
    {
      id: 'seed-problem-5',
      title: 'Maximum Subarray',
      slug: 'maximum-subarray',
      description: 'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
      difficulty: ProblemDifficulty.MEDIUM,
      type: ProblemType.CODING,
      category: ProblemCategory.DSA,
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      xpReward: 25,
      isPublished: true,
      createdById: admin.id,
    },
  ];

  for (const p of problems) {
    await prisma.problem.upsert({
      where: { slug: p.slug },
      update: {},
      create: p as never,
    });
  }
  console.log(`✅ ${problems.length} sample problems seeded`);

  // ─── Achievements ─────────────────────────────────────────────
  const achievements = [
    { name: 'First Steps', slug: 'first-steps', description: 'Solve your first problem', xpReward: 10, criteria: JSON.stringify({ minProblems: 1 }) },
    { name: 'Problem Solver', slug: 'problem-solver', description: 'Solve 10 problems', xpReward: 50, criteria: JSON.stringify({ minProblems: 10 }) },
    { name: 'Century Club', slug: 'century-club', description: 'Solve 100 problems', xpReward: 200, criteria: JSON.stringify({ minProblems: 100 }) },
    { name: 'XP Hunter', slug: 'xp-hunter', description: 'Earn 1000 XP', xpReward: 100, criteria: JSON.stringify({ minXp: 1000 }) },
    { name: 'Streak Starter', slug: 'streak-starter', description: 'Maintain a 7-day streak', xpReward: 50, criteria: JSON.stringify({ minStreak: 7 }) },
    { name: 'Streak Master', slug: 'streak-master', description: 'Maintain a 30-day streak', xpReward: 200, criteria: JSON.stringify({ minStreak: 30 }) },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { slug: a.slug },
      update: {},
      create: { ...a, criteria: JSON.parse(a.criteria) },
    });
  }
  console.log(`✅ ${achievements.length} achievements seeded`);

  console.log('\n🎉 Seed complete!\n');
  console.log('Test credentials:');
  console.log(`  Admin      : ${adminEmail} / ${adminPassword}`);
  console.log(`  Instructor : ${instrEmail} / Instructor@CW2024!`);
  console.log(`  Student    : ${studentEmail} / Student@CW2024!`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
