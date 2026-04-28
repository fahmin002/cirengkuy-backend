import midtransClient from 'midtrans-client';

const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

export const createTransaction = async (order, total) => {
    const parameter = {
        "transaction_details": {
            "order_id": `CRK-${order.id}`,
            "gross_amount": total
        },
        enable_payments: ['qris'],
        callbacks: {
            finish: `${process.env.FRONTEND_URL}/payment-success?orderId=${order.id}`,
        }
    };

    try {
        const transaction = await snap.createTransaction(parameter);
        return transaction.redirect_url;
    } catch (err) {
        console.error('Midtrans error:', err);
        throw new Error('Gagal membuat transaksi pembayaran');
    }
}
