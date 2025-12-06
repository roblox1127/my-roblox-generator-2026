exports.handler = async function(event, context) {
    const API_KEY = "37019|udH6Fb4IC7cV942W6q6nIZl2qIsWR8Ep4YXVIygV68139ae4";
    const TRACKING_ID = "RobloxGen"; 

    const userIP = event.headers['x-nf-client-connection-ip'] || '1.1.1.1';
    const userAgent = event.headers['user-agent'] || 'Mozilla/5.0';
    
    // Requesting 30 offers to have a large pool to filter from
    const params = new URLSearchParams({ 
        ip: userIP, 
        user_agent: userAgent, 
        limit: '30', 
        device: 'mobile',
        aff_sub5: TRACKING_ID 
    });
    
    const API_URL = `https://downloadlocked.com/api/v2/?${params.toString()}`;

    try {
        const response = await fetch(API_URL, {
            headers: { "Authorization": `Bearer ${API_KEY}` }
        });

        const data = await response.json();
        
        if (data.success && data.offers) {
            let rawOffers = data.offers;

            // 1. Validate & Force Tracking on ALL offers first
            let offers = rawOffers.filter(o => (o.link || o.tracking_url)).map(offer => {
                let link = offer.link || offer.tracking_url;
                const separator = link.includes('?') ? '&' : '?';
                if (!link.includes('aff_sub5=')) {
                    link = `${link}${separator}aff_sub5=${TRACKING_ID}`;
                }
                offer.link = link;
                offer.tracking_url = link;
                return offer;
            });

            // 2. STRICT PRIORITY LOGIC
            // Group 1: CPI (Type 1) - App Installs
            // Group 2: Others (Type 2, 3, 4) - CPA, Pin, etc.
            
            const cpiOffers = offers.filter(o => parseInt(o.ctype) === 1);
            const otherOffers = offers.filter(o => parseInt(o.ctype) !== 1);
            
            let finalOffers = [];

            if (cpiOffers.length > 0) {
                // SCENARIO A: We have Apps. Show ONLY Apps. Hide everything else.
                // Sort by EPC (Highest Earnings first)
                cpiOffers.sort((a, b) => (parseFloat(b.epc) || 0) - (parseFloat(a.epc) || 0));
                finalOffers = cpiOffers;
            } else {
                // SCENARIO B: No Apps available. Show Backup offers (CPA/Pin).
                // Sort by Type (CPA > PIN) then by EPC
                otherOffers.sort((a, b) => {
                    let typeA = parseInt(a.ctype) || 99; 
                    let typeB = parseInt(b.ctype) || 99;
                    if (typeA !== typeB) return typeA - typeB; 
                    return (parseFloat(b.epc) || 0) - (parseFloat(a.epc) || 0);
                });
                finalOffers = otherOffers;
            }

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
                body: JSON.stringify(finalOffers.slice(0, 6)) // Return top 6
            };
        } else {
            return { statusCode: 400, body: JSON.stringify({ error: "No offers", details: data.message }) };
        }
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: "Server Error" }) };
    }
};
