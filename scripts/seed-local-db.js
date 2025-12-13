import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Login from '../schema/loginSchema.js';
import Package from '../schema/packageSchema.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/travel-yatra';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to', MONGO_URI);

    // Create admin user if not exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@travel-yatra.local';
    const existing = await Login.findOne({ email: adminEmail });
    if (!existing) {
      const passwordPlain = 'Admin@1234'; // change after seeding
      const hashed = await bcrypt.hash(passwordPlain, 10);
      const admin = new Login({ email: adminEmail, password: hashed });
      await admin.save();
      console.log('Created admin user:', adminEmail, 'password:', passwordPlain);
    } else {
      console.log('Admin user already exists:', adminEmail);
    }

    // Create a sample package if not exists
    const sampleTitle = 'Sample Package - Seeded';
    const existingPkg = await Package.findOne({ title: sampleTitle });
    if (!existingPkg) {
      const pkg = new Package({
        title: sampleTitle,
        description: 'This is a seeded sample package for local dev',
        priceMin: 100,
        priceMax: 300,
        duration: '3-5 Days',
        imageUrl: 'https://via.placeholder.com/600x400',
        location: 'Sample Location',
        person: 2,
      });
      await pkg.save();
      console.log('Created sample package:', sampleTitle);
    } else {
      console.log('Sample package already exists');
    }

    await mongoose.disconnect();
    console.log('Seed complete');
  } catch (err) {
    console.error('Seed error', err);
    process.exit(1);
  }
}

main();
