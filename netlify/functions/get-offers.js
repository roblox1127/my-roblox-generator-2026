exports.handler = async function(event, context) {
    const API_KEY = "37019|udH6Fb4IC7cV942W6q6nIZl2qIsWR8Ep4YXVIygV68139ae4";
    const TRACKING_ID = "RobloxGen"; 

    // Get User Details for Geotargeting
    const userIP = event.headers['x-nf-client-connection-ip'] || '1.1.1.1';
    const userAgent = event.headers['user-agent'] || 'Mozilla/5.0';
    
    // Pass tracking to API
    const params = new URLSearchParams({ 
        ip: userIP, 
        user_agent: userAgent, 
        limit: '20', 
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
            let offers = data.offers;
            
            // --- FIX: NO PRICE FILTER ---
            // Removed the /data/data/com.termux/files/usr/bin/bash.20 limit so all offers show (prevents empty lockers)
            
            // SORT: CPI (Apps) > CPA > PIN
            offers.sort((a, b) => {
                let typeA = parseInt(a.ctype) || 99; 
                let typeB = parseInt(b.ctype) || 99;
                if (typeA !== typeB) return typeA - typeB; 
                return (parseFloat(b.epc) || 0) - (parseFloat(a.epc) || 0);
            });

            // --- FIX: FORCE TRACKING ON LINKS ---
            // Manually append aff_sub5 to ensure tracking works 100%
            offers = offers.map(offer => {
                let link = offer.link || offer.tracking_url;
                if (link) {
                    const separator = link.includes('?') ? '&' : '?';
                    // Check if tag already exists to avoid double tagging
                    if (!link.includes('aff_sub5=')) {
                        link = `${link}${separator}aff_sub5=${TRACKING_ID}`;
                    }
                    offer.link = link;
                    offer.tracking_url = link;
                }
                return offer;
            });

            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
                body: JSON.stringify(offers.slice(0, 6)) // Return Top 6 offers
            };
        } else {
            return { statusCode: 400, body: JSON.stringify({ error: "No offers", details: data.message }) };
        }
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: "Server Error" }) };
    }
};
