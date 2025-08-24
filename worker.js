addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request, event.env));
});

async function handleRequest(request, env) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // التعامل مع طلبات "Preflight" من المتصفح
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }

    // رفض الطلبات التي ليست من نوع POST
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    try {
        const orderDetails = await request.json();

        const BOT_TOKEN = env.BOT_TOKEN;
        const CHAT_ID = env.CHAT_ID;

        // بناء رسالة تيليجرام
        let messageText = '<b>✅ طلب جديد من السوبر ماركت:</b>\n\n';
        messageText += `<b>- الاسم:</b> ${orderDetails.customer.name}\n`;
        messageText += `<b>- الهاتف:</b> ${orderDetails.customer.phone}\n\n`;
        messageText += `<b><u>المنتجات:</u></b>\n`;

        for (const itemName in orderDetails.items) {
            const item = orderDetails.items[itemName];
            messageText += `• ${item.name} (الكمية: ${item.quantity}) - السعر: ${(item.price * item.quantity).toLocaleString('ar-SY')} د.ع\n`;
        }
        messageText += `\n<b><u>${orderDetails.total}</u></b>`;

        const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        
        const telegramResponse = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: messageText,
                parse_mode: 'HTML',
            }),
        });

        if (!telegramResponse.ok) {
            const errorData = await telegramResponse.json();
            throw new Error(`Failed to send message: ${errorData.description}`);
        }

        return new Response(JSON.stringify({ success: true, message: 'Order sent to Telegram' }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders // إضافة ترويسات CORS للرد الناجح
            },
        });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders // إضافة ترويسات CORS لرد الخطأ
            },
        });
    }
}
