# QuickServe

QuickServe is a restaurant digital ordering and kitchen management system designed around QR-based table ordering, customer sessions, kitchen order management, takeaway orders, and real-time order updates.
The project is being built as a full-stack application with a React customer interface and a Node.js/Express backend backed by MySQL.

---

## 1. Project Goals

QuickServe is intended to replace manual restaurant ordering workflows with a connected digital system:

```text
Customer scans table QR
        ↓
Table is validated
        ↓
Customer session is created
        ↓
Customer receives a customer JWT
        ↓
Customer browses menu
        ↓
Customer creates / updates order
        ↓
Kitchen receives order
        ↓
Kitchen updates order status
        ↓
Ready order appears on TV display
        ↓
Order is served
        ↓
Customer can view order history
```

The system also supports takeaway ordering, where there is no physical restaurant table associated with the session.

---

# 2. Main Modules

QuickServe is divided into the following major modules.

## Customer

The customer application is responsible for:

- QR/table landing
- Table token validation
- Customer session creation
- Customer authentication
- Menu browsing
- Category filtering
- Ordering food
- Viewing current orders
- Viewing order history
- Takeaway ordering
- Real-time order updates

## Kitchen

The kitchen application is responsible for:

- Viewing active kitchen orders
- Seeing customer/order information
- Identifying Dine-In vs Takeaway orders
- Viewing table number where applicable
- Updating order status
- Receiving real-time order updates

The kitchen interface will be optimized primarily for tablets and touch screens.

## Ready Order Display

The restaurant TV/display interface is intended for:

- Large TV screens
- 1080p displays
- 1440p displays
- 4K displays

It will show only the information required for customers to identify that their order is ready.

Example:

```text
ORDER READY

#1234
TABLE A2
```

or:

```text
ORDER READY

#1235
TAKEAWAY
```

---

# 3. Technology Stack

## Frontend

- React
- Vite
- React Router
- Axios
- CSS
- Socket.io client (for real-time functionality)

## Backend

- Node.js
- Express.js
- MySQL
- JWT authentication
- express-validator
- Socket.io
- Multer for uploads
- QR code generation

## Development Tools

- Visual Studio Code
- MySQL / MySQL Workbench
- Postman
- Git / GitHub
- Browser DevTools

---

# 4. Current Project Structure

```text
QuickServe/
│
├── client/
│   │
│   ├── public/
│   │
│   ├── src/
│   │   │
│   │   ├── api/
│   │   │   ├── auth.api.js
│   │   │   ├── axios.js
│   │   │   ├── menu.api.js
│   │   │   ├── order.api.js
│   │   │   └── table.api.js
│   │   │
│   │   ├── assets/
│   │   │
│   │   ├── pages/
│   │   │   ├── customer/
│   │   │   ├── kitchen/
│   │   │   └── display/
│   │   │
│   │   ├── styles/
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   │
│   ├── src/
│   │   │
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── env.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── customer.middleware.js
│   │   │   ├── errorHandler.js
│   │   │   ├── notFound.js
│   │   │   ├── upload.js
│   │   │   └── validate.js
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── categories/
│   │   │   ├── customers/
│   │   │   ├── kitchen/
│   │   │   ├── menu/
│   │   │   ├── orders/
│   │   │   └── tables/
│   │   │
│   │   ├── routes/
│   │   │
│   │   ├── sockets/
│   │   │   └── socket.js
│   │   │
│   │   └── utils/
│   │
│   ├── uploads/
│   │   └── qr/
│   │
│   ├── .env
│   ├── server.js
│   └── package.json
│
├── socket-test.html
└── readme.md
```

---

# 5. Restaurant Table / QR System

Each restaurant table has a unique table token.

A typical customer flow is:

```text
QR Code
   ↓
Table Token
   ↓
GET / table information
   ↓
Validate table
   ↓
Create customer/session
   ↓
Customer JWT
```

The project contains QR assets under:

```text
server/uploads/qr/
```

Example table QR files include:

```text
table-A1.png
table-B1.png
table-C1.png
table-D1.png
```

The exact table token should never be hardcoded into the React UI.

The customer interface should obtain the token from the QR URL and use the backend table validation flow.

---

# 6. Customer Authentication

Customer authentication is separate from the normal restaurant/admin authentication.

The customer middleware verifies a JWT using:

```text
CUSTOMER_JWT_SECRET
```

The decoded customer object contains information such as:

```js
{
    customerId,
    sessionId,
    tableId,
    iat,
    exp
}
```

The customer session is therefore tied to the authenticated session.

This is important because an order must not be accessible simply by knowing its numeric ID.

---

# 7. Session Management

QuickServe uses `table_sessions` to represent a customer's restaurant session.

A session contains information such as:

- customer
- table
- session type
- session token
- active/inactive state

Supported session types include:

```text
DineIn
Takeaway
```

## Dine-In

A Dine-In session is associated with a restaurant table.

Example:

```text
Table A2
   ↓
Customer Session
   ↓
DineIn
```

## Takeaway

A takeaway session does not represent a physical dining table.

Example:

```text
Customer
   ↓
Takeaway Session
   ↓
Takeaway Order
```

The database design must therefore allow takeaway sessions to exist without requiring a physical table.

---

# 8. Order System

Orders belong to customer sessions.

An order contains information such as:

- order ID
- order number
- session ID
- order type
- order mode
- status
- total
- notes
- estimated ready time
- timestamps

Example:

```json
{
    "id": 5,
    "order_number": "QS-27411643-613",
    "session_id": 5,
    "order_type": "New",
    "order_mode": "DineIn",
    "status": "Pending",
    "total": "349.00"
}
```

---

# 9. Order Type

QuickServe distinguishes between:

```text
New
Additional
```

## New

The first order created for a session.

## Additional

An additional order created after the session already contains an order.

Example:

```text
Customer opens Table A2
        ↓
Order #1
        ↓
Customer adds more food
        ↓
Order #2 / Additional
```

The order service also supports adding additional quantities of an existing menu item to a pending order.

---

# 10. Order Mode

The system distinguishes how an order is fulfilled.

Current modes include:

```text
DineIn
Takeaway
```

Kitchen and display interfaces should always use `order_mode` to determine how the order should be presented.

Example:

```text
DineIn
TABLE A2
```

versus:

```text
Takeaway
TAKEAWAY
```

---

# 11. Order Status Lifecycle

The intended order lifecycle is:

```text
Pending
   ↓
Preparing
   ↓
Ready
   ↓
Served
```

The kitchen interface will eventually provide clear controls for moving an order through this lifecycle.

The customer application can use the status to show progress.

The Ready Order TV will primarily display:

```text
Ready
```

orders.

---

# 12. Kitchen System

The backend contains a dedicated kitchen module:

```text
server/src/modules/kitchen/
```

This module includes:

```text
kitchen.controller.js
kitchen.routes.js
kitchen.service.js
```

The kitchen API returns order information including:

- order ID
- order number
- session ID
- order type
- order status
- total
- notes
- estimated ready time
- customer information
- table information
- order items

Example kitchen order:

```json
{
    "id": 4,
    "order_number": "QS-96791499-685",
    "session_id": 1,
    "order_type": "Additional",
    "status": "Pending",
    "total": "698.00",
    "customer_name": "Session Test",
    "customer_mobile": "9876543214",
    "table_number": "A1"
}
```

---

# 13. Kitchen UI Requirements

The kitchen UI will be designed specifically for restaurant staff.

Primary targets:

```text
8" tablet
10" tablet
11" tablet
12" tablet
13" tablet
```

The UI should prioritize:

- large touch targets
- fast scanning
- clear status colors
- minimal text
- minimal navigation
- readable order numbers
- large table/takeaway labels
- fast status actions
- low cognitive load

The kitchen should not look like a normal admin dashboard.

It should behave like a dedicated kitchen display system.

---

# 14. Ready Order TV

The ready order display is a separate interface from the kitchen.

Target resolutions:

```text
1920 × 1080
2560 × 1440
3840 × 2160
```

The TV should prioritize visibility from a distance.

The interface should use:

- very large order numbers
- large table/takeaway labels
- high contrast
- limited information
- clear ready-state animation
- automatic updates
- automatic removal after the order is no longer ready

Example:

```text
┌──────────────────────────────┐
│        ORDER READY            │
│                              │
│            #1234             │
│                              │
│           TABLE A2           │
│                              │
└──────────────────────────────┘
```

---

# 15. Real-Time Communication

QuickServe contains a Socket.io implementation:

```text
server/src/sockets/socket.js
```

A socket test page is also present:

```text
socket-test.html
```

The system uses Socket.io to support real-time events.

The intended real-time flow is:

```text
Customer creates order
        ↓
Backend
        ↓
Socket event
        ↓
Kitchen
        ↓
Kitchen changes status
        ↓
Backend
        ↓
Socket event
        ↓
Customer / Ready TV
```

This avoids requiring staff to manually refresh the kitchen screen.

---

# 16. Menu System

The menu module is located at:

```text
server/src/modules/menu/
```

It supports menu management and validation.

The customer menu interface supports:

- menu item listing
- category filtering
- price
- availability
- description
- food type
- ordering

Menu API access is handled on the client through:

```text
client/src/api/menu.api.js
```

---

# 17. Category System

Categories are managed separately from menu items.

Backend:

```text
server/src/modules/categories/
```

This allows the customer interface to present categories such as:

```text
All
Breakfast
Lunch
Dinner
Drinks
Desserts
```

The actual categories should come from the database rather than being hardcoded.

---

# 18. API Architecture

The backend follows a modular structure.

```text
Module
 ├── controller
 ├── service
 ├── routes
 └── validation
```

For example:

```text
orders/
├── order.controller.js
├── order.routes.js
├── order.service.js
└── order.validation.js
```

This keeps:

- HTTP handling
- business logic
- routing
- validation

separated.

---

# 19. Error Handling

The backend contains centralized error handling:

```text
server/src/middleware/errorHandler.js
```

Custom application errors are represented by:

```text
server/src/utils/AppError.js
```

Validation is handled through:

```text
server/src/middleware/validate.js
```

This allows API errors to be returned consistently.

Example:

```json
{
    "success": false,
    "message": "Order not found"
}
```

---

# 20. Authentication Architecture

QuickServe currently has separate authentication concerns.

## Restaurant / Admin Authentication

Located under:

```text
server/src/modules/auth/
```

## Customer Authentication

Located under:

```text
server/src/middleware/customer.middleware.js
```

Customer requests use a Bearer token:

```text
Authorization: Bearer <customer-jwt>
```

---

# 21. Frontend Architecture

The React frontend is divided into API and page layers.

```text
src/
├── api/
├── pages/
├── styles/
├── assets/
├── App.jsx
└── main.jsx
```

API modules should contain HTTP communication.

Pages should contain UI and page-level state.

Reusable UI components should be introduced as the application grows.

---

# 22. Responsive Design Strategy

QuickServe has three major user-facing environments.

## Customer

```text
Mobile
Tablet
Desktop
```

## Kitchen

```text
Tablet
Small desktop
```

## Ready TV

```text
1080p
1440p
4K
```

Responsive breakpoints should not simply stretch the mobile UI.

Each environment has different usability requirements.

### Customer

Touch-first.

### Kitchen

Speed-first.

### TV

Distance-readability-first.

---

# 23. Planned Design System

QuickServe's planned brand palette is:

| Role | Color |
|---|---|
| Background | `#20222F` |
| Primary | `#FF6B35` |
| Secondary | `#49E3FF` |
| Accent | `#FFFFFF` |

Semantic colors:

```text
Success  → Green
Warning  → Amber
Danger   → Red
Info     → Blue
```

The UI should use semantic colors consistently instead of assigning random colors to individual components.

---

# 24. Environment Configuration

The server uses environment variables.

Typical configuration includes:

```env
PORT=
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

JWT_SECRET=
CUSTOMER_JWT_SECRET=
```

Never commit production secrets to Git.

The `.env` file should remain local.

For deployment, use the hosting provider's environment variable system.

---

# 25. Development Setup

## Server

Navigate to:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

Start the server using the configured development command from `package.json`.

The backend currently runs on:

```text
http://localhost:5000
```

---

## Client

Navigate to:

```bash
cd client
```

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

The development frontend commonly runs on:

```text
http://localhost:5173
```

---

# 26. Database

QuickServe uses MySQL.

Important database areas include:

```text
restaurants / shop data
restaurant_tables
table_sessions
customers
menu_items
categories
orders
order_items
```

The exact schema should remain synchronized with the service queries.

Important relationships include:

```text
restaurant_table
      ↓
table_session
      ↓
customer
      ↓
orders
      ↓
order_items
      ↓
menu_items
```

---

# 27. Security Rules

Important security rules:

### Customer

A customer should only be able to access resources belonging to their active session.

### Orders

An order ID alone must not be sufficient to retrieve another customer's order.

Order queries should verify:

```text
order_id
+
session_id
```

### Table

Table tokens should be validated by the backend.

### JWT

Customer JWTs should:

- be signed using `CUSTOMER_JWT_SECRET`
- have an expiry
- be sent using the Authorization Bearer scheme
- never be exposed in URLs

---

# 28. Testing

Testing is currently performed using:

- Browser DevTools
- Postman
- Socket test page
- React development server
- MySQL Workbench

Important test scenarios:

### Table

```text
Valid table token
Invalid table token
Expired/invalid session
```

### Customer

```text
Create session
Customer authentication
Menu loading
Create order
Additional order
Order history
```

### Takeaway

```text
Create takeaway session
Create takeaway order
Kitchen takeaway display
```

### Kitchen

```text
Pending
Preparing
Ready
Served
```

### Socket

```text
Customer → Kitchen
Kitchen → Customer
Kitchen → Ready TV
```

---

# 29. Current Development Status

The following areas have already been tested during development:

- Table token flow
- Customer session creation
- Customer JWT authentication
- Menu API
- Order creation
- Additional orders
- Order history
- Session-based order access
- Takeaway session development
- Kitchen order API
- Socket connection
- Socket room/session concepts
- Order mode support

The project is now moving toward a production-quality frontend experience.

---

# 30. Next Development Phase

The next major phase is UI/UX.

## Step 1

Create the shared QuickServe design system.

## Step 2

Build the Kitchen Tablet UI.

## Step 3

Connect the Kitchen UI to the existing kitchen API.

## Step 4

Add live Socket.io updates.

## Step 5

Build the Ready Order TV UI.

## Step 6

Connect Ready TV to live order events.

## Step 7

Add responsive behavior.

## Step 8

Test:

```text
Mobile
Tablet
Desktop
1080p TV
4K TV
```

---

# 31. Planned Kitchen UI

The kitchen interface will use an order-card layout similar to:

```text
┌────────────────────────────────────────┐
│ #QS-1234                DINE-IN        │
│ TABLE A2                               │
│                                        │
│ 2 × Farmhouse Sandwich                │
│ 1 × Cold Coffee                       │
│                                        │
│ ₹848                                   │
│                                        │
│              [ START PREPARING ]       │
└────────────────────────────────────────┘
```

The card should allow staff to understand the order in less than a few seconds.

---

# 32. Planned Ready TV UI

The Ready TV should show:

```text
ORDER READY

#QS-1234

TABLE A2
```

For takeaway:

```text
ORDER READY

#QS-1235

TAKEAWAY
```

The display should not expose unnecessary customer information.

---

# 33. Design Principles

QuickServe UI should follow these principles:

1. Mobile-first for customers.
2. Touch-first for kitchen.
3. Distance-first for TV.
4. Large and readable typography.
5. High contrast.
6. Minimal unnecessary navigation.
7. Consistent status colors.
8. Clear primary actions.
9. Fast visual scanning.
10. Real-time information without manual refresh.
11. Responsive layouts instead of fixed-size screens.
12. Consistent spacing and component sizing.

---

# 34. Important Development Rule

QuickServe should be developed incrementally.

For major UI changes:

```text
1. Change one module
2. Run the application
3. Test the module
4. Fix errors
5. Continue to the next module
```

Avoid changing the entire frontend and backend simultaneously.

This makes debugging significantly easier.

---

# 35. Current Priority

The immediate priority is:

```text
             QUICKSERVE
                 │
       ┌─────────┴─────────┐
       │                   │
   CUSTOMER             RESTAURANT
       │                   │
       │             ┌─────┴─────┐
       │             │           │
    Mobile         Kitchen      TV
                   Tablet      Display
```

The next implementation phase is therefore the **Kitchen Tablet UI**, followed by the **Ready Order TV UI**.

---

## License

This project is currently a private development project.

License and production deployment terms can be added when the project is ready for release.
