[← Back to Overview](../README.md)

# Getting Started

This guide will help you set up the Sage development environment on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Python** (v3.9 or higher)
- **Supabase CLI** (optional, but recommended for local database management)

---

## 1. Backend Setup (Supabase)

Sage uses Supabase for authentication and database services.

1.  **Create a Supabase Project**: Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Get Your Credentials**: From your project settings, obtain your `Project URL` and `Anon Key`.
3.  **Environment Variables**: Create a `.env.local` file in the `web/` directory using the `.env.example` as a template.
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```
4.  **Database Migrations**: Run the migrations located in the `supabase/migrations/` directory to set up the necessary tables and RLS policies.

---

## 2. AI Engine Setup

The local AI engine handles basic intent and entity extraction.

1.  **Navigate to the AI directory**:
    ```bash
    cd ai
    ```
2.  **Create a Virtual Environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Train and Export the Model**:
    ```bash
    python train_intent.py   # Trains the BERT-Tiny model
    python export_onnx.py    # Exports the model to ONNX format for the web
    ```

---

## 3. Web Application Setup

The Next.js frontend provides the main user interface.

1.  **Navigate to the Web directory**:
    ```bash
    cd web
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
4.  **Access the App**: Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Shared Logic

The `shared/` directory contains TypeScript models and logic used by both the web and (future) mobile applications. Ensure any changes here are reflected across all platforms.
