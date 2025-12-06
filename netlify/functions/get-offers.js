exports.handler = async function(event, context) {
    const API_KEY = "37019|udH6Fb4IC7cV942W6q6nIZl2qIsWR8Ep4YXVIygV68139ae4";
    const TRACKING_ID = "RobloxGen"; 

    // Robust IP detection
    const userIP = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || '1.1.1.1';
    const userAgent = event.headers['user-agent'] || 'Mozilla/5.0';
    
    // FETCH 30 OFFERS (High limit to ensure locker is full)
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
        
        if (data.success && data.offers) {
            let offers = data.offers;
            
            // --- FIX: NO PRICE FILTER ---
            // We removed the line that deleted cheap offers.
            // Now ALL apps will show up.

            // 1. Force Tracking Tag
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

            // 2. SORTING: Prioritize Apps (CPI), then High Payout
            offers.sort((a, b) => {
                let typeA = parseInt(a.ctype) || 99; // 1 = CPI
                let typeB = parseInt(b.ctype) || 99;
                
                // Show Apps (Type 1) First
                if (typeA !== typeB) return typeA - typeB; 
                
                // Then sort by Payout
                return parseFloat(b.payout) - parseFloat(a.payout);
            });

            // Return Top 6 offers
            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
                body: JSON.stringify(offers.slice(0, 6)) 
            };
        } else {
            return { statusCode: 400, body: JSON.stringify({ error: "No offers", details: data.message }) };
        }
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: "Server Error" }) };
    }
};
