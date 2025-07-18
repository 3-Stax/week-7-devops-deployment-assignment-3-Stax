# MERN Stack Chat Application - DevOps Deployment Assignment

This repository contains a real-time chat application built with the MERN (MongoDB, Express.js, React, Node.js) stack, demonstrating key DevOps principles including deployment to cloud platforms and initial CI/CD setup.

## Live Application Links

* **Frontend (Vercel):** [https://week-7-devops-deployment-assignment-nu.vercel.app](https://week-7-devops-deployment-assignment-nu.vercel.app)
* **Backend (Railway):** [https://week-7-devops-deployment-assignment-3-stax-production.up.railway.app](https://week-7-devops-deployment-assignment-3-stax-production.up.railway.app)

## Application Overview

This is a simple chat application that allows users to join specific rooms and exchange messages in real-time. It leverages Socket.IO for bidirectional communication between the client and the server.

**Features:**
* User authentication (basic, via username).
* Room-based chat for private conversations.
* Real-time message exchange using WebSockets.

## Deployment Strategy

The application is deployed using a two-platform approach for frontend and backend separation:

1.  **Frontend Deployment (React App) - Vercel:**
    * The React client application is hosted on Vercel, a platform optimized for frontend deployments.
    * Vercel is configured to automatically build and deploy the `client` directory of this repository whenever changes are pushed to the `main` branch.
    * **Crucial Setup:** To ensure the frontend correctly connects to the backend, a `VITE_REACT_APP_SOCKET_URL` environment variable was configured on Vercel, pointing to the live Railway backend URL. This variable is correctly picked up at build time by Vite.

2.  **Backend Deployment (Node.js/Express App) - Railway:**
    * The Node.js/Express server is hosted on Railway, a platform designed for full-stack applications and services.
    * Railway is integrated directly with this GitHub repository, automatically deploying changes from the `main` branch of the `server` directory.
    * **CORS Configuration:** The backend is configured with a broad CORS policy (`Access-Control-Allow-Origin: "*"`) to allow connections from the Vercel frontend.

## Overcoming Deployment Challenges (A Brief Journey Log)

The deployment process involved several key debugging steps:

* **Frontend Connectivity Issues (`URL NOT SET` / CORS Errors):** Initially, the Vercel frontend struggled to connect to the backend, showing "URL NOT SET" or CORS errors. The primary cause was incorrect environment variable naming (missing the `VITE_` prefix required by Vite for client-side variables) and potential misconfigurations in Vercel's build process.
* **Solution:** By renaming the environment variable to `VITE_REACT_APP_SOCKET_URL` and ensuring it was correctly passed during the Vercel build, the frontend successfully established a connection with the Railway backend. Debugging confirmed the correct URL was being used and "Socket Connected!" was logged.

## CI/CD Pipeline (Initial Setup)

* **GitHub Actions:** An initial CI/CD pipeline was set up using GitHub Actions to automate testing and deployment steps.
* **Frontend Workflow (`.github/workflows/client-ci-cd.yml`):** This workflow is configured to build and deploy the React frontend to Vercel upon pushes to the `main` branch within the `client` directory.
* **Backend Workflow (`.github/workflows/server-ci.yml`):** This workflow runs continuous integration checks (like dependency installation and linting/testing) for the Node.js backend upon pushes to the `main` branch within the `server` directory. (Note: Railway handles the automatic deployment of the backend directly from the GitHub repository).

## Getting Started Locally

To run this project locally:

**1. Clone the repository:**
   ```bash
   git clone [https://github.com/3-Stax/week-7-devops-deployment-assignment-3-Stax.git](https://github.com/3-Stax/week-7-devops-deployment-assignment-3-Stax.git)
   cd week-7-devops-deployment-assignment-3-Stax
2. Setup Backend (Server):

Bash

cd server
npm install
# Create a .env file with your MongoDB URI (e.g., MONGO_URI="your_mongodb_connection_string")
# Note: For local testing, ensure your MongoDB is running or use a cloud service like MongoDB Atlas.
npm start
The backend will typically run on http://localhost:5000.

3. Setup Frontend (Client):

Bash

cd ../client
npm install
# Create a .env file with your backend URL
# VITE_REACT_APP_SOCKET_URL=http://localhost:5000
npm run dev
The frontend will typically run on http://localhost:5173 (or another Vite default port).

Project Structure
.
├── client/              # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── socket/      # Socket.IO client configuration
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── server/              # Node.js/Express backend application
│   ├── models/
│   ├── routes/
│   ├── index.js
│   ├── package.json
│   └── .env.example
├── .github/             # GitHub Actions workflows for CI/CD
│   └── workflows/
│       ├── client-ci-cd.yml
│       └── server-ci.yml
├── README.md
└── package.json (root)