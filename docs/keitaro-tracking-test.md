# Affiliate tracking test receiver

The owner explicitly enabled the diagnostic receiver for the joint Keitaro test on 21 October 2026:

https://peptbay.com/api/dev/echo?cid={sub_id_1}&status={status}&payout={payout}&tid={tid}

Configure this as an outgoing S2S postback on the test campaign. Keitaro must substitute the macros before sending. The receiver accepts GET requests, returns JSON with the received fields and logs validated fields under [postback-echo]. It does not create orders, mark payments or record Keitaro conversions. It is enabled only when POSTBACK_ECHO_ENABLED=true in production, with rate limiting and a small allowed field set. Do not send keys, banking details or customer personal information to this diagnostic endpoint.

The inbound website-to-Keitaro conversion URL is a separate private setting. Never substitute the echo endpoint for it. The backend's agreed fixed commission is USD 180.00 per paid order, held disabled until the actual private tracker URL is configured and verified. No campaign existed when preparation started; the campaign and its click-ID mapping must be configured before an end-to-end test can pass.
