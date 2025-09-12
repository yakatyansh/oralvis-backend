# OralVis Healthcare - Backend

This is the backend for the OralVis Healthcare MERN application. It provides a RESTful API for user authentication, patient submissions, and admin review processes.

## Features

-   **JWT Authentication**: Secure endpoints for user registration and login.
-   **Role-Based Access Control**: Differentiates between `patient` and `admin` users.
-   **Multi-Image Uploads**: Patients can upload multiple images in a single submission.
-   **Admin Annotation**: Admins can save annotations and notes for submissions.
-   **PDF Report Generation**: Dynamically creates PDF reports with patient details and images.

## Tech Stack

-   **Node.js**
-   **Express.js**
-   **MongoDB** with **Mongoose**
-   **JSON Web Tokens (JWT)** for authentication
-   **Multer** for file handling
-   **PDFKit** for PDF generation

---

## Setup and Installation

1.  **Clone the repository**:
    ```bash
    git clone <your-repo-url>
    cd oralvis-backend
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Create an environment file**:
    Create a `.env` file in the root directory and add the following variables:
    ```env
    NODE_ENV=development
    PORT=5001
    MONGODB_URI=<your_mongodb_connection_string>
    JWT_SECRET=<your_jwt_secret_key>
    JWT_EXPIRES_IN=7d
    CLIENT_URL=http://localhost:3000
    ```

4.  **Create the uploads folder**:
    The application saves files locally. Create the `uploads` directory in the root.
    ```bash
    mkdir uploads
    ```

---

## Running the Application

To start the server in development mode (with hot-reloading), run:

```bash
npm run dev