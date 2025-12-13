import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Booking from '../schema/clientSchema.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/travel-yatra';

async function main(){
  try{
    await mongoose.connect(MONGO_URI);
    const count = await Booking.countDocuments();
    console.log('Booking count:', count);
    const recent = await Booking.find().sort({createdAt:-1}).limit(5).lean();
    console.log('Recent bookings:', recent);
    await mongoose.disconnect();
  }catch(err){
    console.error('Count error', err);
    process.exit(1);
  }
}

main();
