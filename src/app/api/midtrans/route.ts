import { NextResponse } from 'next/server';

// @ts-ignore
import midtransClient from 'midtrans-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transaction_id, amount, customer_details, item_details } = body;

    // Create Snap API instance
    let snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-1234567890',
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-1234567890'
    });

    let parameter = {
      "transaction_details": {
        "order_id": transaction_id + '-' + Date.now(), // Append timestamp to ensure uniqueness in sandbox
        "gross_amount": amount
      },
      "customer_details": {
        "first_name": customer_details?.first_name || 'Pembeli',
        "email": customer_details?.email || 'pembeli@example.com',
      },
      "item_details": item_details || []
    };

    const transaction = await snap.createTransaction(parameter);
    
    return NextResponse.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });

  } catch (error: any) {
    console.error('Midtrans Error:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction', details: error.message },
      { status: 500 }
    );
  }
}
