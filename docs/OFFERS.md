# Storefront banners and offers

Open `/dashboard/settings` and scroll to **Storefront banner & offers**.

1. Set a hosted banner image URL, small heading, headline, description, button text and image description. Leave the image URL blank to use the theme image. The button leads to the product catalog.
2. Check **Enable offer** and enter an announcement. Set **Store-wide discount (%)** to a whole percentage from 0 to 100. Use 0% for an announcement without a discount.
3. Choose **Save banner & offers**. A published store has a link to inspect the result. The image and content save together; existing brand settings, catalog and orders are preserved.

All six themes support these controls. Theme changes keep merchant-authored banner text and the offer. Images are cropped to fit each layout; keep promotional copy in the text fields so it remains readable on mobile.

## Discount behavior

The discount applies automatically at checkout to the current product subtotal, including variant prices and any existing product sale prices. Delivery is charged at its normal rate. The product cards show their current prices, and the offer bar explains that the additional discount applies at checkout.

For example, a ৳125 product with a 20% store discount and ৳60 delivery totals **৳160**: ৳125 − ৳25 + ৳60. The cart estimates the discount; checkout obtains an authoritative quote from the server. The server rounds the subtotal discount to the nearest poisha, with half-poisha values rounded up.

Saved orders retain their original product subtotal, discount and final total. Tracking and merchant order details show the saved discount. Turning off an offer affects new orders; retries of an already-created order return its saved totals. Changing the discount after a quote requires the customer to confirm an updated total.

Only the shop owner or a platform administrator can change banner/offer settings. Amounts submitted by customers cannot override the store's saved discount. Invalid percentages or banner URLs reject the whole content save. Configuring an offer does not publish a draft store.

## Current scope

Banner images use hosted image URLs; HTTPS is recommended. File uploading and storage are not implemented. Offers start when saved and stop when disabled. Coupon codes, scheduling and product-specific campaign rules are separate features.
