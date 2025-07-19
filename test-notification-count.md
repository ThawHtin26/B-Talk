# Notification Count Test Guide

## Issue: Notification bell not showing notification count

## Debugging Steps:

### Step 1: Check Browser Console
1. Open browser console (F12)
2. Look for these logs:
   ```
   User authenticated, loading unread count...
   Loading unread count from API...
   Unread count API response: {...}
   Setting unread count to: X
   Unread count updated: X
   ```

### Step 2: Check Authentication
1. Verify user is logged in
2. Check if JWT token is present in localStorage
3. Look for "User not authenticated, skipping unread count load" message

### Step 3: Test API Endpoint
```bash
# Test the unread count API directly
curl -X GET http://localhost:8080/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 4: Check Database
```sql
-- Check if there are unread notifications in the database
SELECT COUNT(*) FROM notifications WHERE is_read = 0 AND recipient_id = 'YOUR_USER_ID';
```

### Step 5: Test Notification Creation
1. Use the test endpoint to create a notification
2. Check if the count updates in real-time
3. Verify the badge appears on the notification bell

## Expected Behavior:

1. **On Login**: Unread count should load automatically
2. **On New Notification**: Count should increment immediately
3. **On Mark as Read**: Count should decrement
4. **On Mark All as Read**: Count should become 0
5. **Badge Display**: Badge should show when count > 0

## Common Issues:

### Issue 1: Count Always Shows 0
**Possible Causes:**
- User not authenticated
- API endpoint not working
- Database has no unread notifications
- Frontend not subscribing to updates

**Solutions:**
1. Check authentication status
2. Test API endpoint directly
3. Create test notifications
4. Check browser console for errors

### Issue 2: Count Not Updating in Real-time
**Possible Causes:**
- WebSocket not connected
- Notification service not updating count
- Frontend not receiving updates

**Solutions:**
1. Check WebSocket connection
2. Verify notification service is working
3. Check if real-time notifications are being received

### Issue 3: Badge Not Visible
**Possible Causes:**
- CSS issues
- Count is 0
- Component not rendering properly

**Solutions:**
1. Check CSS for badge visibility
2. Verify count is > 0
3. Check component rendering

## Test Commands:

```bash
# Check backend logs for notification count
Get-Content backend/logs/application.log | Select-String -Pattern "unread|count|notification" | Select-Object -Last 10

# Check frontend console for count updates
# Look for "Unread count updated:" messages
``` 