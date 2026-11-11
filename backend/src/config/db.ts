import mongoose from 'mongoose';
import { env } from './env';
import { Plan } from '../models/Plan';
import { Proposal } from '../models/Proposal';
import { Commitment } from '../models/Commitment';
import { logger } from '../utils/logger';

/** Transactions need a replica set (Atlas always is). Fail fast if not. */
export async function connectDb(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') {
    throw new Error('MongoDB is not a replica set / sharded cluster: transactions are unavailable. Use MongoDB Atlas.');
  }
  // Unique indexes (e.g. Commitment.proposalId) must exist before serving traffic.
  await Promise.all([Plan.init(), Proposal.init(), Commitment.init()]);
  logger.info(`MongoDB connected (db: ${mongoose.connection.name}, replicaSet: ${hello.setName ?? 'sharded'})`);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
