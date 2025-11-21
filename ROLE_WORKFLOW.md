# User Role System - Workflow Documentation

## Overview

The system now includes a custom application-level role field (`role`) on the User model that can be set to either `"user"` (default) or `"admin"`. This is separate from Django's built-in `is_staff` field which controls Django admin panel access.

## Role Types

### 1. **Application Role** (`role` field)
- **Values**: `"user"` (default) or `"admin"`
- **Purpose**: Application-level admin permissions
- **Usage**: Controls access to application features
- **Location**: `User.role` field

### 2. **Django Admin Role** (`is_staff` field)
- **Values**: `True` or `False`
- **Purpose**: Django admin panel access
- **Usage**: Controls access to Django admin interface at `/admin/`
- **Location**: `User.is_staff` field (from Django's AbstractUser)

## Database Schema

### User Model Fields

```python
class User(AbstractUser):
    role = models.CharField(
        max_length=10,
        choices=[("user", "User"), ("admin", "Admin")],
        default="user",
        db_index=True
    )
    # ... other fields
```

**Migration**: `backend/accounts/migrations/0002_add_user_role.py`

## Setting User Roles

### Method 1: Via Django Admin Panel

1. Navigate to Django admin: `http://localhost:8000/admin/`
2. Go to **Accounts > Users**
3. Select a user
4. Find the **Role** field in the form
5. Select either "User" or "Admin"
6. Click **Save**

### Method 2: Via Django Shell

```python
from accounts.models import User

# Get user
user = User.objects.get(email='user@example.com')

# Set as admin
user.role = User.Role.ADMIN  # or user.role = "admin"
user.save()

# Set as regular user
user.role = User.Role.USER  # or user.role = "user"
user.save()

# Check role
if user.is_admin_role:
    print("User is an admin")
```

### Method 3: Via Registration API (programmatically)

When creating a user programmatically:

```python
from accounts.models import User

# Create regular user
user = User.objects.create_user(
    email='user@example.com',
    password='password123',
    role=User.Role.USER  # or role="user"
)

# Create admin user (requires existing admin to do this)
user = User.objects.create_user(
    email='admin@example.com',
    password='password123',
    role=User.Role.ADMIN  # or role="admin"
)
```

### Method 4: Via Profile Update API (if user is admin)

Only admins can change roles via the profile update endpoint:

```http
PATCH /api/auth/me/
Content-Type: application/json
Authorization: Bearer <token>

{
  "role": "admin"
}
```

**Note**: This only works if:
- The user making the request is already an admin (`role="admin"` or `is_staff=True`)
- Or the user is trying to change their own role and has admin privileges

## Checking User Roles

### Backend (Python)

```python
from accounts.models import User

user = User.objects.get(email='user@example.com')

# Check application role
if user.role == User.Role.ADMIN:
    print("Application admin")

if user.is_admin_role:  # Property method
    print("Application admin")

# Check Django admin access
if user.is_staff:
    print("Django admin access")
```

### Frontend (TypeScript)

```typescript
import { useAuth } from '../context/AuthContext'

function MyComponent() {
  const { user } = useAuth()
  
  if (user?.role === 'admin') {
    // User is an admin
  }
  
  if (user?.is_staff) {
    // User has Django admin access
  }
}
```

## Permission Classes

### IsAdminRole

Use this permission class to restrict views to admin users:

```python
from accounts.permissions import IsAdminRole
from rest_framework.views import APIView

class AdminOnlyView(APIView):
    permission_classes = [IsAdminRole]
    
    def get(self, request):
        # Only admins can access this
        return Response({"message": "Admin access granted"})
```

### IsAdminRoleOrReadOnly

Allows all authenticated users to read, but only admins can write:

```python
from accounts.permissions import IsAdminRoleOrReadOnly

class ReadOnlyOrAdminView(APIView):
    permission_classes = [IsAdminRoleOrReadOnly]
    
    def get(self, request):
        # All authenticated users can read
        return Response({"data": "..."})
    
    def post(self, request):
        # Only admins can create
        return Response({"message": "Created"})
```

## API Endpoints

### Get Current User Profile (includes role)

```http
GET /api/auth/me/
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "user",
  "name": "John Doe",
  "is_staff": false,
  "role": "admin",
  "date_joined": "2024-01-01T00:00:00Z",
  "stats": { ... }
}
```

### Update User Profile (includes role if admin)

```http
PATCH /api/auth/me/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "role": "admin"  // Only if current user is admin
}
```

**Note**: Only admins can change the `role` field. Regular users cannot change their own role.

## Workflow Examples

### Workflow 1: Making a User an Admin

1. **Existing Admin or Superuser** logs into Django admin
2. Navigate to **Accounts > Users**
3. Select the user to promote
4. Set **Role** to "Admin"
5. Optionally set **Staff status** to True (for Django admin access)
6. Click **Save**
7. User now has admin privileges

### Workflow 2: User Checking Their Role

1. User logs into the application
2. Navigate to **Profile** page
3. View their **Application Role** (displays "Admin" or "User")
4. View their **Django Admin** status (displays "Yes" or "No")

### Workflow 3: Admin Feature Access

1. Backend view checks role:
   ```python
   if request.user.is_admin_role:
       # Allow admin-only action
   else:
       raise PermissionDenied("Admin access required")
   ```

2. Frontend checks role:
   ```typescript
   if (user?.role === 'admin') {
       // Show admin UI
   } else {
       // Hide admin features
   }
   ```

### Workflow 4: Default User Registration

1. New user registers via `/api/auth/register/`
2. User is automatically created with `role="user"` (default)
3. User has limited permissions
4. Admin must manually promote user to admin role

## Use Cases

### Use Case 1: Admin-only Feature

**Scenario**: Only admins can delete robots

```python
from accounts.permissions import IsAdminRole

class RobotDeleteView(APIView):
    permission_classes = [IsAdminRole]
    
    def delete(self, request, robot_id):
        robot = Robot.objects.get(id=robot_id)
        robot.delete()
        return Response(status=204)
```

### Use Case 2: Admin Dashboard

**Scenario**: Show admin dashboard only to admins

```typescript
function Dashboard() {
  const { user } = useAuth()
  
  return (
    <div>
      {user?.role === 'admin' && (
        <AdminDashboard />
      )}
      <RegularDashboard />
    </div>
  )
}
```

### Use Case 3: Role-based User Management

**Scenario**: Admins can view all users, regular users can only see themselves

```python
class UserListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.is_admin_role:
            users = User.objects.all()
        else:
            users = User.objects.filter(id=request.user.id)
        
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
```

## Differences: `is_staff` vs `role`

| Feature | `is_staff` | `role` |
|---------|------------|--------|
| **Purpose** | Django admin panel access | Application-level permissions |
| **Value** | Boolean (`True`/`False`) | String (`"user"`/`"admin"`) |
| **Default** | `False` | `"user"` |
| **Usage** | Django admin interface | Application features |
| **Can Change** | Via Django admin or code | Via Django admin, API (if admin), or code |

**Best Practice**: 
- Use `is_staff` for Django admin panel access
- Use `role` for application-level admin features
- An admin user should ideally have both `role="admin"` and optionally `is_staff=True`

## Migration Steps

To apply the role field to your database:

```bash
# Navigate to backend directory
cd backend

# Create migration (already done - file exists)
# python manage.py makemigrations accounts

# Apply migration
python manage.py migrate accounts
```

**Note**: After migration, all existing users will have `role="user"` by default. You'll need to manually set admin roles for existing admin users.

## Security Notes

1. **Role Changes**: Only admins can change user roles via the API
2. **Self-Promotion**: Users cannot promote themselves to admin
3. **Default Role**: New users always start as `role="user"`
4. **Superuser Override**: Django superusers have all permissions regardless of `role` field

## Summary

- ✅ Role field added to User model (`role` with choices: "user", "admin")
- ✅ Default role is "user" for all new users
- ✅ Only admins can change roles via API
- ✅ Permission classes available for role-based access control
- ✅ Frontend types updated to include role
- ✅ Profile page displays role information

