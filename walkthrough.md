# 🚀 AWS SES Webhook Setup Walkthrough

We have successfully implemented the AWS SES Webhook tracking system for tracking both **Deliveries** and **Bounces/Complaints**.

## What Was Done

1. **Database Schema Update**: 
   - Added a `message_id` column to the `campaign_logs` table.
   - Applied an Alembic database migration to automatically update the schema.
   
2. **Backend Logic Modifications**:
   - Modified `campaign_service.py` to capture the `message_id` returned from AWS SES and store it in `CampaignLog`.
   - The initial status of an email sent via SES is now `sent_to_ses`.

3. **Webhook API Endpoint**:
   - Created a new endpoint at `POST /api/v1/webhooks/aws-ses`.
   - Handled **SubscriptionConfirmation**: The backend will now automatically confirm SNS subscription requests.
   - Handled **Notifications**: When SES sends a Delivery, Bounce, or Complaint notification via SNS, the backend parses the JSON, matches the `messageId` to the `CampaignLog` entry, and updates the status to `"delivered"`, `"bounced"`, or `"complained"`. It also updates the campaign's `sent_count` and `failed_count` appropriately.

## Next Steps for You

> [!IMPORTANT]
> To start receiving the notifications from AWS, please follow these steps in your AWS Console:
> 
> 1. Go to **AWS SNS (Simple Notification Service)** and create a new Standard Topic (e.g., `ocap-ses-notifications`).
> 2. Create a Subscription for that topic:
>    - Protocol: `HTTPS`
>    - Endpoint: `https://your-domain.com/api/v1/webhooks/aws-ses` (Replace `your-domain.com` with your actual backend URL).
>    - Check the "Enable raw message delivery" box if available, otherwise it's fine.
> 3. Go to **AWS SES (Simple Email Service)** -> Configuration -> Verified Identities -> Click on your verified domain or email.
> 4. Go to the **Notifications** tab and set the SNS Topic you created in step 1 for:
>    - Bounces
>    - Complaints
>    - Deliveries
> 5. Make sure the SNS endpoint confirms successfully! Our backend is set up to automatically click the confirmation link AWS sends.

Everything is deployed and running successfully on the code side!
