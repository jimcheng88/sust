import { D1Database } from '@cloudflare/workers-types';
import { NextRequest, NextResponse } from 'next/server';
import { 
  createPaymentIntent,
  handleStripeWebhook,
  getPaymentHistory,
  refundPayment,
  getSubscriptionPlans,
  createSubscription,
  cancelSubscription,
  getUserSubscription
} from '@/lib/payments';

export async function POST(request: NextRequest) {
  try {
    const db = (request.env as any).DB as D1Database;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create-payment-intent':
        const { projectMatchId, amount, currency } = body;
        const paymentIntent = await createPaymentIntent(db, projectMatchId, amount, currency);
        return NextResponse.json(paymentIntent);

      case 'stripe-webhook':
        const { event } = body;
        const webhookResult = await handleStripeWebhook(db, event);
        return NextResponse.json({ success: webhookResult });

      case 'get-payment-history':
        const { userId, userType, page, pageSize } = body;
        const paymentHistory = await getPaymentHistory(db, userId, userType, page, pageSize);
        return NextResponse.json(paymentHistory);

      case 'refund-payment':
        const { paymentId, userId: refundUserId, userType: refundUserType } = body;
        const refundResult = await refundPayment(db, paymentId, refundUserId, refundUserType);
        return NextResponse.json({ success: refundResult });

      case 'get-subscription-plans':
        const subscriptionPlans = await getSubscriptionPlans(db);
        return NextResponse.json(subscriptionPlans);

      case 'create-subscription':
        const { userId: subscriptionUserId, planId, paymentMethodId } = body;
        const subscription = await createSubscription(db, subscriptionUserId, planId, paymentMethodId);
        return NextResponse.json(subscription);

      case 'cancel-subscription':
        const { subscriptionId, userId: cancelUserId } = body;
        const cancelResult = await cancelSubscription(db, subscriptionId, cancelUserId);
        return NextResponse.json(cancelResult);

      case 'get-user-subscription':
        const { userId: getUserSubId } = body;
        const userSubscription = await getUserSubscription(db, getUserSubId);
        return NextResponse.json(userSubscription);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
