# Quick Start: Create Your First Offer Code

Follow these steps to create your first offer code.

## Step 1: Deploy the Schema Changes

Before creating codes, deploy the new schema to Convex:

```bash
npm run convex:deploy
```

This will update your Convex database to include the new `offerCodes` and `offerCodeRedemptions` tables.

## Step 2: Open Convex Dashboard

1. Go to [https://dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Click on the **"Data"** tab

## Step 3: Create Your First Code

1. In the Data tab, select the **"offerCodes"** table
2. Click **"Add Document"** button
3. Enter the following JSON:

### Example 1: Simple Unlimited Code
```json
{
  "code": "WELCOME",
  "description": "Welcome offer for early users",
  "usedCount": 0,
  "isActive": true
}
```

### Example 2: Limited Code (50 uses)
```json
{
  "code": "BETA50",
  "description": "Beta testers - limited to 50 people",
  "maxUses": 50,
  "usedCount": 0,
  "isActive": true
}
```

### Example 3: Code with Expiration
```json
{
  "code": "LAUNCH2024",
  "description": "Launch month promotion",
  "usedCount": 0,
  "isActive": true,
  "expiresAt": 1735689600000
}
```

**Note**: To calculate `expiresAt` timestamp:
```javascript
// In browser console or Node.js:
new Date('2024-12-31').getTime()  // Returns: 1735689600000
```

4. Click **"Save"** to create the code

## Step 4: Test the Code

1. Open your app
2. Navigate to the paywall screen
3. Click **"Have an offer code?"** at the bottom
4. Enter the code you created (e.g., "WELCOME")
5. Click **"Redeem"**
6. You should see: "Offer code redeemed successfully! You now have unlimited access."
7. The paywall should close automatically

## Step 5: Verify It Worked

### Check User Access
1. Try using features that normally require a subscription
2. You should have unlimited access without being prompted for payment

### Check in Convex Dashboard
Go to the **Data** tab and verify:

1. **users table**: Find your user → `noPaywall` should be `true`
2. **offerCodeRedemptions table**: You should see your redemption record
3. **offerCodes table**: Find your code → `usedCount` should be `1`

## Managing Codes

### View All Codes
- Go to **Data** tab → **offerCodes** table
- You'll see all codes with their usage stats

### Deactivate a Code
1. Go to **Data** tab → **offerCodes** table
2. Find the code you want to deactivate
3. Click on it to edit
4. Change `isActive` to `false`
5. Click **"Save"**

### Monitor Usage
- Check the `usedCount` field to see how many times a code has been used
- If you set `maxUses`, watch for codes approaching their limit

## Code Examples for Different Scenarios

### Testing/Development
```json
{
  "code": "DEVTEST",
  "description": "Development testing",
  "maxUses": 5,
  "usedCount": 0,
  "isActive": true
}
```

### Press/Media
```json
{
  "code": "PRESS2024",
  "description": "Press and media access",
  "usedCount": 0,
  "isActive": true
}
```

### Social Media Campaign
```json
{
  "code": "INSTAGRAM100",
  "description": "Instagram followers - first 100",
  "maxUses": 100,
  "usedCount": 0,
  "isActive": true,
  "expiresAt": 1735689600000
}
```

### Product Hunt Launch
```json
{
  "code": "PRODUCTHUNT",
  "description": "Product Hunt launch day",
  "usedCount": 0,
  "isActive": true,
  "expiresAt": 1704153600000
}
```

### Friends & Family
```json
{
  "code": "FRIENDS",
  "description": "Friends and family unlimited access",
  "usedCount": 0,
  "isActive": true
}
```

## Field Reference

When creating codes, remember:

**Required fields:**
- `code` - The code string (any case works - "ROOTED", "rooted", "Rooted" are all the same)
- `usedCount` - Always start at `0`
- `isActive` - Set to `true` for new codes

**Optional fields:**
- `description` - For your reference
- `maxUses` - Omit or set to `null` for unlimited
- `expiresAt` - Omit or set to `null` for no expiration

## Troubleshooting

### "Invalid offer code"
- Check the spelling in the Data tab
- Verify the code exists in the `offerCodes` table
- Remember: codes are case-insensitive ("WELCOME" = "welcome" = "WeLcOmE")

### "This offer code has reached its maximum number of uses"
- Check `usedCount` vs `maxUses` in the Data tab
- Either create a new code or update `maxUses` to a higher number

### "You have already redeemed this offer code"
- Each user can only redeem a code once
- Check `offerCodeRedemptions` table to see past redemptions
- If you want to allow re-redemption, delete the record in that table

### User doesn't have access after redeeming
- Go to Data tab → **users** table
- Find the user and check if `noPaywall` is `true`
- If not, check the app console logs for errors
- Try redeeming the code again

### Code expired
- Check if `expiresAt` is set and is in the past
- Update `expiresAt` to a future timestamp or remove it

## Tips

1. **Use descriptive codes**: Make them memorable and easy to type
2. **Case doesn't matter**: Store codes however you like - matching is case-insensitive
3. **Track in a spreadsheet**: Keep a list of codes, their purpose, and who you gave them to
4. **Set expiration dates**: For time-sensitive promotions
5. **Use maxUses**: For limited campaigns or testing
6. **Monitor regularly**: Check the Data tab to see which codes are popular
7. **Deactivate, don't delete**: Keep codes for historical records

## Next Steps

- Read `OFFER_CODES.md` for complete documentation
- Create codes for different user segments
- Set up tracking for your campaigns
- Plan your promotional strategy
