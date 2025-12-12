export async function onRequest(context) {
    const API_KEY = "37019|udH6Fb4IC7cV942W6q6nIZl2qIsWR8Ep4YXVIygV68139ae4"; 
    const TRACKING_ID = "RobloxGen";
    
    const request = context.request;
    
    // 1. Get Country from Cloudflare (Returns 'GB', 'US', 'DE', etc.)
    let userCountry = request.cf?.country || 'US'; 
    const userIP = request.headers.get('CF-Connecting-IP') || '1.1.1.1';
    const userAgent = request.headers.get('User-Agent') || 'Mozilla/5.0';

    // --- FIX: Handle GB vs UK Mismatch ---
    // Create a list of acceptable codes for this user.
    // If Cloudflare says "GB", we also accept offers labeled "UK".
    let allowedCodes = [userCountry];
    if (userCountry === 'GB') {
        allowedCodes.push('UK');
    }

    // 2. Fetch from OGAds
    // We send the standard 'userCountry' (e.g. GB) to the API parameter
    const params = new URLSearchParams({ 
        ip: userIP, 
        country_code: userCountry, 
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
        
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Content-Type": "application/json"
        };

        if (data.success && data.offers && data.offers.length > 0) {
            let offers = data.offers;

            // --- STRICT FILTERING (With GB/UK Fix) ---
            offers = offers.filter(offer => {
                // If offer has no country restrictions, keep it
                if (!offer.countries || offer.countries.includes("ALL")) return true;
                
                // Check if ANY of our allowed codes (e.g. GB or UK) match the offer's list
                // If the offer allows ["UK", "CA"] and we are ["GB", "UK"], this returns true.
                const matchFound = offer.countries.some(c => allowedCodes.includes(c));
                
                return matchFound;
            });
            // ----------------------------------------------
            
            // 3. Attach Tracking ID
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

            // 4. Sort by EPC
            offers.sort((a, b) => {
                if (a.epc && b.epc) return parseFloat(b.epc) - parseFloat(a.epc);
                return parseFloat(b.payout) - parseFloat(a.payout);
            });

            // Return top 6
            return new Response(JSON.stringify(offers.slice(0, 6)), {
                headers: corsHeaders
            });
        } else {
            return new Response(JSON.stringify({ error: "No offers for " + userCountry }), {
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
