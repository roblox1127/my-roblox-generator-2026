export async function onRequest(context) {
    const API_KEY = "37019|udH6Fb4IC7cV942W6q6nIZl2qIsWR8Ep4YXVIygV68139ae4";
    const TRACKING_ID = "RobloxGen";
    
    const request = context.request;
    
    // Cloudflare Headers
    const userIP = request.headers.get('CF-Connecting-IP') || '1.1.1.1';
    const userAgent = request.headers.get('User-Agent') || 'Mozilla/5.0';

    // Fetch 30 offers, no filters
    const params = new URLSearchParams({ 
        ip: userIP, 
        user_agent: userAgent, 
        limit: '30',
        aff_sub5: TRACKING_ID 
    });

    const API_URL = `https://downloadlocked.com/api/v2/?${params.toString()}`;

    try {
        const response = await fetch(API_URL, {
            headers: { "Authorization": `Bearer ${API_KEY}` }
        });

        const data = await response.json();
        
        // CORS Headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Content-Type": "application/json"
        };

        if (data.success && data.offers) {
            let offers = data.offers;
            
            // 1. Force Tracking
            offers = offers.map(offer => {
                let link = offer.link || offer.tracking_url;
                if (link) {
                    const separator = link.includes('?') ? '&' : '?';
                    link = `${link}${separator}aff_sub5=${TRACKING_ID}`;
                    offer.link = link;
                    offer.tracking_url = link;
                }
                return offer;
            });

            // 2. Sort: CPI > Payout
            offers.sort((a, b) => {
                let typeA = parseInt(a.ctype) || 99; 
                let typeB = parseInt(b.ctype) || 99;
                if (typeA !== typeB) return typeA - typeB; 
                return parseFloat(b.payout) - parseFloat(a.payout);
            });

            return new Response(JSON.stringify(offers.slice(0, 6)), {
                headers: corsHeaders
            });
        } else {
            return new Response(JSON.stringify({ error: "No offers" }), {
                status: 400,
                headers: corsHeaders
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: "Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
