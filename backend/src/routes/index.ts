import { Router } from 'express';
import * as c from '../controllers';

export const router = Router();

router.get('/health', c.health);

router.post('/plans', c.createPlan);
router.get('/plans/:planId', c.getPlan);
router.post('/plans/:planId/analyze', c.analyzePlan);

router.post('/plans/:planId/proposals', c.createProposal);
router.get('/plans/:planId/proposals', c.listProposals);

router.get('/plans/:planId/ledger', c.ledger);

router.post('/proposals/:proposalId/reserve', c.reserve);

router.post('/commitments/:commitmentId/release', c.release);

// PayPal Sandbox checkout
router.post('/commitments/:commitmentId/paypal/order', c.createPayPalOrder);
router.post('/commitments/:commitmentId/paypal/capture', c.capturePayPalPayment);