import { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';
import Stripe from 'stripe';

// Initialize Stripe with API key
// In a real implementation, this would be an environment variable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_example', {
  apiVersion: '2023-10-16',
});

export interface Payment {
  id: string;
  project_match_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripe_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_cycle: 'monthly' | 'quarterly' | 'annually';
  features: string[]; // Stored as JSON
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function createPaymentIntent(
  db: D1Database,
  projectMatchId: string,
  amount: number,
  currency: string = 'USD'
): Promise<{ clientSecret: string; paymentId: string }> {
  // Create a payment record in the database
  const paymentId = nanoid();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO payments (
        id, project_match_id, amount, currency, status, 
        stripe_payment_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      paymentId,
      projectMatchId,
      amount,
      currency,
      'pending',
      null,
      now,
      now
    )
    .run();

  // Create a payment intent with Stripe
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    metadata: {
      paymentId,
      projectMatchId
    }
  });

  // Update the payment record with the Stripe payment ID
  await db
    .prepare('UPDATE payments SET stripe_payment_id = ? WHERE id = ?')
    .bind(paymentIntent.id, paymentId)
    .run();

  return {
    clientSecret: paymentIntent.client_secret || '',
    paymentId
  };
}

export async function handleStripeWebhook(
  db: D1Database,
  event: any
): Promise<boolean> {
  // Handle different event types
  switch (event.type) {
    case 'payment_intent.succeeded':
      return handlePaymentIntentSucceeded(db, event.data.object);
    case 'payment_intent.payment_failed':
      return handlePaymentIntentFailed(db, event.data.object);
    default:
      return false;
  }
}

async function handlePaymentIntentSucceeded(
  db: D1Database,
  paymentIntent: any
): Promise<boolean> {
  const { paymentId } = paymentIntent.metadata;

  if (!paymentId) {
    return false;
  }

  const now = new Date().toISOString();

  // Update payment status to completed
  await db
    .prepare('UPDATE payments SET status = ?, updated_at = ? WHERE id = ?')
    .bind('completed', now, paymentId)
    .run();

  // Get the payment to find the project match
  const payment = await db
    .prepare('SELECT * FROM payments WHERE id = ?')
    .bind(paymentId)
    .first<Payment>();

  if (!payment) {
    return false;
  }

  // Update the project match status to accepted
  await db
    .prepare('UPDATE project_matches SET status = ?, updated_at = ? WHERE id = ?')
    .bind('accepted', now, payment.project_match_id)
    .run();

  // Get the project match to find the project
  const projectMatch = await db
    .prepare('SELECT * FROM project_matches WHERE id = ?')
    .bind(payment.project_match_id)
    .first<{ project_id: string }>();

  if (!projectMatch) {
    return false;
  }

  // Update the project status to in_progress
  await db
    .prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?')
    .bind('in_progress', now, projectMatch.project_id)
    .run();

  return true;
}

async function handlePaymentIntentFailed(
  db: D1Database,
  paymentIntent: any
): Promise<boolean> {
  const { paymentId } = paymentIntent.metadata;

  if (!paymentId) {
    return false;
  }

  const now = new Date().toISOString();

  // Update payment status to failed
  await db
    .prepare('UPDATE payments SET status = ?, updated_at = ? WHERE id = ?')
    .bind('failed', now, paymentId)
    .run();

  return true;
}

export async function getPaymentHistory(
  db: D1Database,
  userId: string,
  userType: 'sme' | 'consultant',
  page = 1,
  pageSize = 10
): Promise<{ payments: any[]; total: number }> {
  const offset = (page - 1) * pageSize;
  
  // Different queries based on user type
  let query, countQuery;
  const values = [userId];
  
  if (userType === 'sme') {
    // For SMEs, get payments for their projects
    countQuery = `
      SELECT COUNT(*) as total 
      FROM payments p
      JOIN project_matches pm ON p.project_match_id = pm.id
      JOIN projects proj ON pm.project_id = proj.id
      WHERE proj.sme_id = ?
    `;
    
    query = `
      SELECT p.*, pm.consultant_id, proj.title as project_title, cp.full_name as consultant_name
      FROM payments p
      JOIN project_matches pm ON p.project_match_id = pm.id
      JOIN projects proj ON pm.project_id = proj.id
      LEFT JOIN consultant_profiles cp ON pm.consultant_id = cp.id
      WHERE proj.sme_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
  } else {
    // For consultants, get payments for their matches
    countQuery = `
      SELECT COUNT(*) as total 
      FROM payments p
      JOIN project_matches pm ON p.project_match_id = pm.id
      WHERE pm.consultant_id = ?
    `;
    
    query = `
      SELECT p.*, pm.project_id, proj.title as project_title, sp.company_name as sme_name
      FROM payments p
      JOIN project_matches pm ON p.project_match_id = pm.id
      JOIN projects proj ON pm.project_id = proj.id
      LEFT JOIN sme_profiles sp ON proj.sme_id = sp.id
      WHERE pm.consultant_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
  }
  
  // Get total count
  const countResult = await db
    .prepare(countQuery)
    .bind(...values)
    .first<{ total: number }>();
  
  const total = countResult?.total || 0;
  
  // Get payments with pagination
  const paymentsResult = await db
    .prepare(query)
    .bind(...values, pageSize, offset)
    .all();
  
  return {
    payments: paymentsResult.results,
    total
  };
}

export async function refundPayment(
  db: D1Database,
  paymentId: string,
  userId: string,
  userType: 'sme'
): Promise<boolean> {
  // Only SMEs can initiate refunds
  if (userType !== 'sme') {
    throw new Error('Only SMEs can initiate refunds');
  }
  
  // Get the payment
  const payment = await db
    .prepare('SELECT * FROM payments WHERE id = ?')
    .bind(paymentId)
    .first<Payment>();

  if (!payment) {
    throw new Error('Payment not found');
  }
  
  if (payment.status !== 'completed') {
    throw new Error('Only completed payments can be refunded');
  }
  
  // Check if the payment belongs to the SME's project
  const checkQuery = `
    SELECT COUNT(*) as count
    FROM payments p
    JOIN project_matches pm ON p.project_match_id = pm.id
    JOIN projects proj ON pm.project_id = proj.id
    WHERE p.id = ? AND proj.sme_id = ?
  `;
  
  const checkResult = await db
    .prepare(checkQuery)
    .bind(paymentId, userId)
    .first<{ count: number }>();
  
  if (!checkResult || checkResult.count === 0) {
    throw new Error('Payment not found or you do not have permission to refund it');
  }
  
  // Process refund with Stripe
  if (payment.stripe_payment_id) {
    await stripe.refunds.create({
      payment_intent: payment.stripe_payment_id
    });
  }
  
  const now = new Date().toISOString();
  
  // Update payment status to refunded
  await db
    .prepare('UPDATE payments SET status = ?, updated_at = ? WHERE id = ?')
    .bind('refunded', now, paymentId)
    .run();
  
  return true;
}

export async function getSubscriptionPlans(
  db: D1Database
): Promise<SubscriptionPlan[]> {
  const plansResult = await db
    .prepare('SELECT * FROM subscription_plans ORDER BY price ASC')
    .all<any>();
  
  return plansResult.results.map(plan => ({
    ...plan,
    features: JSON.parse(plan.features)
  }));
}

export async function createSubscription(
  db: D1Database,
  userId: string,
  planId: string,
  paymentMethodId: string
): Promise<UserSubscription> {
  // Get the plan
  const plan = await db
    .prepare('SELECT * FROM subscription_plans WHERE id = ?')
    .bind(planId)
    .first<SubscriptionPlan>();

  if (!plan) {
    throw new Error('Subscription plan not found');
  }
  
  // Get the user
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<{ email: string }>();

  if (!user) {
    throw new Error('User not found');
  }
  
  // Check if user already has an active subscription
  const existingSubscription = await db
    .prepare('SELECT * FROM user_subscriptions WHERE user_id = ? AND status = ?')
    .bind(userId, 'active')
    .first<UserSubscription>();
  
  if (existingSubscription) {
    throw new Error('User already has an active subscription');
  }
  
  // Create a customer in Stripe if not exists
  let stripeCustomerId = await db
    .prepare('SELECT stripe_customer_id FROM users WHERE id = ?')
    .bind(userId)
    .first<{ stripe_customer_id: string | null }>();
  
  if (!stripeCustomerId?.stripe_customer_id) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId
      }
    });
    
    await db
      .prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?')
      .bind(customer.id, userId)
      .run();
    
    stripeCustomerId = { stripe_customer_id: customer.id };
  }
  
  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: stripeCustomerId.stripe_customer_id!
  });
  
  // Set as default payment method
  await stripe.customers.update(stripeCustomerId.stripe_customer_id!, {
    invoice_settings: {
      default_payment_method: paymentMethodId
    }
  });
  
  // Calculate subscription duration based on billing cycle
  const startDate = new Date();
  const endDate = new Date(startDate);
  
  switch (plan.billing_cycle) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'annually':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
  }
  
  // Create subscription in Stripe
  const stripeSubscription = await stripe.subscriptions.create({
    customer: stripeCustomerId.stripe_customer_id!,
    items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.name,
            description: plan.description
          },
          unit_amount: Math.round(plan.price * 100), // Convert to cents
          recurring: {
            interval: plan.billing_cycle === 'monthly' ? 'month' : 
                      plan.billing_cycle === 'quarterly' ? 'month' : 'year',
            interval_count: plan.billing_cycle === 'quarterly' ? 3 : 1
          }
        }
      }
    ],
    metadata: {
      userId,
      planId
    }
  });
  
  // Create subscription in database
  const subscriptionId = nanoid();
  const now = new Date().toISOString();
  
  await db
    .prepare(
      `INSERT INTO user_subscriptions (
        id, user_id, plan_id, status, start_date, end_date,
        stripe_subscription_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      subscriptionId,
      userId,
      planId,
      'active',
      startDate.toISOString(),
      endDate.toISOString(),
      stripeSubscription.id,
      now,
      now
    )
    .run();
  
  // Get created subscription
  const subscription = await db
    .prepare('SELECT * FROM user_subscriptions WHERE id = ?')
    .bind(subscriptionId)
    .first<UserSubscription>();

  if (!subscription) {
    throw new Error('Failed to create subscription');
  }
  
  return subscription;
}

export async function cancelSubscription(
  db: D1Database,
  subscriptionId: string,
  userId: string
): Promise<UserSubscription> {
  // Check if subscription exists and belongs to the user
  const existingSubscription = await db
    .prepare('SELECT * FROM user_subscriptions WHERE id = ? AND user_id = ?')
    .bind(subscriptionId, userId)
    .first<UserSubscription>();

  if (!existingSubscription) {
    throw new Error('Subscription not found or you do not have permission to cancel it');
  }
  
  if (existingSubscription.status !== 'active') {
    throw new Error('Subscription is not active');
  }
  
  // Cancel subscription in Stripe
  if (existingSubscription.stripe_subscription_id) {
    await stripe.subscriptions.cancel(existingSubscription.stripe_subscription_id);
  }
  
  const now = new Date().toISOString();
  
  // Update subscription status to cancelled
  await db
    .prepare('UPDATE user_subscriptions SET status = ?, updated_at = ? WHERE id = ?')
    .bind('cancelled', now, subscriptionId)
    .run();
  
  // Get updated subscription
  const updatedSubscription = await db
    .prepare('SELECT * FROM user_subscriptions WHERE id = ?')
    .bind(subscriptionId)
    .first<UserSubscription>();

  if (!updatedSubscription) {
    throw new Error('Failed to update subscription');
  }
  
  return updatedSubscription;
}

export async function getUserSubscription(
  db: D1Database,
  userId: string
): Promise<(UserSubscription & { plan: SubscriptionPlan }) | null> {
  // Get active subscription
  const subscription = await db
    .prepare('SELECT * FROM user_subscriptions WHERE user_id = ? AND status = ?')
    .bind(userId, 'active')
    .first<UserSubscription>();

  if (!subscription) {
    return null;
  }
  
  // Get subscription plan
  const plan = await db
    .prepare('SELECT * FROM subscription_plans WHERE id = ?')
    .bind(subscription.plan_id)
    .first<any>();

  if (!plan) {
    throw new Error('Subscription plan not found');
  }
  
  return {
    ...subscription,
    plan: {
      ...plan,
      features: JSON.parse(plan.features)
    }
  };
}
