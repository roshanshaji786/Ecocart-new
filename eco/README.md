# Eco, EcoCart's 24/7 AI salesman

Eco sells for ecocart.co.in on WhatsApp (+91 70121 45854, linked as a WhatsApp Web device through
[Baileys](https://github.com/WhiskeySockets/Baileys)) and in a chat bubble on the website. The brain is
DeepSeek (`deepseek-flash`, falls back to `deepseek-v4-pro`). It runs as a Docker project on the Hostinger VPS.

## What Eco does

| | |
|---|---|
| Sells in chat | Finds the need, recommends real products from the live catalogue with price and link, upsells bundles, FIRST50 and Christmas cut-off, closes with the link. English, Malayalam, Manglish. |
| Feels human | Waits for the customer to finish, marks read, shows "typing…", short bubbles, mirrors their language. Never lies if sincerely asked whether it is a bot. |
| Stays out of personal chats | Ignores groups, status, channels, saved contacts, and any new chat the classifier judges is not a shopper (friends, Darts AI / website leads). Any chat where Roshan types himself is paused for Eco. |
| Order help | "Where is my order" from the chat's phone number (needs the WooCommerce key). |
| Order alerts | Confirmation when an order is paid, update when it is completed. |
| Payment recovery | Pending/failed orders 45 min to 24 h old get one friendly nudge with the payment link. |
| Reorder nudges | Food/consumable orders 30 to 45 days old get one nudge. |
| Broadcasts | `hey eco broadcast …`: preview, then confirm. Sent slowly through the queue. "STOP" opts anyone out. |
| Hand-off | Complaints, refunds, custom/bulk orders → Eco pauses that chat and pings Roshan. |
| Daily report | 9 PM to Roshan: orders, revenue, chats, hand-offs, auto messages. |

All messages Eco starts itself share one queue: max 8 an hour, 30 a day, 9 AM to 8 PM IST, 2 to 4 minutes apart,
only to numbers that exist on WhatsApp and have not opted out. This is what keeps the free connection from a ban.

## Controlling Eco from WhatsApp

Send from the "Message yourself" chat on 70121 45854 (or from 70120 45854):

- `hey eco status` · `hey eco sales today` · `hey eco sales last 7 days`
- `hey eco pause` / `hey eco resume` (everyone)
- `hey eco resume 9876543210` (after you handled a hand-off) · `hey eco pause 9876543210`
- `hey eco push the honey trio this week` · `hey eco clear instructions`
- `hey eco tell 9876543210 your hamper ships tomorrow`
- `hey eco broadcast past customers: Hi {name}, our Christmas hampers are in…` then `hey eco yes send it`
- `hey eco queue` · `hey eco cancel the broadcast`

## Deploy (Hostinger Docker Manager)

1. Project `ecocart-eco` from `deploy/docker-compose.yml`.
2. Project environment (hPanel, never git): `CODE_REF=<commit sha>`, `LINK_TOKEN=<random>`, and optionally
   `WOO_CONSUMER_KEY` / `WOO_CONSUMER_SECRET` (WooCommerce > Settings > Advanced > REST API, Read access).
   `DEEPSEEK_API_KEY` is read from `/docker/deepseek-gateway/.env` already on the VPS.
3. Link WhatsApp: open `http://93.127.206.59:8795/link?token=<LINK_TOKEN>` and enter the pairing code or scan the QR
   on the phone that has 70121 45854 (WhatsApp > Linked devices).
4. Update: push, set `CODE_REF` to the new SHA, restart the project.

## Website chat bubble

Needs an HTTPS address for Eco (the store is HTTPS). Once there is one, add before `</body>`:

```html
<script src="https://ECO-HOST/widget/eco-widget.js" data-endpoint="https://ECO-HOST/chat" defer></script>
```

## Local run

```sh
cp .env.example .env   # fill in, never commit
npm ci && npm start
```
