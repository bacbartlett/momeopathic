# Clerk Session Configuration

## Problem
Users are being asked to log in every few days. This happens because Clerk sessions have default expiration times.

## Solution
Configure Clerk to keep sessions active indefinitely by adjusting session lifetimes in the Clerk Dashboard.

## Steps to Configure Clerk Dashboard

### 1. Go to Clerk Dashboard
Visit [https://dashboard.clerk.com](https://dashboard.clerk.com) and select your application.

### 2. Navigate to Session Settings
1. Click on **"Configure"** in the left sidebar
2. Click on **"Sessions"**

### 3. Adjust Session Lifetime Settings

You'll see several session configuration options:

#### **Inactive Session Lifetime**
- **Default**: 7 days
- **Recommended**: Set to **"Never expire"** or maximum value (e.g., 999 days)
- This controls how long a session can be inactive before requiring re-authentication

#### **Maximum Session Lifetime**
- **Default**: 7 days
- **Recommended**: Set to **"Never expire"** or maximum value (e.g., 999 days)
- This is the absolute maximum time a session can exist, regardless of activity

### 4. Multi-Session Handling
- Enable **"Allow multiple sessions"** if you want users to stay logged in across devices

### 5. Token Lifetimes (Advanced)

If available, also check:
- **Access Token Lifetime**: Default is typically 1 hour (this is fine - our app refreshes every 30 minutes)
- **Refresh Token Lifetime**: Should match or exceed the Inactive Session Lifetime

### 6. Save Changes
Click **"Save"** at the bottom of the page.

## Code Changes Made

The following code changes were made to support persistent sessions:

### 1. Enhanced Token Cache (`lib/clerk-token-cache.ts`)
- Added `keychainAccessible: AFTER_FIRST_UNLOCK` to ensure tokens persist after device restart
- Added logging to debug token caching issues

### 2. Session Manager Component (`components/session-manager.tsx`)
- Automatically refreshes tokens every 30 minutes
- Refreshes token when app comes to foreground
- Prevents token expiration by keeping them fresh

### 3. App Layout (`app/_layout.tsx`)
- Integrated SessionManager component into the provider tree
- Ensures session management starts as soon as user is authenticated

## Testing

After making these changes:

1. Sign in to the app
2. Close the app completely
3. Wait several days
4. Open the app again
5. **Expected**: User should remain signed in without being prompted to log in again

## Monitoring

The SessionManager logs token refresh activity to the console:
- `[SessionManager] Token refreshed successfully` - Token was refreshed
- `[SessionManager] App foregrounded, refreshing token` - Token refreshed when app opened

You can monitor these logs to ensure tokens are being refreshed properly.

## Security Note

Setting sessions to never expire is common for mobile apps where users expect to stay logged in. However, consider:

- Users can still explicitly sign out from the Account screen
- Tokens are stored securely in device keychain via expo-secure-store
- If a device is compromised, the user can revoke sessions from Clerk Dashboard
- Consider implementing additional security measures for sensitive operations (e.g., re-authentication for account deletion)
