// utils/seed.js
// Run: node utils/seed.js
require('dotenv').config({
  path: require('path').join(__dirname, '..', 'backend', '.env')
});
const mongoose    = require('mongoose');
const connectDB   = require('../backend/config/db')
const Admin       = require('../backend/models/Admin');
const Internship  = require('../backend/models/Internship');

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
    description: 'Work on cutting-edge ML models and deployment pipelines. Build and train deep learning models for real-world classification, regression, and NLP problems.',
    tags: ['AI', 'Python', 'ML'],
    deadline: new Date('2025-08-30'),
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
    description: 'Build responsive web applications using React and Node.js. Collaborate with design and backend teams to ship production features.',
    tags: ['React', 'Node.js', 'Full Stack'],
    deadline: new Date('2025-09-15'),
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
    description: 'Analyze large datasets and build predictive models. Create dashboards and reports for business decision-making using Tableau and Power BI.',
    tags: ['Data Science', 'Python', 'SQL'],
    deadline: new Date('2025-07-20'),
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
    description: 'Develop Android applications for millions of users. Work with Kotlin and modern Android frameworks like Jetpack Compose.',
    tags: ['Android', 'Kotlin', 'Mobile'],
    deadline: new Date('2025-09-01'),
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
    description: 'Assist in vulnerability assessments and penetration testing. Learn real-world cybersecurity workflows and incident response procedures.',
    tags: ['Security', 'Linux', 'Networking'],
    deadline: new Date('2025-08-10'),
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
    description: 'Deploy and manage cloud infrastructure on AWS. Work with containerization, orchestration, and CI/CD pipelines.',
    tags: ['AWS', 'Docker', 'Cloud'],
    deadline: new Date('2025-08-25'),
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
    description: 'Design beautiful user interfaces and conduct usability testing for web and mobile products used by thousands.',
    tags: ['Figma', 'Design', 'UX'],
    deadline: new Date('2025-07-25'),
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
    description: 'Develop IoT prototypes and integrate sensors with cloud platforms for smart manufacturing solutions.',
    tags: ['IoT', 'Arduino', 'Embedded'],
    deadline: new Date('2025-08-20'),
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
    description: 'Build and maintain CI/CD pipelines, automate deployments, and manage Linux server infrastructure.',
    tags: ['DevOps', 'Linux', 'Docker'],
    deadline: new Date('2025-09-10'),
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
    description: 'Analyse sales and marketing data to provide actionable business insights. Build automated reporting dashboards.',
    tags: ['SQL', 'Tableau', 'Analytics'],
    deadline: new Date('2025-08-05'),
  },
];

const seed = async () => {
  try {
    // ── DB CONNECT ─────────────────────────────
    await connectDB();

    // ── ADMIN SEED ─────────────────────────────
    const existingAdmin = await Admin.findOne({
      email: process.env.ADMIN_EMAIL
    });

    if (!existingAdmin) {
      const password = process.env.ADMIN_PASSWORD || 'Admin@1234';

      if (password.length < 6) {
        throw new Error('ADMIN_PASSWORD must be at least 6 characters');
      }

      await Admin.create({
        username: process.env.ADMIN_USERNAME || 'admin23',
        email: process.env.ADMIN_EMAIL || 'admin@aiias.edu',
        password,
        role: 'superadmin'
      });

      console.log('✅ Admin created successfully');
    } else {
      console.log('ℹ️ Admin already exists — skipping');
    }

    // ── INTERNSHIP SEED ─────────────────────────
    const count = await Internship.countDocuments();

    if (count === 0) {
      await Internship.insertMany(INTERNSHIPS);
      console.log(`✅ ${INTERNSHIPS.length} internships seeded`);
    } else {
      console.log(`ℹ️ ${count} internships already exist — skipping`);
    }

    console.log('\n🎉 Seeding complete!\n');

    process.exit(0);

  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
  }
};

seed();