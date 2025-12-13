import Connection from '../database/connecDb.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Login from '../schema/loginSchema.js';
import Package from '../schema/packageSchema.js';

async function seed() {
  try {
    await Connection();
    console.log('Connected — seeding started');

    // ensure admin exists
    const adminEmail = process.env.ADMIN_EMAIL || 'travelyatra522018@gmail.com';
    const existing = await Login.findOne({ email: adminEmail }).lean();
    if (!existing) {
      const hashed = await bcrypt.hash('Admin@1234', 10);
      const admin = new Login({
        name: 'Admin',
        email: adminEmail,
        password: hashed,
        role: 'admin',
      });
      await admin.save();
      console.log('Created admin user:', adminEmail);
    } else {
      console.log('Admin user already exists:', adminEmail);
    }

    // ensure at least one package exists
    const pkg = await Package.findOne().lean();
    if (!pkg) {
      const sample = new Package({
        title: 'Sample Package - Seeded',
        description: 'This is a sample package created by seed script.',
        price: 99,
        duration: '3 days',
      });
      await sample.save();
      console.log('Created sample package');
    } else {
      console.log('Package already exists. Skipping package seed.');
    }

    console.log('Seed complete');
  } catch (err) {
    console.error('Seed failed:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(0);
  }
}

seed();
