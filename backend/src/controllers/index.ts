import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/errorHandler';
import * as planService from '../services/planService';
import * as proposalService from '../services/proposalService';
import * as reservationService from '../services/reservationService';
import * as ledgerService from '../services/ledgerService';
import * as geminiService from '../services/geminiService';
import * as paypalService from '../services/paypalService';
import {
  commitmentIdParams, createPlanBody, createProposalBody, planIdParams, proposalIdParams,
} from './schemas';

export const health = asyncHandler(async (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

export const createPlan = asyncHandler(async (req, res) => {
  const plan = await planService.createPlan(createPlanBody.parse(req.body));
  res.status(201).json({ plan });
});

export const getPlan = asyncHandler(async (req, res) => {
  const { planId } = planIdParams.parse(req.params);
  res.json({ plan: await planService.getPlan(planId) });
});

export const analyzePlan = asyncHandler(async (req, res) => {
  const { planId } = planIdParams.parse(req.params);
  const analysis = await geminiService.analyzePlanWithGemini(planId);
  res.json({ analysis });
});

export const createProposal = asyncHandler(async (req, res) => {
  const { planId } = planIdParams.parse(req.params);
  const result = await proposalService.createProposal(planId, createProposalBody.parse(req.body));
  res.status(201).json(result);
});

export const listProposals = asyncHandler(async (req, res) => {
  const { planId } = planIdParams.parse(req.params);
  res.json({ proposals: await proposalService.listProposals(planId) });
});

// Deliberately ignores req.body: the amount always comes from the stored proposal.
export const reserve = asyncHandler(async (req, res) => {
  const { proposalId } = proposalIdParams.parse(req.params);
  res.status(201).json(await reservationService.reserveProposal(proposalId));
});

export const release = asyncHandler(async (req, res) => {
  const { commitmentId } = commitmentIdParams.parse(req.params);
  res.json(await reservationService.releaseCommitment(commitmentId));
});

// Create a PayPal Sandbox order for an existing reservation.
export const createPayPalOrder = asyncHandler(async (req, res) => {
  const { commitmentId } = commitmentIdParams.parse(req.params);

  const result = await paypalService.createOrderForCommitment(commitmentId);

  res.status(201).json(result);
});

// Capture payment after the buyer approves the PayPal order.
export const capturePayPalPayment = asyncHandler(async (req, res) => {
  const { commitmentId } = commitmentIdParams.parse(req.params);

  const result = await paypalService.capturePaymentForCommitment(commitmentId);

  res.json(result);
});

export const ledger = asyncHandler(async (req, res) => {
  const { planId } = planIdParams.parse(req.params);
  res.json(await ledgerService.getLedger(planId));
});
