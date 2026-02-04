# Offer Codes Documentation

## Overview

The offer code system allows you to grant free access to the app by providing promotional codes to users. When a valid code is redeemed, the user's `noPaywall` flag is set to `true`, giving them unlimited access without requiring a subscription.

## Database Schema

### offerCodes Table
Stores all available offer codes with their settings.

Fields:
- `code` (string): The actual code string (can be any case - matching is case-insensitive)
- `description` (optional string): What this code is for
- `maxUses` (optional number): Maximum redemptions (omit for unlimited)
- `usedCount` (number): Current number of redemptions (start at 0)
- `isActive` (boolean): Whether the code can be used (set to true)
- `expiresAt` (optional number): Expiration timestamp in milliseconds (omit for no expiry)

### offerCodeRedemptions Table
Tracks which users have redeemed which codes (prevents duplicate redemptions).

Fields:
- `codeId` (Id<"offerCodes">): Reference to the offer code
- `userId` (Id<"users">): Reference to the user
- `codeString` (string): The actual code (for reference)

## Creating Offer Codes

Offer codes are created directly in the Convex Data tab.

### Steps to Create a Code

1. Go to your Convex Dashboard
2. Navigate to the **"Data"** tab
3. Select the **"offerCodes"** table
4. Click **"Add Document"**
5. Fill in the fields:

```json
{
  "code": "WELCOME",
  "description": "Welcome offer for early users",
  "maxUses": null,
  "usedCount": 0,
  "isActive": true,
  "expiresAt": null
}
```

6. Click **"Save"**

### Field Requirements

**Required fields:**
- `code`: Must be unique (case-insensitive), can use any case
- `usedCount`: Always start at 0
- `isActive`: Set to true for new codes

**Optional fields:**
- `description`: For your reference
- `maxUses`: Leave null/omit for unlimited uses
- `expiresAt`: Leave null/omit for no expiration

### Examples

#### Unlimited Code (No Restrictions)
```json
{
  "code": "EARLYBIRD",
  "description": "Early access for beta testers",
  "usedCount": 0,
  "isActive": true
}
```

#### Limited Uses (50 redemptions max)
```json
{
  "code": "LAUNCH50",
  "description": "First 50 users",
  "maxUses": 50,
  "usedCount": 0,
  "isActive": true
}
```

#### Code with Expiration Date
```json
{
  "code": "SUMMER2024",
  "description": "Summer promotion",
  "usedCount": 0,
  "isActive": true,
  "expiresAt": 1725148800000
}
```

**Tip**: To get a timestamp for `expiresAt`, use JavaScript:
```javascript
new Date('2024-12-31').getTime()  // Returns: 1704067200000
```

#### Limited Uses + Expiration
```json
{
  "code": "PROMO100",
  "description": "Limited promo - 100 uses, expires end of month",
  "maxUses": 100,
  "usedCount": 0,
  "isActive": true,
  "expiresAt": 1735689600000
}
```

## Managing Offer Codes

### View All Codes
1. Go to **Data** tab in Convex Dashboard
2. Select **offerCodes** table
3. See all codes with their usage stats

### Deactivate a Code
1. Find the code in the **offerCodes** table
2. Click to edit it
3. Change `isActive` to `false`
4. Click **Save**

**Note**: Deactivating a code does not revoke access from users who already redeemed it.

### Check Code Usage
View the `usedCount` field in the **offerCodes** table to see how many times a code has been redeemed.

### See Who Redeemed a Code
1. Go to **offerCodeRedemptions** table
2. Look for the `codeId` you're interested in
3. See all users who redeemed it

## User Experience

### How Users Redeem Codes

1. User encounters the paywall
2. Clicks "Have an offer code?" at the bottom
3. Section expands to show text input
4. User enters the code (case-insensitive)
5. Clicks "Redeem"
6. If valid, user gets unlimited access and paywall closes

### Validation Checks

When a user tries to redeem a code, the system checks:
1. ✅ Code exists in database
2. ✅ Code is active (`isActive = true`)
3. ✅ Code hasn't expired (`expiresAt` > now, or no expiration set)
4. ✅ User hasn't already redeemed this code
5. ✅ Code hasn't reached max uses (if `maxUses` is set)

If all checks pass:
- User's `noPaywall` flag is set to `true`
- Redemption is recorded in `offerCodeRedemptions`
- Code's `usedCount` is incremented
- Success message shown and paywall closes

### Error Messages

Users see helpful error messages:
- "Invalid offer code" - Code doesn't exist
- "This offer code is no longer active" - Code deactivated
- "This offer code has expired" - Past expiration date
- "You have already redeemed this offer code" - Already used by this user
- "This offer code has reached its maximum number of uses" - Max uses reached

## Analytics

The following events are tracked via PostHog:
- `Offer Code Redeemed` - Successful redemption (includes code)
- `Offer Code Failed` - Failed redemption (includes code and reason)

## Best Practices

### Code Naming
- Use memorable, easy-to-type codes
- Case doesn't matter - "ROOTED", "rooted", and "Rooted" all work the same
- Avoid ambiguous characters (0 vs O, 1 vs l, I vs 1)
- Examples: `LAUNCH2024`, `BETA100`, `FRIEND50`, `WELCOME`

### Managing Codes
- Use descriptive `description` fields for your records
- Monitor usage in the Data tab
- Set `maxUses` for limited promotions
- Set `expiresAt` for time-limited campaigns
- Deactivate codes instead of deleting them (preserves history)

### Deactivation vs Expiration
- **Expiration**: Automatic at specified timestamp
- **Deactivation**: Manual control to stop redemptions immediately
- Use both for flexibility

## Common Use Cases

### 1. Beta Tester Access
```json
{
  "code": "BETATESTER",
  "description": "Beta testers - unlimited",
  "usedCount": 0,
  "isActive": true
}
```

### 2. Launch Promotion
```json
{
  "code": "LAUNCH100",
  "description": "First 100 users",
  "maxUses": 100,
  "usedCount": 0,
  "isActive": true
}
```

### 3. Limited Time Offer
```json
{
  "code": "SUMMER2024",
  "description": "Summer promotion - ends Sept 1",
  "usedCount": 0,
  "isActive": true,
  "expiresAt": 1725148800000
}
```

### 4. Influencer Codes
```json
{
  "code": "JOHN50",
  "description": "John's audience - first 50",
  "maxUses": 50,
  "usedCount": 0,
  "isActive": true
}
```

### 5. Press/Media
```json
{
  "code": "PRESS2024",
  "description": "Press and media access",
  "usedCount": 0,
  "isActive": true
}
```

## Revoking Access

If you need to revoke access from a user who redeemed a code:

1. Go to Convex Dashboard → Data tab
2. Find the user in the `users` table
3. Set their `noPaywall` field to `false` (or delete the field)

Note: The redemption record will remain in `offerCodeRedemptions` for audit purposes.

## Troubleshooting

### Code Not Working
- Check spelling in the Data tab
- Verify `isActive` is `true`
- Check if `expiresAt` is in the future (or null)
- Verify `maxUses` hasn't been reached
- Remember: codes are case-insensitive ("WELCOME" = "welcome" = "WeLcOmE")

### User Already Redeemed
- Each user can only redeem a code once
- Check `offerCodeRedemptions` table to verify
- If needed, delete the redemption record to allow re-redemption

### Access Not Granted After Redemption
- Check the `users` table - `noPaywall` should be `true`
- If not, the redemption may have failed
- Check console logs for errors
