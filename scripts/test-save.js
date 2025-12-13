import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Booking from '../schema/clientSchema.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/travel-yatra';

async function main(){
  try{
    await mongoose.connect(MONGO_URI);
    console.log('Connected to', MONGO_URI);
    const b = new Booking({
      name: 'Direct Save Test',
      email: 'direct@example.com',
      phone: '0000000000',
      adults: 1,
      children: 0,
      package: 'Direct Test',
      date: new Date(),
    });
    const saved = await b.save();
    console.log('Saved booking id:', saved._id);
    await mongoose.disconnect();
  }catch(err){
    console.error('Direct save error', err);
    process.exit(1);
  }
}

main();
