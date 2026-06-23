// seed.js  — run from ANY folder: node seed.js
// Auto-detects .env location

const path = require('path');
const fs   = require('fs');

/* ── Find .env automatically ─────────────────────────────── */
const possibleEnvPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, 'backend', '.env'),
  path.join(__dirname, '..', 'backend', '.env'),
];

let envLoaded = false;
for (const p of possibleEnvPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
    console.log('✅ Loaded .env from:', p);
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  require('dotenv').config(); // fallback — process.cwd()
  console.log('⚠️  Using default dotenv (process.cwd())');
}

/* ── Check MONGO_URI ─────────────────────────────────────── */
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env — please check the file path.');
  process.exit(1);
}
console.log('🔗 Connecting to:', process.env.MONGO_URI.replace(/:([^@]+)@/, ':****@'));

const mongoose   = require('mongoose');
const Admin      = require('./Admin');
const Internship = require('./Internship');

const INTERNSHIPS = [
  {
    title: 'AI/ML Engineering Intern',
    company: 'TechCorp Solutions',
    domain: 'Artificial Intelligence',
    location: 'Pune',
    duration: '3 months',
    stipend: '₹15,000/mo',
    stipendAmount: 15000,
    requiredSkills: ['Python', 'Machine Learning', 'TensorFlow', 'NumPy', 'Pandas'],
    minCgpa: 7.0,
    seats: 5,
    description: 'Work on cutting-edge ML models and deployment pipelines.',
    tags: ['AI', 'Python', 'ML'],
    deadline: new Date('2026-08-30'),
  },
  {
    title: 'Full Stack Web Developer Intern',
    company: 'InnovateTech Pvt Ltd',
    domain: 'Web Development',
    location: 'Mumbai',
    duration: '6 months',
    stipend: '₹12,000/mo',
    stipendAmount: 12000,
    requiredSkills: ['React', 'Node.js', 'MongoDB', 'JavaScript', 'CSS', 'REST API'],
    minCgpa: 6.5,
    seats: 8,
    description: 'Build responsive web applications using React and Node.js.',
    tags: ['React', 'Node.js', 'Full Stack'],
    deadline: new Date('2026-09-15'),
  },
  {
    title: 'Data Science Intern',
    company: 'DataInsights Pvt Ltd',
    domain: 'Data Science',
    location: 'Bangalore',
    duration: '4 months',
    stipend: '₹18,000/mo',
    stipendAmount: 18000,
    requiredSkills: ['Python', 'Pandas', 'SQL', 'Data Visualization', 'Statistics', 'Scikit-learn'],
    minCgpa: 7.5,
    seats: 4,
    description: 'Analyze large datasets and build predictive models.',
    tags: ['Data Science', 'Python', 'SQL'],
    deadline: new Date('2026-07-20'),
  },
  {
    title: 'Android App Developer Intern',
    company: 'MobileFirst Studios',
    domain: 'Mobile Development',
    location: 'Hyderabad',
    duration: '3 months',
    stipend: '₹10,000/mo',
    stipendAmount: 10000,
    requiredSkills: ['Java', 'Kotlin', 'Android Studio', 'Firebase', 'REST API'],
    minCgpa: 6.0,
    seats: 6,
    description: 'Develop Android applications with modern frameworks.',
    tags: ['Android', 'Kotlin', 'Mobile'],
    deadline: new Date('2026-09-01'),
  },
  {
    title: 'Cybersecurity Analyst Intern',
    company: 'SecureNet Labs',
    domain: 'Cybersecurity',
    location: 'Delhi',
    duration: '3 months',
    stipend: '₹14,000/mo',
    stipendAmount: 14000,
    requiredSkills: ['Network Security', 'Linux', 'Python', 'Ethical Hacking', 'OWASP'],
    minCgpa: 7.0,
    seats: 3,
    description: 'Assist in vulnerability assessments and penetration testing.',
    tags: ['Security', 'Linux', 'Networking'],
    deadline: new Date('2026-08-10'),
  },
  {
    title: 'Cloud Infrastructure Intern',
    company: 'CloudScale Inc',
    domain: 'Cloud Computing',
    location: 'Pune',
    duration: '6 months',
    stipend: '₹20,000/mo',
    stipendAmount: 20000,
    requiredSkills: ['AWS', 'Docker', 'Kubernetes', 'Linux', 'Terraform', 'CI/CD'],
    minCgpa: 7.0,
    seats: 4,
    description: 'Deploy and manage cloud infrastructure on AWS.',
    tags: ['AWS', 'Docker', 'Cloud'],
    deadline: new Date('2026-08-25'),
  },
  {
    title: 'UI/UX Design Intern',
    company: 'PixelCraft Design',
    domain: 'UI/UX Design',
    location: 'Bangalore',
    duration: '3 months',
    stipend: '₹10,000/mo',
    stipendAmount: 10000,
    requiredSkills: ['Figma', 'Adobe XD', 'HTML', 'CSS', 'User Research', 'Prototyping'],
    minCgpa: 6.0,
    seats: 5,
    description: 'Design beautiful user interfaces and conduct usability testing.',
    tags: ['Figma', 'Design', 'UX'],
    deadline: new Date('2026-07-25'),
  },
  {
    title: 'IoT Systems Intern',
    company: 'SmartTech Industries',
    domain: 'Internet of Things',
    location: 'Chennai',
    duration: '4 months',
    stipend: '₹12,000/mo',
    stipendAmount: 12000,
    requiredSkills: ['Arduino', 'Raspberry Pi', 'Python', 'C++', 'Embedded Systems', 'MQTT'],
    minCgpa: 6.5,
    seats: 4,
    description: 'Develop IoT prototypes and integrate sensors with cloud platforms.',
    tags: ['IoT', 'Arduino', 'Embedded'],
    deadline: new Date('2026-08-20'),
  },
  {
    title: 'DevOps Engineer Intern',
    company: 'Infra Solutions Ltd',
    domain: 'DevOps',
    location: 'Noida',
    duration: '6 months',
    stipend: '₹16,000/mo',
    stipendAmount: 16000,
    requiredSkills: ['Linux', 'Docker', 'Jenkins', 'Git', 'Bash', 'Nginx'],
    minCgpa: 6.5,
    seats: 3,
    description: 'Build and maintain CI/CD pipelines and manage Linux server infrastructure.',
    tags: ['DevOps', 'Linux', 'Docker'],
    deadline: new Date('2026-09-10'),
  },
  {
    title: 'Data Analyst Intern',
    company: 'BizAnalytics Corp',
    domain: 'Data Science',
    location: 'Mumbai',
    duration: '3 months',
    stipend: '₹12,000/mo',
    stipendAmount: 12000,
    requiredSkills: ['SQL', 'Excel', 'Python', 'Tableau', 'Statistics'],
    minCgpa: 6.0,
    seats: 6,
    description: 'Analyse sales and marketing data to provide actionable business insights.',
    tags: ['SQL', 'Tableau', 'Analytics'],
    deadline: new Date('2026-08-05'),
  },
];

const seed = async () => {
  try {
    /* ── Connect ────────────────────────────────────────────── */
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS:         10000,
      socketTimeoutMS:          45000,
      family:                   4,
    });
    console.log('✅ MongoDB connected:', mongoose.connection.host);

    /* ── Admin ──────────────────────────────────────────────── */
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@aiias.edu';
    const existing   = await Admin.findOne({ email: adminEmail });

    if (!existing) {
      await Admin.create({
        username: process.env.ADMIN_USERNAME || 'admin23',
        email:    adminEmail,
        password: process.env.ADMIN_PASSWORD || 'Admin@1234',
        role:     'superadmin',
      });
      console.log('✅ Admin created:', adminEmail);
    } else {
      console.log('ℹ️  Admin already exists — skipping');
    }

    /* ── Internships ────────────────────────────────────────── */
    const count = await Internship.countDocuments();
    if (count === 0) {
      await Internship.insertMany(INTERNSHIPS);
      console.log(`✅ ${INTERNSHIPS.length} internships seeded`);
    } else {
      console.log(`ℹ️  ${count} internships already exist — skipping`);
    }

    console.log('\n🎉 Seeding complete!\n');
    process.exit(0);

  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    console.error('\n👉 TROUBLESHOOTING TIPS:');
    console.error('   1. Check your Atlas password in .env (replace YOUR_ACTUAL_PASSWORD)');
    console.error('   2. Go to Atlas → Network Access → Add IP → Add 0.0.0.0/0 (allow all)');
    console.error('   3. Make sure your cluster is not paused on Atlas dashboard');
    console.error('   4. Try a different network (mobile hotspot bypasses SRV blocks)\n');
    process.exit(1);
  }
};

seed();