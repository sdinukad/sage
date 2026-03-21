[← Back to Overview](../README.md)

# System Architecture

Sage is built with a distributed architecture that balances local performance with cloud-based intelligence.

## High-Level Diagram

```mermaid
graph TD
    User([User])
    Web[Next.js Web App]
    LocalAI[Local BERT-Tiny ONNX]
    Supabase[Supabase Backend]
    
    User <--> Web
    Web <--> LocalAI
    Web <--> Supabase
    
    subgraph "Local Execution"
        Web
        LocalAI
    end
    
    subgraph "Cloud Services"
        Supabase
    end
```

## Component Overview

### 1. Web Application (`web/`)
The frontend is built with **Next.js** and **Tailwind CSS**. It serves as the primary interface for users to interact with the AI assistant. It handles:
- **Chat Interface**: A conversation-centric UI for adding and viewing expenses.
- **Local AI Integration**: Runs the ONNX model for real-time intent and entity extraction.
- **State Management**: Manages application state and synchronization with Supabase.

### 2. Local AI Engine (`ai/`)
This component is responsible for the performance-critical path of natural language processing.
- **Model**: A fine-tuned **BERT-Tiny** model.
- **Functionality**: Identifies if a user's message is an expense entry and extracts the `amount`, `category`, and `date`.
- **Deployment**: The model is trained in Python, exported to **ONNX**, and run in the browser for zero-latency processing.

### 3. Shared Logic (`shared/`)
A collection of TypeScript models and utility functions shared between frontend and (future) backend or mobile environments.
- **Data Models**: Common definitions for `Expense`, `User`, and `Category`.

### 4. Backend (Supabase)
Cloud-based infrastructure for data storage and security.
- **Database**: PostgreSQL with Row-Level Security (RLS) policies.
- **Authentication**: User management and secure access.
- **Storage**: (Future) Storage for receipts and user-uploaded media.

## Data Flow

1.  **Input**: User types a message (e.g., "Paid 2000 for dinner").
2.  **Processing (Local)**: The Web App runs the message through the local BERT model to determine intent and extract features.
3.  **Persistence**: The resulting expense data is saved to **Supabase**.
4.  **Feedback**: The user gets an immediate confirmation in the chat interface.
