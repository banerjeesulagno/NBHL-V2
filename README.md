# NBHL Member Savings Portal

A secure, clean, and high-performance financial logging and contribution tracking application tailored for **Nijo Bhumi Home Land (NBHL)**.

This project delivers a **dual-architecture system** to maximize flexibility and rapid deployment:
1. **Interactive Frontend Portal (React + Vite + Tailwind CSS)**: A fully functional simulation sandbox that runs immediately in the browser, complete with a virtual database (persisted automatically in browser local storage) to log members, record payments, and approve transactions. It also embeds real production-ready source code files.
2. **Production Backend Application (Python + Flask + SQLite)**: Located in `/python_flask_app`, this is the real-world standard SQL-backed software application with full authentication, SQL models mapping, and templates engines.

---

## 💻 How to Run the Application in VS Code

You can run either the **frontend layout portal (React)** or the **real back-end database portal (Python/Flask)** directly inside VS Code on your local computer.

### Method A: Running the React + Vite Frontend Portal
This runs the interactive visual layout on your local machine instantly.

1. **Install Node.js**: Ensure you have Node.js installed (v18 or higher recommended). Download it from [nodejs.org](https://nodejs.org/).
2. **Open the Project**: Open the main repository folder in Visual Studio Code.
3. **Open a Terminal**: In VS Code, go to **Terminal -> New Terminal** (or press ``Ctrl+``` / ``Cmd+```).
4. **Install Dependencies**: Run the following command to download and install packages:
   ```bash
   npm install
   ```
5. **Start Development Server**: Start the local host dev server:
   ```bash
   npm run dev
   ```
6. **Access App**: Click on the local link printed in the terminal (usually `http://localhost:3000`) or open it in your browser.

---

### Method B: Running the Real Python + Flask Backend Server
This runs the production database application containing live SQLite user authentication and real SQL ledgers.

1. **Install Python**: Ensure you have Python installed (v3.8 or higher recommended). Download from [python.org](https://www.python.org/).
2. **Open Python Terminal**: In VS Code, open a terminal window and navigate into the Flask directory:
   ```bash
   cd python_flask_app
   ```
3. **Set Up virtual environment** (Highly recommended step):
   - **On Windows**:
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **On MacOS/Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
4. **Install Requirements**: Install all critical packages including Flask, Flask-SQLAlchemy, and Flask-Login:
   ```bash
   pip install -r requirements.txt
   ```
5. **Initialize Databases**: Start the python interactive prompt or run the boot loader. Inside the Flask app, SQLite databases will be provisioned automatically on launch.
6. **Start Flask Server**: Start python application runtime:
   ```bash
   python app.py
   ```
7. **Access App**: Navigate to `http://127.0.0.1:5000` in your web browser.

---

## 👥 Sharing with Your Client & Customers (How it Works)

This portal is architected with strict, role-based boundaries so you and your client can manage records securely while enabling customers to only view their details.

### 1. How the Admin Accesses the Portal
* Either you or your client uses the **Admin Console** credentials:
  * **Default Admin Username**: `admin`
  * **Default Password**: `admin123` *(Remember to hash/update this inside your secure configuration or DB during hosting!)*
* **Admin capabilities include**:
  * Enrolling/Registering new depositors and generating unique account codes (e.g., `NBHL-1001`).
  * Creating new saving payment items with unique transaction transaction reference indices.
  * Viewing complete organizational stats: Total Saving Reserve, Pending Cleared Money, member list, and overall logs.
  * Moderating pending member self-reported logs (Approving or Rejecting them).

### 2. How Customers Access and View Only Their Details
* When an Admin registers a customer, they provide the customer with:
  1. Their unique **Account Code** (e.g., `NBHL-1001` or `NBHL-1002`).
  2. The default **Customer PIN**: `123456`
* The customer logs in through the **Member Gateway**.
* **Strict Read-Only Boundary**:
  * Once logged in, customers have a completely customized layout that shows **only** their personal credentials, their accumulated balances, and their status updates.
  * Customers **cannot** access other members' details.
  * Customers **cannot** read the master cooperative logs or make modifications to approval ledgers.
  * They can submit manual savings transaction receipts for Board review (which appear as "Pending" until approved by the Admin).

---

## 🔒 Security & Privacy Notice
* **Google AI branding removed**: All Google AI Studio headers, banners, and browser tags have been completely scrubbed and replaced with official **NBHL Member Savings Portal** labels.
* **Hosting Options**: When you deploy the Flask application, configure SQLite or PostgreSQL in your hosting provider's cloud dashboard. Ensure `app.py` has a unique secret key set inside your production variables.
