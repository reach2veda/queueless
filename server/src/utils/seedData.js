import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../models/user.model.js';
import Business from '../models/business.model.js';
import Service from '../models/service.model.js';
import Staff from '../models/staff.model.js';
import WorkingHours from '../models/workingHours.model.js';
import Appointment from '../models/appointment.model.js';

export const seedClinicData = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI missing');

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri, { dbName: 'queueless' });
    }

    console.log('🌱 Seeding QueueLess Demonstration Clinic Data...');

    // 1. Create or Find Provider
    let provider = await User.findOne({ email: 'provider@queueless.com' });
    if (!provider) {
      provider = await User.findOne({ email: 'dr.sarah@metrohealth.com' });
    }
    if (!provider) {
      provider = new User({
        name: 'Dr. Sarah Jenkins',
        email: 'provider@queueless.com',
        passwordHash: 'Password123!',
        phone: '+1 (555) 234-5678',
        role: 'provider',
        isActive: true,
      });
      await provider.save();
      console.log('✅ Created Demo Provider: provider@queueless.com');
    }

    // 2. Create or Find Business
    let business = await Business.findOne({ ownerId: provider._id });
    if (!business) {
      business = new Business({
        name: 'Metro Health Clinic',
        ownerId: provider._id,
        category: 'clinic',
        description: 'Comprehensive outpatient medical center offering general consultations, cardiology, and diagnostics.',
        contactPhone: '+1 (555) 234-5678',
        contactEmail: 'contact@metrohealth.com',
        address: {
          street: '450 Healthcare Blvd, Suite 200',
          city: 'Downtown Medical District',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
        verificationStatus: 'verified',
        timezone: 'America/New_York',
        isActive: true,
      });
      await business.save();
      console.log('✅ Created Demo Business: Metro Health Clinic');
    }

    // 3. Create Services
    const serviceTemplates = [
      {
        name: 'General Health Consultation',
        description: 'Routine medical exam, symptom diagnosis, and prescription management.',
        durationMinutes: 30,
        price: 50,
      },
      {
        name: 'Comprehensive Blood Diagnostics',
        description: 'Full metabolic panel, lipid profile, and complete blood count.',
        durationMinutes: 15,
        price: 35,
      },
      {
        name: 'Cardiology Screening & ECG',
        description: 'Advanced cardiovascular health evaluation and resting electrocardiogram.',
        durationMinutes: 45,
        price: 120,
      },
      {
        name: 'Pediatric Wellness Check',
        description: 'Growth monitoring, immunization review, and child wellness consultation.',
        durationMinutes: 30,
        price: 65,
      },
    ];

    const seededServices = [];
    for (const st of serviceTemplates) {
      let srv = await Service.findOne({ businessId: business._id, name: st.name });
      if (!srv) {
        srv = new Service({ ...st, businessId: business._id, isActive: true });
        await srv.save();
      }
      seededServices.push(srv);
    }
    console.log(`✅ Seeded ${seededServices.length} clinic services`);

    // 4. Create Working Hours (Mon - Sat, 09:00 - 17:00, Lunch Break 13:00 - 14:00)
    const schedules = [
      { dayOfWeek: 0, isOpen: false, openTime: '09:00', closeTime: '17:00' }, // Sun closed
      { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00' },
      { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00' },
      { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00' },
      { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00' },
      { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '17:00', breakStartTime: '13:00', breakEndTime: '14:00' },
      { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '14:00', breakStartTime: null, breakEndTime: null },
    ];

    for (const sch of schedules) {
      await WorkingHours.findOneAndUpdate(
        { businessId: business._id, staffId: null, dayOfWeek: sch.dayOfWeek },
        { $set: sch },
        { upsert: true }
      );
    }
    console.log('✅ Seeded weekly business working hours with break intervals');

    // 5. Create Demo Customer
    let customer = await User.findOne({ email: 'customer@queueless.com' });
    if (!customer) {
      customer = new User({
        name: 'Alex Johnson',
        email: 'customer@queueless.com',
        passwordHash: 'Password123!',
        phone: '+1 (555) 987-6543',
        role: 'customer',
        isActive: true,
      });
      await customer.save();
      console.log('✅ Created Demo Customer: customer@queueless.com');
    }

    // 6. Create Demo Admin
    let admin = await User.findOne({ email: 'admin@queueless.com' });
    if (!admin) {
      admin = new User({
        name: 'QueueLess Administrator',
        email: 'admin@queueless.com',
        passwordHash: 'Admin123!',
        phone: '+1 (555) 000-0001',
        role: 'admin',
        isActive: true,
      });
      await admin.save();
      console.log('✅ Created Demo Admin: admin@queueless.com');
    }

    console.log('🎉 Seeding Completed Successfully!\n');
    return { provider, business, services: seededServices, customer, admin };
  } catch (error) {
    console.error('❌ Seeding Error:', error.message);
    throw error;
  }
};

// If run directly via node
if (process.argv[1] && process.argv[1].endsWith('seedData.js')) {
  seedClinicData().then(() => {
    mongoose.connection.close();
    process.exit(0);
  });
}

