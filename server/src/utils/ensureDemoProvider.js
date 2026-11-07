import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/user.model.js';
import Business from '../models/business.model.js';

export const ensureDemoProvider = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    console.log('🔍 Checking for provider demo user (provider@queueless.com)...');

    let provider = await User.findOne({ email: 'provider@queueless.com' });
    if (!provider) {
      console.log('⚡ Creating provider@queueless.com in MongoDB...');
      provider = new User({
        name: 'Dr. Sarah Jenkins',
        email: 'provider@queueless.com',
        passwordHash: 'Password123!',
        phone: '+1 (555) 234-5678',
        role: 'provider',
        isActive: true,
        isEmailVerified: true,
      });
      await provider.save();
      console.log('✅ Created provider@queueless.com user in MongoDB');
    } else {
      // Ensure role is provider and password is valid
      provider.role = 'provider';
      provider.isActive = true;
      provider.passwordHash = 'Password123!';
      await provider.save();
      console.log('✅ Updated provider@queueless.com in MongoDB');
    }

    // Ensure Metro Health Clinic business is linked to this provider
    let business = await Business.findOne({ category: 'clinic', isActive: true });
    if (business) {
      business.ownerId = provider._id;
      await business.save();
      console.log(`✅ Linked business "${business.name}" to provider ${provider.email}`);
    }

    return provider;
  } catch (err) {
    console.error('Failed to ensure demo provider:', err);
    throw err;
  }
};

// If run directly
if (process.argv[1]?.endsWith('ensureDemoProvider.js')) {
  ensureDemoProvider().then(() => process.exit(0)).catch(() => process.exit(1));
}

