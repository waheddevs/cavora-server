import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import mongoose from 'mongoose';
import app from './app';

const PORT = process.env.PORT ?? 3000;

mongoose
  .connect(process.env.MONGO_URL ?? '')
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Cavora server listening on port ${PORT}`));
  })
  .catch((err) => console.log('MongoDB connection error: ', err));
