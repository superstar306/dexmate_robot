# Senior Full-Stack Engineer

## Overview
Build a simplified robot management system that allows users and groups to manage robots with different permission levels and personalized settings.

**Goal:** Demonstrate full-stack development skills, including database design, API development, and UI implementation.
* * *
## Core Requirements
### 1\. Data Models
Implement the following entities with appropriate relationships:

*   **User**
    *   Basic info (name, email, password)
    *   Can belong to multiple groups
    *   Can own robots personally
*   **Group**
    *   Group name
    *   Members with roles (Admin or Member)
*   **Robot**
    *   Serial Number (S/N) - unique identifier
    *   Name/model
    *   Owned by either a User or a Group
*   **Robot Permission**
    *   Links User to Robot
    *   Permission type: "usage" or "admin"
*   **Robot Settings**
    *   User-specific configurations for robots
    *   Settings stored as JSON (e.g., theme, language, custom parameters)

### 2\. Backend Requirements
Build a RESTful API with the following endpoints:
#### User Management
*   Register/login (authentication required)
*   Get the current user profile

#### Group Management
*   Create a group
*   Add/remove members to/from group
*   Assign roles (Admin/Member) to group members

#### Robot Management
*   Create a robot with S/N (assign to user or group)
*   List all robots accessible to the current user
*   Get robot details by S/N
*   Assign group-owned robot to a group member (group admin only)
*   Grant/revoke robot permissions to users

#### Settings Management
*   Save user's robot settings for a specific robot S/N
*   Load user's robot settings for a specific robot S/N
*   List all setting profiles for current user

### 3\. Frontend Requirements
Build a simple web interface with the following pages:
#### Authentication
*   Login/Register page
#### Dashboard
*   List all robots the user has access to
*   Show robot S/N, name, and ownership (personal vs group-owned)
*   Display user's permission level for each robot
#### Robot Detail Page
*   View robot information (S/N, name, owner)
*   Load/Save user's personal settings for this robot
*   If user has admin permission: assign robot to other users and manage permissions
#### Group Management Page (for group admins)
*   View group members
*   Assign group-owned robots to members
*   Manage member permissions
* * *
## Technical Requirements
### Backend
*   Use any framework (Node.js/Express, Python/Flask/Django, Java/Spring, etc.)
*   Implement JWT or session-based authentication
*   Use a relational database (PostgreSQL, MySQL, or SQLite)
*   Include basic input validation and error handling
*   Ensure robot S/N is unique across the syste
### Frontend
*   Use any modern framework (React, Vue, Angular, or vanilla JS)
*   Responsive design (mobile-friendly)
*   Clean, intuitive UI/UX
*   Handle authentication state

**It's perfectly fine to use free trial versions of SaaS platforms; no need to implement everything by yourself. Feel free to use any AI tools to write the code.**
### Bonus Points (Optional)
*   Docker setup for easy deployment
*   Basic unit tests for critical endpoints
*   Proper error messages and loading states in UI
* * *

## User Flows to Implement
### Flow 1: Personal Robot Owner
1. User registers and logs in
2. User creates a robot with S/N (owned by user)
3. User saves custom settings for the robot
4. User logs out and back in, settings are retrieved
### Flow 2: Group Robot Management
1. User creates a group (becomes admin)
2. Admin adds another user as a member
3. Admin creates a robot with S/N owned by the group
4. Admin assigns robot to the member (grants usage permission)
5. Member logs in and sees the assigned robot with its S/N
6. Member saves their own settings for this robot
### Flow 3: Permission Management
1. Admin grants "admin" permission to a member for a specific robot
2. That member can now manage permissions for that robot
3. Member grants "usage" permission to another member
* * *

## Deliverables
1. **Source Code**
    *   Frontend and backend code in a Git repository
    *   README with setup instructions
    *   Include .env.example for environment variables
2. **Demo Website**
    *   Deploy the application to a publicly accessible URL (Vercel, Heroku, Railway, etc.)
    *   Include seed data with **two demo accounts**:
        *   **Admin User**: Email and password for a user with group admin role
        *   **Regular User**: Email and password for a non-admin group member
    *   Provide the demo URL and login credentials in your README
3. **Brief Write-up**
    *   Technology choices and why
    *   Trade-offs and design decisions
* * *